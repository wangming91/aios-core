/**
 * Tests for SYNAPSE Session Manager
 *
 * Tests session CRUD and cleanup operations.
 */

'use strict';

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const {
  createSession,
  loadSession,
  updateSession,
  deleteSession,
  cleanStaleSessions,
  generateTitle,
  ensureGitignore,
  SCHEMA_VERSION,
} = require('../../../.aios-core/core/synapse/session/session-manager');

describe('synapse/session-manager', () => {
  let tempDir;
  let sessionsDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'synapse-session-'));
    sessionsDir = path.join(tempDir, '.synapse', 'sessions');
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('SCHEMA_VERSION', () => {
    it('should be defined', () => {
      expect(SCHEMA_VERSION).toBe('2.0');
    });
  });

  describe('createSession', () => {
    it('should create session with UUID', async () => {
      const session = createSession('test-uuid-123', tempDir, sessionsDir);
      expect(session).toBeDefined();
      expect(session.uuid).toBe('test-uuid-123');
    });

    it('should create session file', async () => {
      createSession('test-uuid-456', tempDir, sessionsDir);
      const sessionPath = path.join(sessionsDir, 'test-uuid-456.json');
      expect(await fs.pathExists(sessionPath)).toBe(true);
    });

    it('should set schema version', async () => {
      const session = createSession('test-uuid-789', tempDir, sessionsDir);
      expect(session.schema_version).toBe('2.0');
    });

    it('should set cwd and label', async () => {
      const session = createSession('test-uuid-abc', tempDir, sessionsDir);
      expect(session.cwd).toBe(tempDir);
      expect(session.label).toBe(path.basename(tempDir));
    });

    it('should initialize with null title', async () => {
      const session = createSession('test-uuid-def', tempDir, sessionsDir);
      expect(session.title).toBeNull();
    });

    it('should initialize prompt_count to 0', async () => {
      const session = createSession('test-uuid-ghi', tempDir, sessionsDir);
      expect(session.prompt_count).toBe(0);
    });

    it('should create sessions directory', async () => {
      await fs.remove(sessionsDir);
      createSession('test-uuid-jkl', tempDir, sessionsDir);
      expect(await fs.pathExists(sessionsDir)).toBe(true);
    });

    it('should throw for path traversal sessionId', () => {
      expect(() => createSession('../etc/passwd', tempDir, sessionsDir)).toThrow();
    });

    it('should throw for sessionId with slash', () => {
      expect(() => createSession('foo/bar', tempDir, sessionsDir)).toThrow();
    });
  });

  describe('loadSession', () => {
    it('should load existing session', async () => {
      createSession('load-test-1', tempDir, sessionsDir);
      const session = loadSession('load-test-1', sessionsDir);
      expect(session).toBeDefined();
      expect(session.uuid).toBe('load-test-1');
    });

    it('should return null for non-existent session', async () => {
      const session = loadSession('nonexistent', sessionsDir);
      expect(session).toBeNull();
    });

    it('should return null for corrupted JSON', async () => {
      await fs.ensureDir(sessionsDir);
      await fs.writeFile(path.join(sessionsDir, 'corrupted.json'), 'not valid json');
      const session = loadSession('corrupted', sessionsDir);
      expect(session).toBeNull();
    });

    it('should return null for wrong schema version', async () => {
      await fs.ensureDir(sessionsDir);
      await fs.writeJson(path.join(sessionsDir, 'old-schema.json'), {
        uuid: 'old-schema',
        schema_version: '1.0',
      });
      const session = loadSession('old-schema', sessionsDir);
      expect(session).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update session fields', async () => {
      createSession('update-test-1', tempDir, sessionsDir);
      const updated = updateSession('update-test-1', sessionsDir, { title: 'New Title' });
      expect(updated.title).toBe('New Title');
    });

    it('should increment prompt_count', async () => {
      createSession('update-test-2', tempDir, sessionsDir);
      const before = loadSession('update-test-2', sessionsDir);
      expect(before.prompt_count).toBe(0);

      updateSession('update-test-2', sessionsDir, { title: 'Test' });
      const after = loadSession('update-test-2', sessionsDir);
      expect(after.prompt_count).toBe(1);
    });

    it('should update last_activity', async () => {
      createSession('update-test-3', tempDir, sessionsDir);
      await new Promise(r => setTimeout(r, 10));
      updateSession('update-test-3', sessionsDir, { title: 'Test' });
      const session = loadSession('update-test-3', sessionsDir);
      expect(new Date(session.last_activity).getTime()).toBeGreaterThan(
        new Date(session.started).getTime()
      );
    });

    it('should merge context', async () => {
      createSession('update-test-4', tempDir, sessionsDir);
      updateSession('update-test-4', sessionsDir, {
        context: { last_bracket: 'L1', custom_field: 'value' },
      });
      const session = loadSession('update-test-4', sessionsDir);
      expect(session.context.last_bracket).toBe('L1');
      expect(session.context.custom_field).toBe('value');
    });

    it('should merge history arrays', async () => {
      createSession('update-test-5', tempDir, sessionsDir);
      updateSession('update-test-5', sessionsDir, {
        history: { star_commands_used: ['cmd1'] },
      });
      updateSession('update-test-5', sessionsDir, {
        history: { star_commands_used: ['cmd2'] },
      });
      const session = loadSession('update-test-5', sessionsDir);
      expect(session.history.star_commands_used).toContain('cmd1');
      expect(session.history.star_commands_used).toContain('cmd2');
    });

    it('should return null for non-existent session', async () => {
      const result = updateSession('nonexistent', sessionsDir, { title: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete existing session', async () => {
      createSession('delete-test-1', tempDir, sessionsDir);
      const result = deleteSession('delete-test-1', sessionsDir);
      expect(result).toBe(true);
      expect(loadSession('delete-test-1', sessionsDir)).toBeNull();
    });

    it('should return false for non-existent session', async () => {
      const result = deleteSession('nonexistent', sessionsDir);
      expect(result).toBe(false);
    });
  });

  describe('cleanStaleSessions', () => {
    it('should remove old sessions', async () => {
      // Create a session
      createSession('stale-test-1', tempDir, sessionsDir);

      // Manually set old last_activity
      const sessionPath = path.join(sessionsDir, 'stale-test-1.json');
      const session = await fs.readJson(sessionPath);
      session.last_activity = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours ago
      await fs.writeJson(sessionPath, session);

      const removed = cleanStaleSessions(sessionsDir, 24);
      expect(removed).toBe(1);
    });

    it('should keep fresh sessions', async () => {
      createSession('fresh-test-1', tempDir, sessionsDir);
      const removed = cleanStaleSessions(sessionsDir, 24);
      expect(removed).toBe(0);
    });

    it('should handle missing directory', async () => {
      await fs.remove(sessionsDir);
      const removed = cleanStaleSessions(sessionsDir, 24);
      expect(removed).toBe(0);
    });

    it('should skip corrupted files', async () => {
      await fs.ensureDir(sessionsDir);
      await fs.writeFile(path.join(sessionsDir, 'corrupted.json'), 'bad json');
      const removed = cleanStaleSessions(sessionsDir, 24);
      expect(removed).toBe(0);
    });
  });

  describe('generateTitle', () => {
    it('should return null for null input', () => {
      expect(generateTitle(null)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(generateTitle('')).toBeNull();
    });

    it('should return null for *commands', () => {
      expect(generateTitle('*help')).toBeNull();
      expect(generateTitle('*status')).toBeNull();
    });

    it('should return null for single words', () => {
      expect(generateTitle('hello')).toBeNull();
    });

    it('should return null for very short prompts', () => {
      expect(generateTitle('ab')).toBeNull();
    });

    it('should return title for multi-word prompts', () => {
      expect(generateTitle('Hello world')).toBe('Hello world');
    });

    it('should truncate long prompts', () => {
      const longPrompt = 'This is a very long prompt that should be truncated to fit within the maximum title length limit';
      const title = generateTitle(longPrompt);
      expect(title.length).toBeLessThanOrEqual(50);
    });

    it('should truncate at word boundary', () => {
      const longPrompt = 'This is a very long prompt that should be truncated at a word boundary for better readability';
      const title = generateTitle(longPrompt);
      expect(title).not.toMatch(/\s$/); // Should not end with space
    });
  });

  describe('ensureGitignore', () => {
    it('should create gitignore if not exists', async () => {
      const synapsePath = path.join(tempDir, '.synapse');
      ensureGitignore(synapsePath);
      const gitignorePath = path.join(synapsePath, '.gitignore');
      expect(await fs.pathExists(gitignorePath)).toBe(true);
    });

    it('should include sessions and cache entries', async () => {
      const synapsePath = path.join(tempDir, '.synapse');
      ensureGitignore(synapsePath);
      const content = await fs.readFile(path.join(synapsePath, '.gitignore'), 'utf8');
      expect(content).toContain('sessions/');
      expect(content).toContain('cache/');
    });

    it('should not overwrite existing gitignore', async () => {
      const synapsePath = path.join(tempDir, '.synapse');
      await fs.ensureDir(synapsePath);
      await fs.writeFile(path.join(synapsePath, '.gitignore'), 'custom content');
      ensureGitignore(synapsePath);
      const content = await fs.readFile(path.join(synapsePath, '.gitignore'), 'utf8');
      expect(content).toBe('custom content');
    });
  });
});
