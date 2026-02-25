/**
 * Tests for Elicitation Session Manager
 *
 * Tests session persistence and management.
 */

'use strict';

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const ElicitationSessionManager = require('../../../.aios-core/core/elicitation/session-manager');

describe('ElicitationSessionManager', () => {
  let tempDir;
  let manager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'session-test-'));
    manager = new ElicitationSessionManager(tempDir);
    await manager.init();
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('constructor', () => {
    it('should resolve session directory path', () => {
      expect(manager.sessionDir).toBe(path.resolve(tempDir));
    });

    it('should start with no active session', () => {
      expect(manager.activeSession).toBeNull();
    });
  });

  describe('init', () => {
    it('should create session directory', async () => {
      const newDir = path.join(tempDir, 'new-sessions');
      const newManager = new ElicitationSessionManager(newDir);
      await newManager.init();
      expect(await fs.pathExists(newDir)).toBe(true);
    });
  });

  describe('createSession', () => {
    it('should create session with ID', async () => {
      const sessionId = await manager.createSession('agent');
      expect(sessionId).toBeDefined();
      expect(sessionId.length).toBe(16);
    });

    it('should set active session', async () => {
      await manager.createSession('task');
      expect(manager.activeSession).not.toBeNull();
      expect(manager.activeSession.type).toBe('task');
    });

    it('should include metadata', async () => {
      await manager.createSession('workflow', { project: 'test' });
      expect(manager.activeSession.metadata.project).toBe('test');
    });

    it('should save session to file', async () => {
      const sessionId = await manager.createSession('agent');
      const sessionPath = path.join(tempDir, `${sessionId}.json`);
      expect(await fs.pathExists(sessionPath)).toBe(true);
    });
  });

  describe('saveSession', () => {
    it('should save active session', async () => {
      await manager.createSession('agent');
      await manager.saveSession();
      const files = await fs.readdir(tempDir);
      expect(files.filter(f => f.endsWith('.json')).length).toBe(1);
    });

    it('should throw if no active session', async () => {
      await expect(manager.saveSession()).rejects.toThrow();
    });

    it('should update timestamp', async () => {
      await manager.createSession('agent');
      const originalUpdated = manager.activeSession.updated;
      await new Promise(r => setTimeout(r, 10));
      await manager.saveSession();
      expect(manager.activeSession.updated).not.toBe(originalUpdated);
    });
  });

  describe('loadSession', () => {
    it('should load existing session', async () => {
      const sessionId = await manager.createSession('agent');
      manager.activeSession = null;
      const session = await manager.loadSession(sessionId);
      expect(session.id).toBe(sessionId);
      expect(session.type).toBe('agent');
    });

    it('should set as active session', async () => {
      const sessionId = await manager.createSession('agent');
      manager.activeSession = null;
      await manager.loadSession(sessionId);
      expect(manager.activeSession.id).toBe(sessionId);
    });

    it('should throw if session not found', async () => {
      await expect(manager.loadSession('nonexistent12345678')).rejects.toThrow();
    });
  });

  describe('updateAnswers', () => {
    it('should merge answers', async () => {
      await manager.createSession('agent');
      await manager.updateAnswers({ name: 'Test', version: '1.0' });
      expect(manager.activeSession.answers.name).toBe('Test');
      expect(manager.activeSession.answers.version).toBe('1.0');
    });

    it('should update step index', async () => {
      await manager.createSession('agent');
      await manager.updateAnswers({ name: 'Test' }, 2);
      expect(manager.activeSession.currentStep).toBe(2);
    });

    it('should throw if no active session', async () => {
      await expect(manager.updateAnswers({ name: 'Test' })).rejects.toThrow();
    });
  });

  describe('listSessions', () => {
    it('should return empty array if no sessions', async () => {
      const sessions = await manager.listSessions();
      expect(sessions).toEqual([]);
    });

    it('should list created sessions', async () => {
      await manager.createSession('agent');
      await manager.createSession('task');
      const sessions = await manager.listSessions();
      expect(sessions.length).toBe(2);
    });

    it('should filter by type', async () => {
      await manager.createSession('agent');
      await manager.createSession('task');
      const sessions = await manager.listSessions({ type: 'agent' });
      expect(sessions.length).toBe(1);
      expect(sessions[0].type).toBe('agent');
    });

    it('should filter by status', async () => {
      await manager.createSession('agent');
      manager.activeSession.status = 'completed';
      await manager.saveSession();
      const sessions = await manager.listSessions({ status: 'completed' });
      expect(sessions.length).toBe(1);
    });

    it('should sort by updated date', async () => {
      const id1 = await manager.createSession('agent');
      await new Promise(r => setTimeout(r, 10));
      const id2 = await manager.createSession('agent');
      const sessions = await manager.listSessions();
      expect(sessions[0].id).toBe(id2);
      expect(sessions[1].id).toBe(id1);
    });
  });

  describe('resumeSession', () => {
    it('should return resume info', async () => {
      const sessionId = await manager.createSession('agent');
      manager.activeSession.totalSteps = 5;
      manager.activeSession.currentStep = 2;
      await manager.saveSession();

      const resumeInfo = await manager.resumeSession(sessionId);
      expect(resumeInfo.resumeFrom).toBe(2);
      expect(resumeInfo.remainingSteps).toBe(3);
      expect(resumeInfo.percentComplete).toBe(40);
    });
  });

  describe('completeSession', () => {
    it('should mark session as completed', async () => {
      await manager.createSession('agent');
      await manager.completeSession('success');
      expect(manager.activeSession).toBeNull();
    });

    it('should move successful session to completed dir', async () => {
      const sessionId = await manager.createSession('agent');
      await manager.completeSession('success');
      const completedDir = path.join(tempDir, 'completed');
      const completedPath = path.join(completedDir, `${sessionId}.json`);
      expect(await fs.pathExists(completedPath)).toBe(true);
    });

    it('should throw if no active session', async () => {
      await expect(manager.completeSession()).rejects.toThrow();
    });
  });

  describe('deleteSession', () => {
    it('should delete active session', async () => {
      const sessionId = await manager.createSession('agent');
      await manager.deleteSession(sessionId);
      const files = await fs.readdir(tempDir);
      expect(files.filter(f => f === `${sessionId}.json`).length).toBe(0);
    });

    it('should throw if session not found', async () => {
      await expect(manager.deleteSession('nonexistent12345678')).rejects.toThrow();
    });

    it('should clear active session if matches', async () => {
      const sessionId = await manager.createSession('agent');
      expect(manager.activeSession).not.toBeNull();
      await manager.deleteSession(sessionId);
      expect(manager.activeSession).toBeNull();
    });
  });

  describe('exportSession', () => {
    it('should export as JSON', async () => {
      const sessionId = await manager.createSession('agent');
      const exported = await manager.exportSession(sessionId, 'json');
      expect(exported).toContain('"type": "agent"');
    });

    it('should export as YAML', async () => {
      const sessionId = await manager.createSession('agent');
      const exported = await manager.exportSession(sessionId, 'yaml');
      expect(exported).toContain('type: agent');
    });

    it('should throw for unsupported format', async () => {
      const sessionId = await manager.createSession('agent');
      await expect(manager.exportSession(sessionId, 'xml')).rejects.toThrow();
    });
  });

  describe('cleanupOldSessions', () => {
    it('should delete old sessions', async () => {
      const sessionId = await manager.createSession('agent');
      // Directly write session with old date (saveSession overwrites updated)
      const oldSession = {
        id: sessionId,
        type: 'agent',
        status: 'completed',
        updated: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        created: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      };
      await fs.writeJson(path.join(tempDir, `${sessionId}.json`), oldSession);
      manager.activeSession = null;

      const deleted = await manager.cleanupOldSessions(30);
      expect(deleted).toBe(1);
    });

    it('should not delete active sessions', async () => {
      const sessionId = await manager.createSession('agent');
      // Directly write session with old date but active status
      const oldSession = {
        id: sessionId,
        type: 'agent',
        status: 'active',
        updated: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        created: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      };
      await fs.writeJson(path.join(tempDir, `${sessionId}.json`), oldSession);

      const deleted = await manager.cleanupOldSessions(30);
      expect(deleted).toBe(0);
    });
  });

  describe('generateSessionId', () => {
    it('should generate 16 character hex string', () => {
      const id = manager.generateSessionId();
      expect(id.length).toBe(16);
      expect(/^[a-f0-9]{16}$/i.test(id)).toBe(true);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(manager.generateSessionId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('isValidSessionId', () => {
    it('should accept valid 16 char hex', () => {
      expect(manager.isValidSessionId('a1b2c3d4e5f67890')).toBe(true);
    });

    it('should reject invalid format', () => {
      expect(manager.isValidSessionId('invalid')).toBe(false);
      expect(manager.isValidSessionId('../../etc/passwd')).toBe(false);
      expect(manager.isValidSessionId('')).toBe(false);
      expect(manager.isValidSessionId(null)).toBe(false);
    });
  });

  describe('getSessionPath', () => {
    it('should return correct path', () => {
      const sessionPath = manager.getSessionPath('a1b2c3d4e5f67890');
      expect(sessionPath).toContain('a1b2c3d4e5f67890.json');
    });

    it('should throw for invalid session ID', () => {
      expect(() => manager.getSessionPath('invalid')).toThrow();
    });
  });

  describe('getActiveSession', () => {
    it('should return null when no active session', () => {
      expect(manager.getActiveSession()).toBeNull();
    });

    it('should return active session', async () => {
      await manager.createSession('agent');
      expect(manager.getActiveSession()).not.toBeNull();
    });
  });

  describe('clearActiveSession', () => {
    it('should clear active session', async () => {
      await manager.createSession('agent');
      manager.clearActiveSession();
      expect(manager.activeSession).toBeNull();
    });
  });
});
