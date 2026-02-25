/**
 * Tests for Events Module
 *
 * Tests the event types and module exports.
 */

'use strict';

const { DashboardEventType } = require('../../../.aios-core/core/events/types');
const eventsModule = require('../../../.aios-core/core/events');

describe('events/types', () => {
  describe('DashboardEventType', () => {
    it('should define AGENT_ACTIVATED', () => {
      expect(DashboardEventType.AGENT_ACTIVATED).toBe('AgentActivated');
    });

    it('should define AGENT_DEACTIVATED', () => {
      expect(DashboardEventType.AGENT_DEACTIVATED).toBe('AgentDeactivated');
    });

    it('should define COMMAND_START', () => {
      expect(DashboardEventType.COMMAND_START).toBe('CommandStart');
    });

    it('should define COMMAND_COMPLETE', () => {
      expect(DashboardEventType.COMMAND_COMPLETE).toBe('CommandComplete');
    });

    it('should define COMMAND_ERROR', () => {
      expect(DashboardEventType.COMMAND_ERROR).toBe('CommandError');
    });

    it('should define STORY_STATUS_CHANGE', () => {
      expect(DashboardEventType.STORY_STATUS_CHANGE).toBe('StoryStatusChange');
    });

    it('should define SESSION_START', () => {
      expect(DashboardEventType.SESSION_START).toBe('SessionStart');
    });

    it('should define SESSION_END', () => {
      expect(DashboardEventType.SESSION_END).toBe('SessionEnd');
    });

    // Bob-specific event types (Story 12.6)
    it('should define BOB_PHASE_CHANGE', () => {
      expect(DashboardEventType.BOB_PHASE_CHANGE).toBe('BobPhaseChange');
    });

    it('should define BOB_AGENT_SPAWNED', () => {
      expect(DashboardEventType.BOB_AGENT_SPAWNED).toBe('BobAgentSpawned');
    });

    it('should define BOB_AGENT_COMPLETED', () => {
      expect(DashboardEventType.BOB_AGENT_COMPLETED).toBe('BobAgentCompleted');
    });

    it('should define BOB_SURFACE_DECISION', () => {
      expect(DashboardEventType.BOB_SURFACE_DECISION).toBe('BobSurfaceDecision');
    });

    it('should define BOB_ERROR', () => {
      expect(DashboardEventType.BOB_ERROR).toBe('BobError');
    });

    it('should have all expected event types', () => {
      const expectedTypes = [
        'AgentActivated',
        'AgentDeactivated',
        'CommandStart',
        'CommandComplete',
        'CommandError',
        'StoryStatusChange',
        'SessionStart',
        'SessionEnd',
        'BobPhaseChange',
        'BobAgentSpawned',
        'BobAgentCompleted',
        'BobSurfaceDecision',
        'BobError',
      ];

      const actualTypes = Object.values(DashboardEventType);
      expect(actualTypes.sort()).toEqual(expectedTypes.sort());
    });
  });
});

describe('events/index', () => {
  it('should export DashboardEventType', () => {
    expect(eventsModule.DashboardEventType).toBeDefined();
    expect(eventsModule.DashboardEventType).toBe(DashboardEventType);
  });

  it('should export DashboardEmitter', () => {
    expect(eventsModule.DashboardEmitter).toBeDefined();
  });

  it('should export getDashboardEmitter function', () => {
    expect(typeof eventsModule.getDashboardEmitter).toBe('function');
  });
});
