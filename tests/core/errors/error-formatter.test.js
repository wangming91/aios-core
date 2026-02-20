/**
 * ErrorFormatter Unit Tests
 *
 * Tests for error formatting with multiple output formats.
 *
 * @module tests/core/errors/error-formatter.test
 * @see Story STORY-OPT-D2
 */

const { ErrorFormatter, formatUserError } = require('../../../.aios-core/core/errors');
const AIOSError = require('../../../.aios-core/core/errors/base-error');

// Mock chalk for testing (colors can interfere with snapshots)
jest.mock('chalk', () => {
  const createMockChain = () => {
    const chain = (str) => str;
    chain.bold = chain;
    chain.red = chain;
    chain.green = chain;
    chain.yellow = chain;
    chain.cyan = chain;
    chain.gray = chain;
    chain.white = chain;
    chain.blue = chain;
    chain.dim = chain;
    chain.italic = chain;
    chain.underline = chain;
    return chain;
  };
  return {
    red: createMockChain(),
    green: createMockChain(),
    yellow: createMockChain(),
    cyan: createMockChain(),
    gray: createMockChain(),
    white: createMockChain(),
    blue: createMockChain(),
    bold: createMockChain(),
    dim: createMockChain(),
  };
});

describe('ErrorFormatter', () => {
  let formatter;
  let mockAiosError;
  let mockGenericError;

  beforeEach(() => {
    formatter = new ErrorFormatter();

    mockAiosError = new AIOSError('CFG_001', 'Configuration file not found', {
      category: 'CONFIG',
      severity: 'ERROR',
      recoverable: true,
      recoverySteps: [
        "Run 'aios config init' to create default configuration",
        'Check if the configuration file path is correct',
      ],
      docUrl: 'https://docs.aios.dev/errors/CFG_001',
      context: { path: '/path/to/config.yaml' },
    });

    mockGenericError = new Error('Something went wrong');
    mockGenericError.code = 'UNKNOWN';
  });

  describe('format()', () => {
    it('should format error with default options (text format)', () => {
      const result = formatter.format(mockAiosError);

      // Simple mode by default - shows code and message
      expect(result).toContain('CFG_001');
      expect(result).toContain('Configuration file not found');
    });

    it('should accept format option', () => {
      const textResult = formatter.format(mockAiosError, { format: 'text' });
      const jsonResult = formatter.format(mockAiosError, { format: 'json' });
      const mdResult = formatter.format(mockAiosError, { format: 'markdown' });

      expect(textResult).toContain('CFG_001');
      expect(() => JSON.parse(jsonResult)).not.toThrow();
      expect(mdResult).toContain('# Error: CFG_001');
    });

    it('should handle verbose mode', () => {
      const simpleResult = formatter.format(mockAiosError, { verbose: false });
      const verboseResult = formatter.format(mockAiosError, { verbose: true });

      expect(verboseResult.length).toBeGreaterThan(simpleResult.length);
      expect(verboseResult).toContain('Context');
      expect(verboseResult).toContain('/path/to/config.yaml');
    });

    it('should handle color option', () => {
      const withColor = formatter.format(mockAiosError, { color: true });
      const withoutColor = formatter.format(mockAiosError, { color: false });

      // Both should contain the error info
      expect(withColor).toContain('CFG_001');
      expect(withoutColor).toContain('CFG_001');
    });

    it('should handle generic Error objects', () => {
      const result = formatter.format(mockGenericError);

      expect(result).toContain('Something went wrong');
    });

    it('should handle null/undefined errors gracefully', () => {
      expect(() => formatter.format(null)).not.toThrow();
      expect(() => formatter.format(undefined)).not.toThrow();

      const nullResult = formatter.format(null);
      expect(nullResult).toContain('Unknown error');
    });
  });

  describe('formatAsText()', () => {
    it('should format in simple mode without verbose', () => {
      const result = formatter.formatAsText(mockAiosError, { verbose: false });

      // Simple format: just error code and message
      expect(result).toContain('CFG_001');
      expect(result).toContain('Configuration file not found');
    });

    it('should format in verbose mode with box', () => {
      const result = formatter.formatAsText(mockAiosError, { verbose: true });

      // Verbose format includes box borders and all details
      expect(result).toContain('Category');
      expect(result).toContain('CONFIG');
      expect(result).toContain('Severity');
      expect(result).toContain('ERROR');
      expect(result).toContain('Context');
      expect(result).toContain('Recovery');
      expect(result).toContain('Documentation');
    });

    it('should include recovery steps in verbose mode', () => {
      const result = formatter.formatAsText(mockAiosError, { verbose: true });

      expect(result).toContain("Run 'aios config init'");
      expect(result).toContain('Check if the configuration file path is correct');
    });

    it('should include doc URL when available', () => {
      const result = formatter.formatAsText(mockAiosError, { verbose: true });

      expect(result).toContain('https://docs.aios.dev/errors/CFG_001');
    });

    it('should handle error without recovery steps', () => {
      const error = new AIOSError('TEST_001', 'Test error', {
        recoverySteps: [],
      });

      const result = formatter.formatAsText(error, { verbose: true });

      expect(result).toContain('TEST_001');
    });

    it('should display severity icons correctly', () => {
      const criticalError = new AIOSError('SYS_001', 'Critical', { severity: 'CRITICAL' });
      const warningError = new AIOSError('CFG_004', 'Warning', { severity: 'WARNING' });
      const infoError = new AIOSError('INFO_001', 'Info', { severity: 'INFO' });

      // Icons should be present
      expect(formatter.formatAsText(criticalError)).toContain('[x]');
      expect(formatter.formatAsText(warningError)).toContain('[!]');
      expect(formatter.formatAsText(infoError)).toContain('[i]');
    });
  });

  describe('formatAsJson()', () => {
    it('should return valid JSON string', () => {
      const result = formatter.formatAsJson(mockAiosError);

      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should include all error properties', () => {
      const result = formatter.formatAsJson(mockAiosError);
      const parsed = JSON.parse(result);

      expect(parsed.code).toBe('CFG_001');
      expect(parsed.message).toBe('Configuration file not found');
      expect(parsed.category).toBe('CONFIG');
      expect(parsed.severity).toBe('ERROR');
      expect(parsed.recoverable).toBe(true);
      expect(parsed.recoverySteps).toHaveLength(2);
      expect(parsed.docUrl).toBe('https://docs.aios.dev/errors/CFG_001');
    });

    it('should include context in verbose mode', () => {
      const result = formatter.formatAsJson(mockAiosError, { verbose: true });
      const parsed = JSON.parse(result);

      expect(parsed.context).toEqual({ path: '/path/to/config.yaml' });
    });

    it('should include timestamp', () => {
      const result = formatter.formatAsJson(mockAiosError);
      const parsed = JSON.parse(result);

      expect(parsed.timestamp).toBeDefined();
      expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
    });

    it('should handle generic Error objects', () => {
      const result = formatter.formatAsJson(mockGenericError);
      const parsed = JSON.parse(result);

      expect(parsed.message).toBe('Something went wrong');
      expect(parsed.name).toBe('Error');
    });
  });

  describe('formatAsMarkdown()', () => {
    it('should use markdown headings', () => {
      const result = formatter.formatAsMarkdown(mockAiosError);

      expect(result).toContain('# Error: CFG_001');
      expect(result).toContain('## Details');
    });

    it('should use markdown tables for properties', () => {
      const result = formatter.formatAsMarkdown(mockAiosError);

      expect(result).toContain('| Property | Value |');
      expect(result).toContain('| Category |');
      expect(result).toContain('| Severity |');
    });

    it('should use markdown lists for recovery steps', () => {
      const result = formatter.formatAsMarkdown(mockAiosError);

      expect(result).toContain('## Recovery Steps');
      expect(result).toMatch(/\d+\.\s+/); // Numbered list
    });

    it('should include doc link as markdown link', () => {
      const result = formatter.formatAsMarkdown(mockAiosError);

      expect(result).toContain('[View Documentation]');
      expect(result).toContain('(https://docs.aios.dev/errors/CFG_001)');
    });

    it('should include code block for context in verbose mode', () => {
      const result = formatter.formatAsMarkdown(mockAiosError, { verbose: true });

      expect(result).toContain('## Context');
      expect(result).toContain('```json');
    });
  });

  describe('formatMultiple()', () => {
    it('should format multiple errors as table', () => {
      const errors = [
        mockAiosError,
        new AIOSError('AGT_001', 'Agent not found', { category: 'AGENT' }),
      ];

      const result = formatter.formatMultiple(errors);

      expect(result).toContain('CFG_001');
      expect(result).toContain('AGT_001');
    });

    it('should return summary count', () => {
      const errors = [
        mockAiosError,
        new AIOSError('AGT_001', 'Agent not found'),
      ];

      const result = formatter.formatMultiple(errors);

      expect(result).toContain('2 error');
    });

    it('should handle empty error array', () => {
      const result = formatter.formatMultiple([]);

      expect(result).toContain('No errors');
    });
  });

  describe('getSeverityIcon()', () => {
    it('should return correct icon for CRITICAL', () => {
      const icon = formatter.getSeverityIcon('CRITICAL');
      expect(icon).toBeDefined();
    });

    it('should return correct icon for ERROR', () => {
      const icon = formatter.getSeverityIcon('ERROR');
      expect(icon).toBeDefined();
    });

    it('should return correct icon for WARNING', () => {
      const icon = formatter.getSeverityIcon('WARNING');
      expect(icon).toBeDefined();
    });

    it('should return correct icon for INFO', () => {
      const icon = formatter.getSeverityIcon('INFO');
      expect(icon).toBeDefined();
    });

    it('should return default icon for unknown severity', () => {
      const icon = formatter.getSeverityIcon('UNKNOWN');
      expect(icon).toBeDefined();
    });
  });
});

