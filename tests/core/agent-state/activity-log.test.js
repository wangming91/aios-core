/**
 * ActivityLog Tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ActivityLog, EventType } = require('../../../.aios-core/core/agent-state/activity-log');

describe('ActivityLog', () => {
  let tempDir;
  let activityLog;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'activity-log-test-'));
    activityLog = new ActivityLog(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create instance with project root', () => {
      expect(activityLog.projectRoot).toBe(tempDir);
      expect(activityLog._entries).toEqual([]);
      expect(activityLog._loaded).toBe(false);
    });
  });

  describe('load()', () => {
    it('should load empty entries if file does not exist', async () => {
      await activityLog.load();
      expect(activityLog._entries).toEqual([]);
      expect(activityLog._loaded).toBe(true);
    });

    it('should load existing entries from file', async () => {
      const logFile = path.join(tempDir, '.aios-core/data/activity-log.yaml');
      const dir = path.dirname(logFile);
      fs.mkdirSync(dir, { recursive: true });

      const existingData = {
        version: '1.0',
        entries: [
          { event: 'activate', agentId: 'dev', timestamp: '2026-02-20T10:00:00Z' }
        ]
      };
      const yaml = require('js-yaml');
      fs.writeFileSync(logFile, yaml.dump(existingData));

      await activityLog.load();
      expect(activityLog._entries).toHaveLength(1);
      expect(activityLog._entries[0].agentId).toBe('dev');
    });

    it('should handle malformed file gracefully', async () => {
      const logFile = path.join(tempDir, '.aios-core/data/activity-log.yaml');
      const dir = path.dirname(logFile);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(logFile, 'invalid: yaml: content: [');

      await activityLog.load();
      expect(activityLog._entries).toEqual([]);
    });
  });

  describe('addActivation()', () => {
    it('should add activation entry', async () => {
      const entry = await activityLog.addActivation('dev', { context: { story: 'B1' } });

      expect(entry.event).toBe(EventType.ACTIVATE);
      expect(entry.agentId).toBe('dev');
      expect(entry.timestamp).toBeDefined();
      expect(entry.context.story).toBe('B1');
    });

    it('should include previous agent if provided', async () => {
      const entry = await activityLog.addActivation('qa', {
        previousAgent: 'dev'
      });

      expect(entry.previousAgent).toBe('dev');
    });

    it('should persist to file', async () => {
      await activityLog.addActivation('dev');

      const logFile = path.join(tempDir, '.aios-core/data/activity-log.yaml');
      expect(fs.existsSync(logFile)).toBe(true);

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('activate');
      expect(content).toContain('dev');
    });
  });

  describe('addDeactivation()', () => {
    it('should add deactivation entry', async () => {
      const entry = await activityLog.addDeactivation('dev', {
        reason: 'task_complete'
      });

      expect(entry.event).toBe(EventType.DEACTIVATE);
      expect(entry.agentId).toBe('dev');
      expect(entry.reason).toBe('task_complete');
    });
  });

  describe('addHandoff()', () => {
    it('should add handoff entry', async () => {
      const entry = await activityLog.addHandoff('pm', 'dev', {
        reason: 'task_delegation'
      });

      expect(entry.event).toBe(EventType.HANDOFF);
      expect(entry.agentId).toBe('pm');
      expect(entry.targetAgent).toBe('dev');
      expect(entry.reason).toBe('task_delegation');
    });
  });

  describe('getEntries()', () => {
    beforeEach(async () => {
      await activityLog.addActivation('pm', {});
      await activityLog.addHandoff('pm', 'dev', {});
      await activityLog.addActivation('dev', { previousAgent: 'pm' });
      await activityLog.addDeactivation('dev', {});
    });

    it('should return all entries', async () => {
      const entries = await activityLog.getEntries();
      expect(entries).toHaveLength(4);
    });

    it('should filter by agentId', async () => {
      const entries = await activityLog.getEntries({ agentId: 'dev' });
      expect(entries).toHaveLength(3); // handoff to dev, activation, deactivation
    });

    it('should filter by eventType', async () => {
      const entries = await activityLog.getEntries({ eventType: EventType.HANDOFF });
      expect(entries).toHaveLength(1);
      expect(entries[0].event).toBe(EventType.HANDOFF);
    });

    it('should limit results', async () => {
      const entries = await activityLog.getEntries({ limit: 2 });
      expect(entries).toHaveLength(2);
    });

    it('should filter by since date', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const entries = await activityLog.getEntries({ since: futureDate });
      expect(entries).toHaveLength(0);
    });
  });

  describe('getStats()', () => {
    beforeEach(async () => {
      await activityLog.addActivation('pm', {});
      await activityLog.addHandoff('pm', 'dev', {});
      await activityLog.addActivation('dev', { previousAgent: 'pm' });
      await activityLog.addHandoff('dev', 'qa', {});
      await activityLog.addActivation('qa', { previousAgent: 'dev' });
    });

    it('should return correct stats', async () => {
      const stats = await activityLog.getStats();

      expect(stats.totalEntries).toBe(5);
      expect(stats.byEventType[EventType.ACTIVATE]).toBe(3);
      expect(stats.byEventType[EventType.HANDOFF]).toBe(2);
      expect(stats.handoffs.total).toBe(2);
    });

    it('should count handoff pairs', async () => {
      const stats = await activityLog.getStats();

      expect(stats.handoffs.pairs['pm->dev']).toBe(1);
      expect(stats.handoffs.pairs['dev->qa']).toBe(1);
    });

    it('should track agent handoffs', async () => {
      const stats = await activityLog.getStats();

      expect(stats.byAgent['pm'].handoffsFrom).toBe(1);
      expect(stats.byAgent['dev'].handoffsTo).toBe(1);
      expect(stats.byAgent['dev'].handoffsFrom).toBe(1);
      expect(stats.byAgent['qa'].handoffsTo).toBe(1);
    });
  });

  describe('clear()', () => {
    it('should clear all entries', async () => {
      await activityLog.addActivation('dev', {});
      await activityLog.addActivation('qa', {});

      await activityLog.clear();
      const entries = await activityLog.getEntries();

      expect(entries).toHaveLength(0);
    });
  });

  describe('getRecent()', () => {
    beforeEach(async () => {
      for (let i = 0; i < 15; i++) {
        await activityLog.addActivation(`agent${i}`, {});
      }
    });

    it('should return last N entries', async () => {
      const entries = await activityLog.getRecent(5);
      expect(entries).toHaveLength(5);
      expect(entries[4].agentId).toBe('agent14');
    });

    it('should default to 10 entries', async () => {
      const entries = await activityLog.getRecent();
      expect(entries).toHaveLength(10);
    });
  });
});

describe('EventType', () => {
  it('should define all event types', () => {
    expect(EventType.ACTIVATE).toBe('activate');
    expect(EventType.DEACTIVATE).toBe('deactivate');
    expect(EventType.HANDOFF).toBe('handoff');
    expect(EventType.COLLABORATION).toBe('collaboration');
  });
});
