/**
 * Unit tests for HoleStateManager
 */

import { HoleStateManager } from '../../managers/HoleStateManager';
import { EventTypes } from '../../events/EventTypes';

// Mock EventTypes
jest.mock('../../events/EventTypes', () => ({
  EventTypes: {
    HOLE_STARTED: 'hole:started',
    HOLE_COMPLETED: 'hole:completed',
    HOLE_STATE_UPDATED: 'hole:state_updated'
  }
}));

describe('HoleStateManager', () => {
  let holeStateManager;
  let mockGame;
  let mockEventManager;
  let mockCourse;
  let mockStateManager;
  let mockScoringSystem;

  beforeEach(() => {
    // Mock event manager
    mockEventManager = {
      subscribe: jest.fn(),
      publish: jest.fn()
    };

    // Mock course
    mockCourse = {
      getTotalHoles: jest.fn(() => 9),
      getHolePar: jest.fn(holeNumber => {
        // Return different par values for testing
        if (holeNumber === 1) {
          return 3;
        }
        if (holeNumber === 2) {
          return 4;
        }
        if (holeNumber === 3) {
          return 5;
        }
        return 3; // Default
      })
    };

    // Mock state manager
    mockStateManager = {
      getCurrentHoleNumber: jest.fn(() => 1)
    };

    // Mock scoring system
    mockScoringSystem = {
      getTotalStrokes: jest.fn(() => 4)
    };

    // Mock game
    mockGame = {
      eventManager: mockEventManager,
      course: mockCourse,
      stateManager: mockStateManager,
      scoringSystem: mockScoringSystem
    };

    holeStateManager = new HoleStateManager(mockGame);

    // Clear all mocks
    jest.clearAllMocks();

    // Mock Date.now for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(12345);
  });

  afterEach(() => {
    jest.clearAllMocks();
    Date.now.mockRestore();
  });

  describe('constructor', () => {
    test('should initialize with game reference', () => {
      expect(holeStateManager.game).toBe(mockGame);
    });

    test('should initialize empty hole states Map', () => {
      expect(holeStateManager.holeStates).toBeInstanceOf(Map);
      expect(holeStateManager.holeStates.size).toBe(0);
    });
  });

  describe('init', () => {
    test('should set up event listeners and initialize hole states', () => {
      const setupSpy = jest.spyOn(holeStateManager, 'setupEventListeners');
      const initSpy = jest.spyOn(holeStateManager, 'initializeHoleStates');

      const result = holeStateManager.init();

      expect(setupSpy).toHaveBeenCalled();
      expect(initSpy).toHaveBeenCalled();
      expect(result).toBe(holeStateManager); // Returns self for chaining
    });
  });

  describe('setupEventListeners', () => {
    test('should subscribe to hole started and completed events', () => {
      holeStateManager.setupEventListeners();

      expect(mockEventManager.subscribe).toHaveBeenCalledWith(
        EventTypes.HOLE_STARTED,
        holeStateManager.handleHoleStarted,
        holeStateManager
      );

      expect(mockEventManager.subscribe).toHaveBeenCalledWith(
        EventTypes.HOLE_COMPLETED,
        holeStateManager.handleHoleCompleted,
        holeStateManager
      );

      expect(mockEventManager.subscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe('initializeHoleStates', () => {
    test('should initialize states for all holes', () => {
      mockCourse.getTotalHoles.mockReturnValue(3);

      holeStateManager.initializeHoleStates();

      expect(holeStateManager.holeStates.size).toBe(3);

      // Check first hole state
      const hole0State = holeStateManager.holeStates.get(0);
      expect(hole0State).toEqual({
        completed: false,
        strokes: 0,
        par: 3, // getHolePar(1)
        hazards: [],
        startTime: null,
        endTime: null
      });

      // Check second hole state
      const hole1State = holeStateManager.holeStates.get(1);
      expect(hole1State).toEqual({
        completed: false,
        strokes: 0,
        par: 4, // getHolePar(2)
        hazards: [],
        startTime: null,
        endTime: null
      });

      // Verify course methods were called correctly
      expect(mockCourse.getTotalHoles).toHaveBeenCalled();
      expect(mockCourse.getHolePar).toHaveBeenCalledWith(1);
      expect(mockCourse.getHolePar).toHaveBeenCalledWith(2);
      expect(mockCourse.getHolePar).toHaveBeenCalledWith(3);
    });

    test('should handle zero holes gracefully', () => {
      mockCourse.getTotalHoles.mockReturnValue(0);

      holeStateManager.initializeHoleStates();

      expect(holeStateManager.holeStates.size).toBe(0);
    });

    test('should reinitialize existing states', () => {
      // Set up initial states
      holeStateManager.holeStates.set(0, { completed: true, strokes: 5 });
      mockCourse.getTotalHoles.mockReturnValue(1);

      holeStateManager.initializeHoleStates();

      // Should overwrite existing state
      const hole0State = holeStateManager.holeStates.get(0);
      expect(hole0State.completed).toBe(false);
      expect(hole0State.strokes).toBe(0);
    });
  });

  describe('getAllHoleStates', () => {
    test('should return the hole states Map', () => {
      const result = holeStateManager.getAllHoleStates();

      expect(result).toBe(holeStateManager.holeStates);
      expect(result).toBeInstanceOf(Map);
    });
  });

  describe('getHoleState', () => {
    beforeEach(() => {
      holeStateManager.holeStates.set(0, {
        completed: true,
        strokes: 4,
        par: 3,
        hazards: ['water'],
        startTime: 1000,
        endTime: 2000
      });
    });

    test('should return state for existing hole', () => {
      const state = holeStateManager.getHoleState(0);

      expect(state).toEqual({
        completed: true,
        strokes: 4,
        par: 3,
        hazards: ['water'],
        startTime: 1000,
        endTime: 2000
      });
    });

    test('should return undefined for non-existent hole', () => {
      const state = holeStateManager.getHoleState(999);

      expect(state).toBeUndefined();
    });
  });

  describe('updateHoleState', () => {
    beforeEach(() => {
      holeStateManager.holeStates.set(0, {
        completed: false,
        strokes: 2,
        par: 3,
        hazards: [],
        startTime: 1000,
        endTime: null
      });
    });

    test('should update existing hole state and publish event', () => {
      const updates = { strokes: 3, completed: true, endTime: 2000 };

      holeStateManager.updateHoleState(0, updates);

      const updatedState = holeStateManager.holeStates.get(0);
      expect(updatedState).toEqual({
        completed: true,
        strokes: 3,
        par: 3,
        hazards: [],
        startTime: 1000,
        endTime: 2000
      });

      // Verify event was published
      expect(mockEventManager.publish).toHaveBeenCalledWith(
        EventTypes.HOLE_STATE_UPDATED,
        {
          holeIndex: 0,
          state: updatedState
        },
        holeStateManager
      );
    });

    test('should handle partial updates', () => {
      const updates = { strokes: 3 };

      holeStateManager.updateHoleState(0, updates);

      const updatedState = holeStateManager.holeStates.get(0);
      expect(updatedState.strokes).toBe(3);
      expect(updatedState.completed).toBe(false); // Should remain unchanged
      expect(updatedState.par).toBe(3); // Should remain unchanged
    });

    test('should not update non-existent hole', () => {
      holeStateManager.updateHoleState(999, { strokes: 5 });

      // Should not publish event
      expect(mockEventManager.publish).not.toHaveBeenCalled();
    });

    test('should handle empty updates object', () => {
      const originalState = { ...holeStateManager.holeStates.get(0) };

      holeStateManager.updateHoleState(0, {});

      const updatedState = holeStateManager.holeStates.get(0);
      expect(updatedState).toEqual(originalState);

      // Should still publish event even with empty updates
      expect(mockEventManager.publish).toHaveBeenCalled();
    });
  });

  describe('isHoleCompleted', () => {
    beforeEach(() => {
      holeStateManager.holeStates.set(0, { completed: true });
      holeStateManager.holeStates.set(1, { completed: false });
    });

    test('should return true for completed hole', () => {
      expect(holeStateManager.isHoleCompleted(0)).toBe(true);
    });

    test('should return false for incomplete hole', () => {
      expect(holeStateManager.isHoleCompleted(1)).toBe(false);
    });

    test('should return false for non-existent hole', () => {
      expect(holeStateManager.isHoleCompleted(999)).toBe(false);
    });
  });

  describe('getHolePar', () => {
    beforeEach(() => {
      holeStateManager.holeStates.set(0, { par: 4 });
      holeStateManager.holeStates.set(1, { par: 5 });
    });

    test('should return par for existing hole', () => {
      expect(holeStateManager.getHolePar(0)).toBe(4);
      expect(holeStateManager.getHolePar(1)).toBe(5);
    });

    test('should return default par (3) for non-existent hole', () => {
      expect(holeStateManager.getHolePar(999)).toBe(3);
    });
  });

  describe('getHoleHazards', () => {
    beforeEach(() => {
      holeStateManager.holeStates.set(0, { hazards: ['water', 'sand'] });
      holeStateManager.holeStates.set(1, { hazards: [] });
    });

    test('should return hazards array for existing hole', () => {
      expect(holeStateManager.getHoleHazards(0)).toEqual(['water', 'sand']);
      expect(holeStateManager.getHoleHazards(1)).toEqual([]);
    });

    test('should return empty array for non-existent hole', () => {
      expect(holeStateManager.getHoleHazards(999)).toEqual([]);
    });
  });

  describe('handleHoleStarted', () => {
    test('should update hole state when hole starts', () => {
      mockStateManager.getCurrentHoleNumber.mockReturnValue(2); // Hole index 1
      const updateSpy = jest.spyOn(holeStateManager, 'updateHoleState');

      holeStateManager.handleHoleStarted({});

      expect(updateSpy).toHaveBeenCalledWith(1, {
        startTime: 12345,
        strokes: 0,
        completed: false
      });
    });

    test('should handle first hole correctly', () => {
      mockStateManager.getCurrentHoleNumber.mockReturnValue(1); // Hole index 0
      const updateSpy = jest.spyOn(holeStateManager, 'updateHoleState');

      holeStateManager.handleHoleStarted({});

      expect(updateSpy).toHaveBeenCalledWith(0, {
        startTime: 12345,
        strokes: 0,
        completed: false
      });
    });
  });

  describe('handleHoleCompleted', () => {
    test('should update hole state when hole completes', () => {
      mockStateManager.getCurrentHoleNumber.mockReturnValue(3); // Hole index 2
      mockScoringSystem.getTotalStrokes.mockReturnValue(6);
      const updateSpy = jest.spyOn(holeStateManager, 'updateHoleState');

      holeStateManager.handleHoleCompleted({});

      expect(updateSpy).toHaveBeenCalledWith(2, {
        completed: true,
        strokes: 6,
        endTime: 12345
      });
    });

    test('should get current stroke count from scoring system', () => {
      mockScoringSystem.getTotalStrokes.mockReturnValue(7);
      const updateSpy = jest.spyOn(holeStateManager, 'updateHoleState');

      holeStateManager.handleHoleCompleted({});

      expect(mockScoringSystem.getTotalStrokes).toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({ strokes: 7 })
      );
    });
  });

  describe('reset', () => {
    test('should reinitialize hole states', () => {
      // Set up some initial state
      holeStateManager.holeStates.set(0, { completed: true, strokes: 5 });

      const initSpy = jest.spyOn(holeStateManager, 'initializeHoleStates');

      holeStateManager.reset();

      expect(initSpy).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    test('should clear all hole states', () => {
      holeStateManager.holeStates.set(0, { completed: true });
      holeStateManager.holeStates.set(1, { completed: false });

      expect(holeStateManager.holeStates.size).toBe(2);

      holeStateManager.cleanup();

      expect(holeStateManager.holeStates.size).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    test('should handle complete hole lifecycle', () => {
      // Initialize
      holeStateManager.init();

      // Verify initial state
      expect(holeStateManager.holeStates.size).toBe(9);
      expect(holeStateManager.isHoleCompleted(0)).toBe(false);

      // Start hole
      mockStateManager.getCurrentHoleNumber.mockReturnValue(1);
      holeStateManager.handleHoleStarted({});

      const stateAfterStart = holeStateManager.getHoleState(0);
      expect(stateAfterStart.startTime).toBe(12345);
      expect(stateAfterStart.strokes).toBe(0);
      expect(stateAfterStart.completed).toBe(false);

      // Complete hole
      mockScoringSystem.getTotalStrokes.mockReturnValue(4);
      Date.now.mockReturnValue(54321);
      holeStateManager.handleHoleCompleted({});

      const stateAfterComplete = holeStateManager.getHoleState(0);
      expect(stateAfterComplete.completed).toBe(true);
      expect(stateAfterComplete.strokes).toBe(4);
      expect(stateAfterComplete.endTime).toBe(54321);

      // Verify events were published
      expect(mockEventManager.publish).toHaveBeenCalledTimes(2); // Start and complete updates
    });

    test('should handle course with different hole counts', () => {
      mockCourse.getTotalHoles.mockReturnValue(18);

      holeStateManager.init();

      expect(holeStateManager.holeStates.size).toBe(18);
      expect(holeStateManager.getHoleState(17)).toBeDefined(); // Last hole exists
      expect(holeStateManager.getHoleState(18)).toBeUndefined(); // Out of bounds
    });

    test('should handle reset after gameplay', () => {
      holeStateManager.init();

      // Play some holes
      holeStateManager.updateHoleState(0, { completed: true, strokes: 4 });
      holeStateManager.updateHoleState(1, { completed: true, strokes: 3 });

      expect(holeStateManager.isHoleCompleted(0)).toBe(true);
      expect(holeStateManager.isHoleCompleted(1)).toBe(true);

      // Reset
      holeStateManager.reset();

      expect(holeStateManager.isHoleCompleted(0)).toBe(false);
      expect(holeStateManager.isHoleCompleted(1)).toBe(false);
    });
  });
});
