/**
 * Predictive Error Detector - Tests
 *
 * @module tests/unit/predictive-error-detector.test.js
 * @story PED-1: Predictive Error Detection
 */

const {
  PredictiveErrorDetector,
  RISK_FACTORS,
  ERROR_PATTERNS,
  PED_CONFIG,
} = require('../../.aios-core/development/scripts/predictive-error-detector');

const fs = require('fs');

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

// Mock js-yaml
jest.mock('js-yaml', () => ({
  load: jest.fn(() => ({
    version: '1.0.0',
    sessionStartedAt: '2026-01-01T00:00:00.000Z',
    errorHistory: [],
    riskAssessments: [],
    patterns: {},
  })),
  dump: jest.fn(() => 'mocked: yaml'),
}));

describe('PredictiveErrorDetector', () => {
  let detector;

  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(false);
    detector = new PredictiveErrorDetector('/test/project');
  });

  // ============================================================
  // 1. Initialization Tests
  // ============================================================
  describe('initialization', () => {
    test('should initialize with default state when no file exists', () => {
      expect(detector.state).toBeDefined();
      expect(detector.state.version).toBe('1.0.0');
      expect(detector.state.errorHistory).toEqual([]);
      expect(detector.state.riskAssessments).toEqual([]);
    });

    test('should use provided project root', () => {
      expect(detector.projectRoot).toBe('/test/project');
    });

    test('should set correct state file path', () => {
      expect(detector.stateFilePath).toContain('predictive-error-state.yaml');
    });
  });

  // ============================================================
  // 2. Risk Analysis Tests
  // ============================================================
  describe('analyzeRisk', () => {
    test('should return assessment object', () => {
      const assessment = detector.analyzeRisk({});

      expect(assessment).toBeDefined();
      expect(assessment.timestamp).toBeDefined();
      expect(assessment.riskLevel).toBeDefined();
      expect(assessment.totalScore).toBeDefined();
      expect(assessment.risks).toBeDefined();
    });

    test('should detect low risk with no factors', () => {
      const assessment = detector.analyzeRisk({});

      expect(assessment.riskLevel).toBe('low');
      expect(assessment.totalScore).toBe(0);
    });

    test('should detect uncommitted changes risk', () => {
      const assessment = detector.analyzeRisk({
        hasUncommittedChanges: true,
      });

      expect(assessment.risks.length).toBeGreaterThan(0);
      expect(assessment.risks.some(r => r.id === 'uncommitted_changes')).toBe(true);
    });

    test('should detect large diff risk', () => {
      const assessment = detector.analyzeRisk({
        diffLines: 600,
      });

      expect(assessment.risks.some(r => r.id === 'large_diff')).toBe(true);
    });

    test('should detect missing tests risk', () => {
      const assessment = detector.analyzeRisk({
        sourceFiles: 5,
        testFiles: 0,
      });

      expect(assessment.risks.some(r => r.id === 'missing_tests')).toBe(true);
    });

    test('should calculate correct total score', () => {
      const assessment = detector.analyzeRisk({
        hasUncommittedChanges: true, // 5 pts
        diffLines: 600, // 6 pts
      });

      expect(assessment.totalScore).toBe(11); // 5 + 6
    });

    test('should classify medium risk correctly', () => {
      const assessment = detector.analyzeRisk({
        hasUncommittedChanges: true, // 5 pts
        diffLines: 600, // 6 pts
      });

      expect(assessment.riskLevel).toBe('medium');
    });

    test('should classify high risk correctly', () => {
      const assessment = detector.analyzeRisk({
        hasUncommittedChanges: true, // 5 pts
        diffLines: 600, // 6 pts
        sourceFiles: 5, // missing tests - 8 pts
        testFiles: 0, // triggers missing_tests
        lastQualityGateFailed: true, // 8 pts
      });

      // Total: 5 + 6 + 8 + 8 = 27 pts (>= 20 threshold)
      expect(assessment.totalScore).toBeGreaterThanOrEqual(PED_CONFIG.HIGH_RISK_THRESHOLD);
      expect(assessment.riskLevel).toBe('high');
    });

    test('should generate recommendations', () => {
      const assessment = detector.analyzeRisk({
        hasUncommittedChanges: true,
      });

      expect(assessment.recommendations).toBeDefined();
      expect(assessment.recommendations.length).toBeGreaterThan(0);
    });

    test('should save state after analysis', () => {
      detector.analyzeRisk({});

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 3. Error Recording Tests
  // ============================================================
  describe('recordError', () => {
    test('should record error message', () => {
      detector.recordError('Test error message');

      expect(detector.state.errorHistory.length).toBe(1);
      expect(detector.state.errorHistory[0].message).toBe('Test error message');
    });

    test('should record Error object', () => {
      const error = new Error('Test error object');
      detector.recordError(error);

      expect(detector.state.errorHistory[0].message).toBe('Test error object');
      expect(detector.state.errorHistory[0].stack).toBeDefined();
    });

    test('should match error patterns', () => {
      detector.recordError('Cannot find module "test"');

      expect(detector.state.errorHistory[0].pattern).toBe('IMPORT_ERROR');
    });

    test('should update pattern statistics', () => {
      detector.recordError('Cannot find module "test"');
      detector.recordError('Module not found: xyz');

      expect(detector.state.patterns['IMPORT_ERROR']).toBe(2);
    });

    test('should include auto-fix suggestion', () => {
      detector.recordError('Cannot find module "test"');

      expect(detector.state.errorHistory[0].autoFix).toBeDefined();
    });
  });

  // ============================================================
  // 4. Prediction Tests
  // ============================================================
  describe('predictErrors', () => {
    test('should return prediction object', () => {
      const prediction = detector.predictErrors();

      expect(prediction.timestamp).toBeDefined();
      expect(prediction.predictions).toBeDefined();
      expect(prediction.hasWarnings).toBeDefined();
    });

    test('should predict based on error patterns', () => {
      // Record multiple similar errors
      for (let i = 0; i < 3; i++) {
        detector.recordError('Cannot find module "test"');
      }

      const prediction = detector.predictErrors();

      expect(prediction.predictions.length).toBeGreaterThan(0);
      expect(prediction.predictions[0].type).toBe('pattern_based');
    });

    test('should include pattern statistics', () => {
      detector.recordError('Cannot find module "test"');

      const prediction = detector.predictErrors();

      expect(prediction.patternStats).toBeDefined();
      expect(prediction.errorHistoryCount).toBe(1);
    });

    test('should predict based on risk assessment', () => {
      detector.analyzeRisk({
        hasUncommittedChanges: true,
        sourceFiles: 5,
        testFiles: 0,
        lastQualityGateFailed: true,
      });

      const prediction = detector.predictErrors();

      const riskBased = prediction.predictions.find(p => p.type === 'risk_based');
      expect(riskBased).toBeDefined();
    });
  });

  // ============================================================
  // 5. Report Generation Tests
  // ============================================================
  describe('generateReport', () => {
    test('should generate ASCII report', () => {
      const report = detector.generateReport();

      expect(report).toContain('Predictive Error Detection Report');
    });

    test('should show risk level', () => {
      detector.analyzeRisk({});
      const report = detector.generateReport();

      expect(report).toContain('Risk Level:');
    });

    test('should show detected risks', () => {
      detector.analyzeRisk({
        hasUncommittedChanges: true,
      });
      const report = detector.generateReport();

      expect(report).toContain('Detected Risks');
    });

    test('should show recommendations', () => {
      detector.analyzeRisk({
        hasUncommittedChanges: true,
      });
      const report = detector.generateReport();

      expect(report).toContain('Recommendations');
    });

    test('should show error history count', () => {
      detector.recordError('Test error');
      const report = detector.generateReport();

      expect(report).toContain('Error History:');
    });
  });

  // ============================================================
  // 6. Status Line Tests
  // ============================================================
  describe('generateStatusLine', () => {
    test('should generate status line without assessment', () => {
      const line = detector.generateStatusLine();

      expect(line).toContain('No risk assessment');
    });

    test('should generate status line with assessment', () => {
      detector.analyzeRisk({});
      const line = detector.generateStatusLine();

      expect(line).toContain('Risk:');
    });
  });

  // ============================================================
  // 7. Error History Tests
  // ============================================================
  describe('getErrorHistory', () => {
    test('should return empty array when no errors', () => {
      const history = detector.getErrorHistory();

      expect(history).toEqual([]);
    });

    test('should return limited history', () => {
      for (let i = 0; i < 20; i++) {
        detector.recordError(`Error ${i}`);
      }

      const history = detector.getErrorHistory(5);

      expect(history.length).toBe(5);
    });
  });

  // ============================================================
  // 8. Reset Tests
  // ============================================================
  describe('reset', () => {
    test('should reset state to defaults', () => {
      detector.recordError('Test error');
      detector.analyzeRisk({ hasUncommittedChanges: true });
      detector.reset();

      expect(detector.state.errorHistory).toEqual([]);
      expect(detector.state.riskAssessments).toEqual([]);
      expect(detector.state.patterns).toEqual({});
    });

    test('should save state after reset', () => {
      detector.reset();

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 9. Static Methods Tests
  // ============================================================
  describe('static methods', () => {
    test('getRiskFactors should return risk factor definitions', () => {
      const factors = PredictiveErrorDetector.getRiskFactors();

      expect(factors).toBe(RISK_FACTORS);
      expect(factors.UNCOMMITTED_CHANGES).toBeDefined();
    });

    test('getErrorPatterns should return error pattern definitions', () => {
      const patterns = PredictiveErrorDetector.getErrorPatterns();

      expect(patterns).toBe(ERROR_PATTERNS);
      expect(patterns.IMPORT_ERROR).toBeDefined();
    });

    test('getConfig should return config', () => {
      const config = PredictiveErrorDetector.getConfig();

      expect(config).toBe(PED_CONFIG);
      expect(config.HIGH_RISK_THRESHOLD).toBeDefined();
    });
  });

  // ============================================================
  // 10. Constants Tests
  // ============================================================
  describe('constants', () => {
    test('RISK_FACTORS should have required risk factors', () => {
      const requiredFactors = [
        'UNCOMMITTED_CHANGES',
        'MISSING_TESTS',
        'RECENT_ERRORS',
        'FAILED_QUALITY_GATE',
      ];

      requiredFactors.forEach(factor => {
        expect(RISK_FACTORS[factor]).toBeDefined();
      });
    });

    test('all risk factors should have required fields', () => {
      for (const [key, factor] of Object.entries(RISK_FACTORS)) {
        expect(factor.id).toBeDefined();
        expect(factor.name).toBeDefined();
        expect(factor.severity).toBeDefined();
        expect(factor.weight).toBeGreaterThan(0);
      }
    });

    test('ERROR_PATTERNS should have required patterns', () => {
      const requiredPatterns = ['IMPORT_ERROR', 'TYPE_ERROR', 'SYNTAX_ERROR'];

      requiredPatterns.forEach(pattern => {
        expect(ERROR_PATTERNS[pattern]).toBeDefined();
      });
    });

    test('all error patterns should have pattern regex', () => {
      for (const [key, pattern] of Object.entries(ERROR_PATTERNS)) {
        expect(pattern.pattern).toBeInstanceOf(RegExp);
        expect(pattern.category).toBeDefined();
      }
    });

    test('PED_CONFIG should have required config values', () => {
      expect(PED_CONFIG.HIGH_RISK_THRESHOLD).toBeGreaterThan(0);
      expect(PED_CONFIG.MEDIUM_RISK_THRESHOLD).toBeGreaterThan(0);
      expect(PED_CONFIG.MAX_HISTORY).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // 11. Error Pattern Matching Tests
  // ============================================================
  describe('error pattern matching', () => {
    test('should match import errors', () => {
      detector.recordError('Cannot find module "./missing"');

      expect(detector.state.errorHistory[0].pattern).toBe('IMPORT_ERROR');
      expect(detector.state.errorHistory[0].category).toBe('dependency');
    });

    test('should match type errors', () => {
      detector.recordError("TypeError: undefined is not a function");

      expect(detector.state.errorHistory[0].pattern).toBe('TYPE_ERROR');
      expect(detector.state.errorHistory[0].category).toBe('code');
    });

    test('should match syntax errors', () => {
      detector.recordError("SyntaxError: Unexpected token '{'");

      expect(detector.state.errorHistory[0].pattern).toBe('SYNTAX_ERROR');
    });

    test('should match permission errors', () => {
      detector.recordError('Error: EACCES: permission denied');

      expect(detector.state.errorHistory[0].pattern).toBe('PERMISSION_ERROR');
    });

    test('should match network errors', () => {
      detector.recordError('Error: ETIMEDOUT connection failed');

      expect(detector.state.errorHistory[0].pattern).toBe('NETWORK_ERROR');
    });
  });

  // ============================================================
  // 12. Integration Tests
  // ============================================================
  describe('integration', () => {
    test('should complete full risk assessment flow', () => {
      // Initial state
      let assessment = detector.analyzeRisk({});
      expect(assessment.riskLevel).toBe('low');

      // Add risk factors
      assessment = detector.analyzeRisk({
        hasUncommittedChanges: true,
        sourceFiles: 10,
        testFiles: 0,
      });

      expect(assessment.riskLevel).not.toBe('low');
      expect(assessment.recommendations.length).toBeGreaterThan(0);

      // Record errors
      detector.recordError('Cannot find module "test"');
      detector.recordError('Cannot find module "another"');

      // Predict
      const prediction = detector.predictErrors();
      expect(prediction.hasWarnings).toBe(true);
    });

    test('should track multiple risk factors over time', () => {
      // First assessment
      detector.analyzeRisk({ hasUncommittedChanges: true });

      // Second assessment
      detector.analyzeRisk({
        hasUncommittedChanges: true,
        diffLines: 600,
      });

      expect(detector.state.riskAssessments.length).toBe(2);
    });
  });
});
