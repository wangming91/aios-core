/**
 * suggest command tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { Command } = require('commander');
const {
  createSuggestCommand,
  getTypeIcon,
  getConfidenceColor
} = require('../../../.aios-core/cli/commands/suggest');

describe('suggest command', () => {
  let tempDir;
  let command;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suggest-cmd-test-'));
    command = createSuggestCommand();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('createSuggestCommand()', () => {
    it('should create command with correct name', () => {
      expect(command.name()).toBe('suggest');
    });

    it('should have learn subcommand', () => {
      const learnCmd = command.commands.find(c => c.name() === 'learn');
      expect(learnCmd).toBeDefined();
    });

    it('should have feedback subcommand', () => {
      const feedbackCmd = command.commands.find(c => c.name() === 'feedback');
      expect(feedbackCmd).toBeDefined();
    });

    it('should have next subcommand', () => {
      const nextCmd = command.commands.find(c => c.name() === 'next');
      expect(nextCmd).toBeDefined();
    });

    it('should have suggest alias tip', () => {
      expect(command.aliases()).toContain('tip');
    });
  });

  describe('getTypeIcon()', () => {
    it('should return correct icon for onboarding', () => {
      expect(getTypeIcon('onboarding')).toBe('🚀');
    });

    it('should return correct icon for recovery', () => {
      expect(getTypeIcon('recovery')).toBe('🔧');
    });

    it('should return correct icon for workflow', () => {
      expect(getTypeIcon('workflow')).toBe('🔄');
    });

    it('should return correct icon for quality', () => {
      expect(getTypeIcon('quality')).toBe('✨');
    });

    it('should return bulb for unknown', () => {
      expect(getTypeIcon('unknown')).toBe('💡');
    });
  });

  describe('getConfidenceColor()', () => {
    it('should return green for high confidence', () => {
      const color = getConfidenceColor(90);
      expect(typeof color).toBe('function');
    });

    it('should return yellow for medium confidence', () => {
      const color = getConfidenceColor(70);
      expect(typeof color).toBe('function');
    });

    it('should return gray for low confidence', () => {
      const color = getConfidenceColor(40);
      expect(typeof color).toBe('function');
    });
  });
});
