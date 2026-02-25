/**
 * Tests for CircuitBreaker
 *
 * Tests the Circuit Breaker pattern implementation for graceful degradation.
 */

'use strict';

const {
  CircuitBreaker,
  STATE_CLOSED,
  STATE_OPEN,
  STATE_HALF_OPEN,
  DEFAULT_FAILURE_THRESHOLD,
  DEFAULT_SUCCESS_THRESHOLD,
  DEFAULT_RESET_TIMEOUT_MS,
} = require('../../../.aios-core/core/ids/circuit-breaker');

describe('CircuitBreaker', () => {
  describe('exports', () => {
    it('should export STATE_CLOSED constant', () => {
      expect(STATE_CLOSED).toBe('CLOSED');
    });

    it('should export STATE_OPEN constant', () => {
      expect(STATE_OPEN).toBe('OPEN');
    });

    it('should export STATE_HALF_OPEN constant', () => {
      expect(STATE_HALF_OPEN).toBe('HALF_OPEN');
    });

    it('should export default thresholds', () => {
      expect(DEFAULT_FAILURE_THRESHOLD).toBe(5);
      expect(DEFAULT_SUCCESS_THRESHOLD).toBe(3);
      expect(DEFAULT_RESET_TIMEOUT_MS).toBe(60000);
    });
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const cb = new CircuitBreaker();
      expect(cb.getState()).toBe(STATE_CLOSED);
      expect(cb.getStats().failureCount).toBe(0);
      expect(cb.getStats().successCount).toBe(0);
      expect(cb.getStats().totalTrips).toBe(0);
    });

    it('should accept custom failure threshold', () => {
      const cb = new CircuitBreaker({ failureThreshold: 3 });
      expect(cb.getStats().failureCount).toBe(0);
    });

    it('should accept custom success threshold', () => {
      const cb = new CircuitBreaker({ successThreshold: 2 });
      expect(cb.getStats().successCount).toBe(0);
    });

    it('should accept custom reset timeout', () => {
      const cb = new CircuitBreaker({ resetTimeoutMs: 30000 });
      expect(cb.getState()).toBe(STATE_CLOSED);
    });
  });

  describe('CLOSED state', () => {
    let cb;

    beforeEach(() => {
      cb = new CircuitBreaker({ failureThreshold: 3 });
    });

    it('should allow requests when closed', () => {
      expect(cb.isAllowed()).toBe(true);
    });

    it('should stay closed on success', () => {
      cb.recordSuccess();
      expect(cb.getState()).toBe(STATE_CLOSED);
    });

    it('should reset failure count on success', () => {
      cb.recordFailure();
      cb.recordFailure();
      cb.recordSuccess();
      expect(cb.getStats().failureCount).toBe(0);
    });

    it('should open after reaching failure threshold', () => {
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getState()).toBe(STATE_CLOSED);

      cb.recordFailure();
      expect(cb.getState()).toBe(STATE_OPEN);
    });

    it('should increment totalTrips when opening', () => {
      cb.recordFailure();
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getStats().totalTrips).toBe(1);
    });
  });

  describe('OPEN state', () => {
    let cb;

    beforeEach(() => {
      cb = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 100,
      });
      // Open the circuit
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getState()).toBe(STATE_OPEN);
    });

    it('should block requests when open', () => {
      expect(cb.isAllowed()).toBe(false);
    });

    it('should transition to half-open after reset timeout', async () => {
      expect(cb.isAllowed()).toBe(false);

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cb.isAllowed()).toBe(true);
      expect(cb.getState()).toBe(STATE_HALF_OPEN);
    });

    it('should stay open when recording failure', () => {
      cb.recordFailure();
      expect(cb.getState()).toBe(STATE_OPEN);
    });
  });

  describe('HALF_OPEN state', () => {
    let cb;

    beforeEach(async () => {
      cb = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        resetTimeoutMs: 50,
      });
      // Open the circuit
      cb.recordFailure();
      cb.recordFailure();
      // Wait for reset timeout to transition to half-open
      await new Promise(resolve => setTimeout(resolve, 100));
      cb.isAllowed(); // This triggers transition to HALF_OPEN
      expect(cb.getState()).toBe(STATE_HALF_OPEN);
    });

    it('should allow exactly one probe request', () => {
      expect(cb.isAllowed()).toBe(false); // Probe already in flight
    });

    it('should reopen on failure in half-open', () => {
      cb.recordFailure();
      expect(cb.getState()).toBe(STATE_OPEN);
      expect(cb.getStats().totalTrips).toBe(2);
    });

    it('should close after enough successes in half-open', () => {
      cb.recordSuccess();
      expect(cb.getState()).toBe(STATE_HALF_OPEN);

      cb.recordSuccess();
      expect(cb.getState()).toBe(STATE_CLOSED);
      expect(cb.getStats().failureCount).toBe(0);
    });

    it('should reset success count on failure in half-open', () => {
      cb.recordSuccess();
      cb.recordFailure();
      expect(cb.getStats().successCount).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return state', () => {
      const cb = new CircuitBreaker();
      const stats = cb.getStats();
      expect(stats.state).toBe(STATE_CLOSED);
    });

    it('should return failure count', () => {
      const cb = new CircuitBreaker();
      cb.recordFailure();
      expect(cb.getStats().failureCount).toBe(1);
    });

    it('should return success count', () => {
      const cb = new CircuitBreaker();
      cb.recordSuccess();
      expect(cb.getStats().successCount).toBe(0); // Only counts in HALF_OPEN
    });

    it('should return total trips', () => {
      const cb = new CircuitBreaker({ failureThreshold: 1 });
      cb.recordFailure();
      expect(cb.getStats().totalTrips).toBe(1);
    });

    it('should return last failure time', () => {
      const cb = new CircuitBreaker();
      const before = Date.now();
      cb.recordFailure();
      const after = Date.now();
      const stats = cb.getStats();
      expect(stats.lastFailureTime).toBeGreaterThanOrEqual(before);
      expect(stats.lastFailureTime).toBeLessThanOrEqual(after);
    });

    it('should return null last failure time when no failures', () => {
      const cb = new CircuitBreaker();
      expect(cb.getStats().lastFailureTime).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset to closed state', () => {
      const cb = new CircuitBreaker({ failureThreshold: 1 });
      cb.recordFailure();
      expect(cb.getState()).toBe(STATE_OPEN);

      cb.reset();
      expect(cb.getState()).toBe(STATE_CLOSED);
    });

    it('should reset failure count', () => {
      const cb = new CircuitBreaker();
      cb.recordFailure();
      cb.recordFailure();
      cb.reset();
      expect(cb.getStats().failureCount).toBe(0);
    });

    it('should reset success count', () => {
      const cb = new CircuitBreaker();
      cb.reset();
      expect(cb.getStats().successCount).toBe(0);
    });

    it('should allow requests after reset', () => {
      const cb = new CircuitBreaker({ failureThreshold: 1 });
      cb.recordFailure();
      cb.reset();
      expect(cb.isAllowed()).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical failure-recovery cycle', async () => {
      const cb = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeoutMs: 50,
      });

      // Normal operation
      expect(cb.isAllowed()).toBe(true);
      cb.recordSuccess();
      expect(cb.getState()).toBe(STATE_CLOSED);

      // Failures occur
      cb.recordFailure();
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getState()).toBe(STATE_OPEN);
      expect(cb.isAllowed()).toBe(false);

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 100));

      // Half-open probe succeeds
      expect(cb.isAllowed()).toBe(true);
      expect(cb.getState()).toBe(STATE_HALF_OPEN);
      cb.recordSuccess();
      cb.recordSuccess();
      expect(cb.getState()).toBe(STATE_CLOSED);

      // Back to normal
      expect(cb.isAllowed()).toBe(true);
    });

    it('should handle repeated failures in half-open', async () => {
      const cb = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        resetTimeoutMs: 50,
      });

      // Open the circuit
      cb.recordFailure();
      cb.recordFailure();

      // Wait and transition to half-open
      await new Promise(resolve => setTimeout(resolve, 100));
      cb.isAllowed();

      // Fail immediately in half-open
      cb.recordFailure();
      expect(cb.getState()).toBe(STATE_OPEN);
      expect(cb.getStats().totalTrips).toBe(2);

      // Wait again
      await new Promise(resolve => setTimeout(resolve, 100));
      cb.isAllowed();
      cb.recordFailure();
      expect(cb.getStats().totalTrips).toBe(3);
    });
  });
});
