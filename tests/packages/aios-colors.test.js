/**
 * Tests for AIOS Color Palette
 *
 * Tests color definitions and helper functions.
 */

'use strict';

const { colors, status, headings, lists, examples } = require('../../packages/installer/src/utils/aios-colors');

describe('aios-colors', () => {
  describe('colors', () => {
    it('should export primary color', () => {
      expect(colors.primary).toBeDefined();
      expect(typeof colors.primary).toBe('function');
    });

    it('should export secondary color', () => {
      expect(colors.secondary).toBeDefined();
    });

    it('should export tertiary color', () => {
      expect(colors.tertiary).toBeDefined();
    });

    it('should export functional colors', () => {
      expect(colors.success).toBeDefined();
      expect(colors.warning).toBeDefined();
      expect(colors.error).toBeDefined();
      expect(colors.info).toBeDefined();
    });

    it('should export neutral colors', () => {
      expect(colors.muted).toBeDefined();
      expect(colors.dim).toBeDefined();
    });

    it('should export gradient colors', () => {
      expect(colors.gradient).toBeDefined();
      expect(colors.gradient.start).toBeDefined();
      expect(colors.gradient.middle).toBeDefined();
      expect(colors.gradient.end).toBeDefined();
    });

    it('should export semantic shortcuts', () => {
      expect(colors.highlight).toBeDefined();
      expect(colors.brandPrimary).toBeDefined();
      expect(colors.brandSecondary).toBeDefined();
    });

    it('should return colored strings', () => {
      const result = colors.primary('test');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('status', () => {
    it('should format success status', () => {
      const result = status.success('Done');
      expect(result).toContain('Done');
    });

    it('should format error status', () => {
      const result = status.error('Failed');
      expect(result).toContain('Failed');
    });

    it('should format warning status', () => {
      const result = status.warning('Caution');
      expect(result).toContain('Caution');
    });

    it('should format info status', () => {
      const result = status.info('Note');
      expect(result).toContain('Note');
    });

    it('should format loading status', () => {
      const result = status.loading('Processing');
      expect(result).toContain('Processing');
    });

    it('should format skipped status', () => {
      const result = status.skipped('Optional');
      expect(result).toContain('Optional');
    });

    it('should format tip status', () => {
      const result = status.tip('Try this');
      expect(result).toContain('Try this');
    });

    it('should format celebrate status', () => {
      const result = status.celebrate('Complete!');
      expect(result).toContain('Complete!');
    });
  });

  describe('headings', () => {
    it('should format h1 heading', () => {
      const result = headings.h1('Title');
      expect(result).toContain('Title');
      expect(result).toContain('\n');
    });

    it('should format h2 heading', () => {
      const result = headings.h2('Subtitle');
      expect(result).toContain('Subtitle');
    });

    it('should format h3 heading', () => {
      const result = headings.h3('Section');
      expect(result).toContain('Section');
    });

    it('should create divider', () => {
      const result = headings.divider();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('lists', () => {
    it('should format bullet list item', () => {
      const result = lists.bullet('Item');
      expect(result).toContain('Item');
    });

    it('should format numbered list item', () => {
      const result = lists.numbered(1, 'First');
      expect(result).toContain('1');
      expect(result).toContain('First');
    });

    it('should format unchecked checkbox', () => {
      const result = lists.checkbox('Task', false);
      expect(result).toContain('Task');
    });

    it('should format checked checkbox', () => {
      const result = lists.checkbox('Task', true);
      expect(result).toContain('Task');
    });
  });

  describe('examples', () => {
    it('should export welcome example', () => {
      expect(typeof examples.welcome).toBe('function');
    });

    it('should export question example', () => {
      expect(typeof examples.question).toBe('function');
    });

    it('should export progress example', () => {
      expect(typeof examples.progress).toBe('function');
    });

    it('should export feedback example', () => {
      expect(typeof examples.feedback).toBe('function');
    });

    it('should export complete example', () => {
      expect(typeof examples.complete).toBe('function');
    });
  });
});