describe('formatUserError() convenience function', () => {
  it('should format error with default text format', () => {
    const error = new AIOSError('CFG_001', 'Configuration file not found');
    const result = formatUserError(error);

    expect(result).toContain('CFG_001');
    expect(result).toContain('Configuration file not found');
  });

  it('should accept options', () => {
    const error = new AIOSError('CFG_001', 'Test', {
      recoverySteps: ['Step 1', 'Step 2'],
    });
    const result = formatUserError(error, { verbose: true });

    expect(result).toContain('Step 1');
    expect(result).toContain('Step 2');
  });

  it('should handle generic errors', () => {
    const error = new Error('Generic error');
    const result = formatUserError(error);

    expect(result).toContain('Generic error');
  });
});

describe('ErrorFormatter edge cases', () => {
  let formatter;

  beforeEach(() => {
    formatter = new ErrorFormatter();
  });

  it('should format error with very long message', () => {
    const longMessage = 'A'.repeat(200);
    const error = new AIOSError('TEST_001', longMessage);

    const result = formatter.formatAsText(error, { verbose: true });

    expect(result).toContain('TEST_001');
    expect(result).toContain('A');
  });

  it('should format error with special context values', () => {
    const error = new AIOSError('TEST_001', 'Test', {
      context: {
        string: 'value',
        number: 42,
        boolean: true,
        null: null,
      },
    });

    const result = formatter.formatAsText(error, { verbose: true });

    expect(result).toContain('string');
    expect(result).toContain('number');
  });

  it('should format markdown without recovery steps', () => {
    const error = new AIOSError('TEST_001', 'Test', {
      recoverySteps: [],
    });

    const result = formatter.formatAsMarkdown(error);

    expect(result).toContain('# Error: TEST_001');
    expect(result).not.toContain('## Recovery Steps');
  });

  it('should format json for non-AIOS errors', () => {
    const error = new Error('Generic error');

    const result = formatter.formatAsJson(error, { verbose: true });
    const parsed = JSON.parse(result);

    expect(parsed.name).toBe('Error');
    expect(parsed.message).toBe('Generic error');
  });
});
