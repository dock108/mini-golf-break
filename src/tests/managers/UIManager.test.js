/**
 * Unit tests for UIManager
 */

import { UIManager } from '../../managers/UIManager';
import { EventTypes } from '../../events/EventTypes';

// Mock dependencies
jest.mock('../../events/EventTypes', () => ({
  EventTypes: {
    HOLE_COMPLETED: 'HOLE_COMPLETED',
    HOLE_STARTED: 'HOLE_STARTED',
    GAME_COMPLETED: 'GAME_COMPLETED',
    BALL_HIT: 'BALL_HIT',
    BALL_IN_HOLE: 'BALL_IN_HOLE',
    HAZARD_DETECTED: 'HAZARD_DETECTED',
    UI_REQUEST_MAIN_MENU: 'UI_REQUEST_MAIN_MENU',
    UI_REQUEST_RESTART_GAME: 'UI_REQUEST_RESTART_GAME'
  }
}));

jest.mock('../../managers/ui/UIScoreOverlay', () => ({
  UIScoreOverlay: jest.fn(() => ({
    init: jest.fn(),
    updateHoleInfo: jest.fn(),
    updateScorecard: jest.fn(),
    updateScore: jest.fn(),
    updateStrokes: jest.fn(),
    showFinalScorecard: jest.fn(),
    hideFinalScorecard: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../managers/ui/UIDebugOverlay', () => ({
  UIDebugOverlay: jest.fn(() => ({
    init: jest.fn(),
    updateDebugDisplay: jest.fn(),
    cleanup: jest.fn()
  }))
}));

jest.mock('../../utils/debug', () => ({
  debug: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('UIManager', () => {
  let mockGame;
  let uiManager;

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';

    // Mock classList for DOM elements
    const originalCreateElement = document.createElement;
    document.createElement = jest.fn(tagName => {
      const element = originalCreateElement.call(document, tagName);
      if (!element.classList) {
        const classes = new Set();
        element.classList = {
          add: jest.fn(className => classes.add(className)),
          remove: jest.fn(className => classes.delete(className)),
          contains: jest.fn(className => classes.has(className)),
          toggle: jest.fn(className => {
            if (classes.has(className)) {
              classes.delete(className);
              return false;
            } else {
              classes.add(className);
              return true;
            }
          })
        };
      }
      return element;
    });

    // Create mock game
    mockGame = {
      eventManager: {
        subscribe: jest.fn(() => jest.fn()) // Return unsubscribe function
      },
      scoringSystem: {
        getTotalStrokes: jest.fn(() => 42)
      },
      debugManager: {
        error: jest.fn(),
        warn: jest.fn()
      }
    };

    // Mock console methods
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();

    // Mock global alert
    global.alert = jest.fn();

    // Mock setTimeout and clearTimeout
    global.setTimeout = jest.fn((fn, timeout) => {
      return 'timeout-id-' + timeout;
    });
    global.clearTimeout = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up any remaining DOM elements
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    test('should initialize with game reference', () => {
      uiManager = new UIManager(mockGame);

      expect(uiManager.game).toBe(mockGame);
    });

    test('should initialize with default state', () => {
      uiManager = new UIManager(mockGame);

      expect(uiManager.uiContainer).toBeNull();
      expect(uiManager.renderer).toBeNull();
      expect(uiManager.scoreOverlay).toBeNull();
      expect(uiManager.debugOverlay).toBeNull();
      expect(uiManager.isShowingMessage).toBe(false);
      expect(uiManager.messageTimeoutId).toBeNull();
      expect(uiManager.messageTimeout).toBeNull();
      expect(uiManager.messageElement).toBeNull();
      expect(uiManager.powerIndicator).toBeNull();
      expect(uiManager.eventSubscriptions).toEqual([]);
    });
  });

  describe('init', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockGame);
    });

    test('should initialize successfully', () => {
      const result = uiManager.init();

      expect(uiManager.uiContainer).toBeTruthy();
      expect(uiManager.scoreOverlay).toBeTruthy();
      expect(uiManager.debugOverlay).toBeTruthy();
      expect(uiManager.messageElement).toBeTruthy();
      expect(uiManager.powerIndicator).toBeTruthy();
      expect(result).toBe(uiManager); // Returns self for chaining
    });

    test('should handle initialization errors', () => {
      // Mock createMainContainer to throw an error
      const createMainContainerSpy = jest
        .spyOn(uiManager, 'createMainContainer')
        .mockImplementation(() => {
          throw new Error('Failed to create container');
        });

      uiManager.init();

      expect(console.error).toHaveBeenCalledWith('[UIManager.init] Failed:', expect.any(Error));
      expect(mockGame.debugManager.error).toHaveBeenCalledWith(
        'UIManager.init',
        'Initialization failed',
        expect.any(Error),
        true
      );

      createMainContainerSpy.mockRestore();
    });
  });

  describe('createMainContainer', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockGame);
    });

    test('should create new container when none exists', () => {
      uiManager.createMainContainer();

      expect(uiManager.uiContainer).toBeTruthy();
      expect(uiManager.uiContainer.id).toBe('ui-container');
      expect(uiManager.uiContainer.classList.contains('ui-container')).toBe(true);
      expect(document.body.contains(uiManager.uiContainer)).toBe(true);
    });

    test('should use existing ui-container if available', () => {
      const existingContainer = document.createElement('div');
      existingContainer.id = 'ui-container';
      document.body.appendChild(existingContainer);

      uiManager.createMainContainer();

      expect(uiManager.uiContainer).toBe(existingContainer);
    });

    test('should use existing ui-overlay if ui-container not available', () => {
      const existingOverlay = document.createElement('div');
      existingOverlay.id = 'ui-overlay';
      document.body.appendChild(existingOverlay);

      uiManager.createMainContainer();

      expect(uiManager.uiContainer).toBe(existingOverlay);
    });

    test('should clear existing container contents', () => {
      const existingContainer = document.createElement('div');
      existingContainer.id = 'ui-container';
      const childElement = document.createElement('span');
      existingContainer.appendChild(childElement);
      document.body.appendChild(existingContainer);

      uiManager.createMainContainer();

      expect(uiManager.uiContainer.children.length).toBe(0);
    });
  });

  describe('createMessageUI', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockGame);
      uiManager.createMainContainer();
    });

    test('should create message element', () => {
      uiManager.createMessageUI();

      expect(uiManager.messageElement).toBeTruthy();
      expect(uiManager.messageElement.id).toBe('message-container');
      expect(uiManager.messageElement.classList.contains('message-container')).toBe(true);
      expect(uiManager.uiContainer.contains(uiManager.messageElement)).toBe(true);
    });
  });

  describe('createPowerIndicatorUI', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockGame);
      uiManager.createMainContainer();
    });

    test('should create power indicator with fill element', () => {
      uiManager.createPowerIndicatorUI();

      expect(uiManager.powerIndicator).toBeTruthy();
      expect(uiManager.powerIndicator.classList.contains('power-indicator')).toBe(true);
      expect(uiManager.uiContainer.contains(uiManager.powerIndicator)).toBe(true);

      const fillElement = uiManager.powerIndicator.querySelector('.power-indicator-fill');
      expect(fillElement).toBeTruthy();
    });
  });

  describe('setupEventListeners', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockGame);
    });

    test('should setup event listeners successfully', () => {
      uiManager.setupEventListeners();

      expect(mockGame.eventManager.subscribe).toHaveBeenCalledTimes(8); // All event types
      expect(uiManager.eventSubscriptions.length).toBe(8);
    });

    test('should handle missing event manager gracefully', () => {
      mockGame.eventManager = null;

      uiManager.setupEventListeners();

      expect(console.warn).toHaveBeenCalledWith(
        '[UIManager.setupEventListeners] EventManager not available, skipping.'
      );
    });

    test('should clear existing subscriptions before adding new ones', () => {
      const mockUnsubscribe1 = jest.fn();
      const mockUnsubscribe2 = jest.fn();
      uiManager.eventSubscriptions = [mockUnsubscribe1, mockUnsubscribe2];

      uiManager.setupEventListeners();

      expect(mockUnsubscribe1).toHaveBeenCalled();
      expect(mockUnsubscribe2).toHaveBeenCalled();
    });

    test('should handle subscription errors', () => {
      mockGame.eventManager.subscribe.mockImplementation(() => {
        throw new Error('Subscription failed');
      });

      uiManager.setupEventListeners();

      expect(console.error).toHaveBeenCalledWith(
        '[UIManager.setupEventListeners] Failed:',
        expect.any(Error)
      );
    });
  });

  describe('event handlers', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockGame);
      uiManager.init();
    });

    describe('handleHoleCompleted', () => {
      test('should show completion message and update overlay', () => {
        const mockEvent = {
          get: jest.fn(key => (key === 'holeNumber' ? 3 : null))
        };
        const showMessageSpy = jest.spyOn(uiManager, 'showMessage').mockImplementation(() => {});

        uiManager.handleHoleCompleted(mockEvent);

        expect(showMessageSpy).toHaveBeenCalledWith(
          'Hole 3 completed! Total strokes so far: 42',
          3000
        );
        expect(uiManager.scoreOverlay.updateHoleInfo).toHaveBeenCalled();
        expect(uiManager.scoreOverlay.updateScorecard).toHaveBeenCalled();
        expect(uiManager.scoreOverlay.updateScore).toHaveBeenCalled();

        showMessageSpy.mockRestore();
      });
    });

    describe('handleHoleStarted', () => {
      test('should show hole message and update overlay', () => {
        const mockEvent = {
          get: jest.fn(key => (key === 'holeNumber' ? 5 : null))
        };
        const showMessageSpy = jest.spyOn(uiManager, 'showMessage').mockImplementation(() => {});

        uiManager.handleHoleStarted(mockEvent);

        expect(showMessageSpy).toHaveBeenCalledWith('Hole 5', 2000);
        expect(uiManager.scoreOverlay.updateHoleInfo).toHaveBeenCalled();
        expect(uiManager.scoreOverlay.updateScorecard).toHaveBeenCalled();
        expect(uiManager.scoreOverlay.updateScore).toHaveBeenCalled();
        expect(uiManager.scoreOverlay.updateStrokes).toHaveBeenCalled();

        showMessageSpy.mockRestore();
      });
    });

    describe('handleGameCompleted', () => {
      test('should show final scorecard when available', () => {
        uiManager.handleGameCompleted({});

        expect(uiManager.scoreOverlay.showFinalScorecard).toHaveBeenCalled();
      });

      test('should fallback to alert when scorecard not available', () => {
        uiManager.scoreOverlay.showFinalScorecard = undefined;

        uiManager.handleGameCompleted({});

        expect(global.alert).toHaveBeenCalledWith('Game Complete! Total strokes: 42');
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('[UIManager.handleGameCompleted] ERROR: Cannot show scorecard')
        );
      });

      test('should handle missing scoreOverlay', () => {
        uiManager.scoreOverlay = null;

        uiManager.handleGameCompleted({});

        expect(global.alert).toHaveBeenCalledWith('Game Complete! Total strokes: 42');
      });
    });

    describe('handleBallHit', () => {
      test('should update score and strokes', () => {
        uiManager.handleBallHit({});

        expect(uiManager.scoreOverlay.updateScore).toHaveBeenCalled();
        expect(uiManager.scoreOverlay.updateStrokes).toHaveBeenCalled();
      });
    });

    describe('handleBallInHole', () => {
      test('should not perform specific actions', () => {
        expect(() => {
          uiManager.handleBallInHole({});
        }).not.toThrow();
      });
    });

    describe('handleHazardDetected', () => {
      test('should show water hazard message', () => {
        const mockEvent = {
          get: jest.fn(key => (key === 'hazardType' ? 'water' : null))
        };
        const showMessageSpy = jest.spyOn(uiManager, 'showMessage').mockImplementation(() => {});

        uiManager.handleHazardDetected(mockEvent);

        expect(showMessageSpy).toHaveBeenCalledWith('Water hazard! +1 stroke penalty.', 2000);
        expect(uiManager.scoreOverlay.updateStrokes).toHaveBeenCalled();

        showMessageSpy.mockRestore();
      });

      test('should show out of bounds message', () => {
        const mockEvent = {
          get: jest.fn(key => (key === 'hazardType' ? 'outOfBounds' : null))
        };
        const showMessageSpy = jest.spyOn(uiManager, 'showMessage').mockImplementation(() => {});

        uiManager.handleHazardDetected(mockEvent);

        expect(showMessageSpy).toHaveBeenCalledWith('Out of bounds! +1 stroke penalty.', 2000);

        showMessageSpy.mockRestore();
      });

      test('should not show message for sand hazard', () => {
        const mockEvent = {
          get: jest.fn(key => (key === 'hazardType' ? 'sand' : null))
        };
        const showMessageSpy = jest.spyOn(uiManager, 'showMessage').mockImplementation(() => {});

        uiManager.handleHazardDetected(mockEvent);

        expect(showMessageSpy).not.toHaveBeenCalled();
        expect(uiManager.scoreOverlay.updateStrokes).toHaveBeenCalled();

        showMessageSpy.mockRestore();
      });
    });
  });

  describe('attachRenderer', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockGame);
    });

    test('should attach renderer to existing game container', () => {
      const gameContainer = document.createElement('div');
      gameContainer.id = 'game-container';
      document.body.appendChild(gameContainer);

      const mockRenderer = {
        domElement: document.createElement('canvas')
      };

      uiManager.attachRenderer(mockRenderer);

      expect(uiManager.renderer).toBe(mockRenderer);
      expect(gameContainer.contains(mockRenderer.domElement)).toBe(true);
    });

    test('should create game container when none exists', () => {
      const mockRenderer = {
        domElement: document.createElement('canvas')
      };

      uiManager.attachRenderer(mockRenderer);

      const gameContainer = document.getElementById('game-container');
      expect(gameContainer).toBeTruthy();
      expect(gameContainer.contains(mockRenderer.domElement)).toBe(true);
    });

    test('should handle renderer with existing parent', () => {
      const oldParent = document.createElement('div');
      const mockRenderer = {
        domElement: document.createElement('canvas')
      };
      oldParent.appendChild(mockRenderer.domElement);

      uiManager.attachRenderer(mockRenderer);

      expect(oldParent.contains(mockRenderer.domElement)).toBe(false);
      const gameContainer = document.getElementById('game-container');
      expect(gameContainer.contains(mockRenderer.domElement)).toBe(true);
    });

    test('should handle invalid renderer gracefully', () => {
      uiManager.attachRenderer(null);

      expect(mockGame.debugManager.warn).toHaveBeenCalledWith(
        'UIManager.attachRenderer',
        'Invalid renderer or domElement'
      );
    });

    test('should handle renderer without domElement', () => {
      uiManager.attachRenderer({});

      expect(mockGame.debugManager.warn).toHaveBeenCalledWith(
        'UIManager.attachRenderer',
        'Invalid renderer or domElement'
      );
    });
  });

  describe('message display', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockGame);
      uiManager.createMainContainer();
      uiManager.createMessageUI();
    });

    describe('showMessage', () => {
      test('should display message with default duration', () => {
        uiManager.showMessage('Test message');

        expect(uiManager.messageElement.textContent).toBe('Test message');
        expect(uiManager.messageElement.style.opacity).toBe('1');
        expect(uiManager.messageElement.style.visibility).toBe('visible');
        expect(uiManager.messageElement.classList.contains('visible')).toBe(true);
        expect(uiManager.isShowingMessage).toBe(true);
        expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);
      });

      test('should display message with custom duration', () => {
        uiManager.showMessage('Custom message', 5000);

        expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
      });

      test('should clear existing timeout before showing new message', () => {
        uiManager.messageTimeout = 'existing-timeout';

        uiManager.showMessage('New message');

        expect(global.clearTimeout).toHaveBeenCalledWith('existing-timeout');
        expect(uiManager.messageTimeout).toBe('timeout-id-2000');
      });

      test('should handle missing message element gracefully', () => {
        uiManager.messageElement = null;

        expect(() => {
          uiManager.showMessage('Test message');
        }).not.toThrow();
      });
    });

    describe('hideMessage', () => {
      test('should hide message when showing', () => {
        uiManager.isShowingMessage = true;

        uiManager.hideMessage();

        expect(uiManager.messageElement.style.opacity).toBe('0');
        expect(uiManager.isShowingMessage).toBe(false);
        expect(uiManager.messageTimeout).toBeNull();
      });

      test('should handle hiding when not showing message', () => {
        uiManager.isShowingMessage = false;

        expect(() => {
          uiManager.hideMessage();
        }).not.toThrow();
      });

      test('should handle missing message element', () => {
        uiManager.messageElement = null;
        uiManager.isShowingMessage = true;

        expect(() => {
          uiManager.hideMessage();
        }).not.toThrow();
      });

      test('should set visibility hidden after transition', () => {
        uiManager.isShowingMessage = true;
        const addEventListenerSpy = jest.spyOn(uiManager.messageElement, 'addEventListener');

        uiManager.hideMessage();

        expect(addEventListenerSpy).toHaveBeenCalledWith('transitionend', expect.any(Function), {
          once: true
        });

        // Simulate transition end
        const transitionCallback = addEventListenerSpy.mock.calls[0][1];
        uiManager.messageElement.style.opacity = '0';
        transitionCallback();

        expect(uiManager.messageElement.style.visibility).toBe('hidden');
        expect(uiManager.messageElement.classList.contains('visible')).toBe(false);
      });
    });
  });

  describe('delegated methods', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockGame);
      uiManager.init();
    });

    test('updateScore should delegate to scoreOverlay', () => {
      uiManager.updateScore();
      expect(uiManager.scoreOverlay.updateScore).toHaveBeenCalled();
    });

    test('updateHoleInfo should delegate to scoreOverlay', () => {
      uiManager.updateHoleInfo();
      expect(uiManager.scoreOverlay.updateHoleInfo).toHaveBeenCalled();
    });

    test('updateStrokes should delegate to scoreOverlay', () => {
      uiManager.updateStrokes();
      expect(uiManager.scoreOverlay.updateStrokes).toHaveBeenCalled();
    });

    test('updateDebugDisplay should delegate to debugOverlay', () => {
      const debugInfo = { test: 'data' };
      uiManager.updateDebugDisplay(debugInfo);
      expect(uiManager.debugOverlay.updateDebugDisplay).toHaveBeenCalledWith(debugInfo);
    });

    test('showFinalScorecard should delegate to scoreOverlay', () => {
      uiManager.showFinalScorecard();
      expect(uiManager.scoreOverlay.showFinalScorecard).toHaveBeenCalled();
    });

    test('hideFinalScorecard should delegate to scoreOverlay', () => {
      uiManager.hideFinalScorecard();
      expect(uiManager.scoreOverlay.hideFinalScorecard).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockGame);
      uiManager.init();
    });

    test('should cleanup all UI elements and subscriptions', () => {
      // Create mock unsubscribe function that will be added to eventSubscriptions
      const mockUnsubscribe = jest.fn();
      uiManager.eventSubscriptions = [mockUnsubscribe];
      uiManager.messageTimeout = 'timeout-id';

      // Verify initial state - overlays should be created
      expect(uiManager.scoreOverlay).toBeTruthy();
      expect(uiManager.debugOverlay).toBeTruthy();

      uiManager.cleanup();

      expect(uiManager.scoreOverlay).toBeNull();
      expect(uiManager.debugOverlay).toBeNull();
      expect(global.clearTimeout).toHaveBeenCalledWith('timeout-id');
      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(uiManager.eventSubscriptions).toEqual([]);

      // Check properties are reset
      expect(uiManager.messageElement).toBeNull();
      expect(uiManager.powerIndicator).toBeNull();
      expect(uiManager.uiContainer).toBeNull();
      expect(uiManager.messageTimeout).toBeNull();
    });

    test('should handle cleanup with missing elements gracefully', () => {
      uiManager.scoreOverlay = null;
      uiManager.debugOverlay = null;
      uiManager.messageElement = null;
      uiManager.powerIndicator = null;
      uiManager.uiContainer = null;

      expect(() => {
        uiManager.cleanup();
      }).not.toThrow();
    });

    test('should handle unsubscription errors', () => {
      const failingUnsubscribe = jest.fn(() => {
        throw new Error('Unsubscribe failed');
      });
      uiManager.eventSubscriptions = [failingUnsubscribe];

      uiManager.cleanup();

      expect(console.warn).toHaveBeenCalledWith(
        '[UIManager.cleanup] Error unsubscribing from an event:',
        expect.any(Error)
      );
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockGame);
    });

    test('should handle complete initialization and cleanup cycle', () => {
      // Initialize
      uiManager.init();
      expect(uiManager.uiContainer).toBeTruthy();
      expect(uiManager.scoreOverlay).toBeTruthy();

      // Show a message
      uiManager.showMessage('Test message', 1000);
      expect(uiManager.isShowingMessage).toBe(true);

      // Cleanup
      uiManager.cleanup();
      expect(uiManager.uiContainer).toBeNull();
      expect(uiManager.scoreOverlay).toBeNull();
    });

    test('should handle renderer attachment after initialization', () => {
      uiManager.init();

      const mockRenderer = {
        domElement: document.createElement('canvas')
      };

      uiManager.attachRenderer(mockRenderer);

      expect(uiManager.renderer).toBe(mockRenderer);
      expect(document.getElementById('game-container')).toBeTruthy();
    });

    test('should handle event workflow for hole completion', () => {
      uiManager.init();
      const showMessageSpy = jest.spyOn(uiManager, 'showMessage').mockImplementation(() => {});

      const mockEvent = {
        get: jest.fn(key => (key === 'holeNumber' ? 1 : null))
      };

      uiManager.handleHoleCompleted(mockEvent);

      expect(showMessageSpy).toHaveBeenCalled();
      expect(uiManager.scoreOverlay.updateScore).toHaveBeenCalled();

      showMessageSpy.mockRestore();
    });
  });
});
