/**
 * Unit tests for UIDebugOverlay
 */

import { UIDebugOverlay } from '../../../managers/ui/UIDebugOverlay';
import { debug } from '../../../utils/debug';

// Mock debug utility
jest.mock('../../../utils/debug', () => ({
  debug: {
    log: jest.fn()
  }
}));

describe('UIDebugOverlay', () => {
  let uiDebugOverlay;
  let mockGame;
  let mockParentContainer;
  let mockDebugElement;

  beforeEach(() => {
    // Mock game object
    mockGame = {
      debugManager: {
        enabled: false
      }
    };

    // Mock DOM elements
    mockDebugElement = {
      style: { display: 'none' },
      classList: {
        add: jest.fn()
      },
      remove: jest.fn(),
      innerHTML: ''
    };

    // Mock parent container
    mockParentContainer = {
      querySelector: jest.fn(() => null),
      appendChild: jest.fn()
    };

    // Mock document.createElement
    document.createElement = jest.fn(() => mockDebugElement);

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with game and parent container', () => {
      uiDebugOverlay = new UIDebugOverlay(mockGame, mockParentContainer);

      expect(uiDebugOverlay.game).toBe(mockGame);
      expect(uiDebugOverlay.parentContainer).toBe(mockParentContainer);
      expect(uiDebugOverlay.debugElement).toBe(null);
      expect(uiDebugOverlay.DEBUG_OVERLAY_CLASS).toBe('debug-overlay');
    });
  });

  describe('init', () => {
    beforeEach(() => {
      uiDebugOverlay = new UIDebugOverlay(mockGame, mockParentContainer);
    });

    test('should create debug element if it does not exist', () => {
      uiDebugOverlay.init();

      expect(mockParentContainer.querySelector).toHaveBeenCalledWith('.debug-overlay');
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(mockDebugElement.classList.add).toHaveBeenCalledWith('debug-overlay');
      expect(mockParentContainer.appendChild).toHaveBeenCalledWith(mockDebugElement);
      expect(mockDebugElement.style.display).toBe('none');
      expect(debug.log).toHaveBeenCalledWith('[UIDebugOverlay] Initialized.');
    });

    test('should use existing debug element if found', () => {
      const existingElement = {
        style: { display: 'block' },
        classList: { add: jest.fn() }
      };
      mockParentContainer.querySelector.mockReturnValue(existingElement);

      uiDebugOverlay.init();

      expect(mockParentContainer.querySelector).toHaveBeenCalledWith('.debug-overlay');
      expect(document.createElement).not.toHaveBeenCalled();
      expect(mockParentContainer.appendChild).not.toHaveBeenCalled();
      expect(existingElement.style.display).toBe('none');
      expect(uiDebugOverlay.debugElement).toBe(existingElement);
    });
  });

  describe('updateDebugDisplay', () => {
    beforeEach(() => {
      uiDebugOverlay = new UIDebugOverlay(mockGame, mockParentContainer);
      uiDebugOverlay.init();
    });

    test('should return early if debug element does not exist', () => {
      uiDebugOverlay.debugElement = null;

      uiDebugOverlay.updateDebugDisplay({ fps: 60 });

      expect(mockDebugElement.innerHTML).toBe('');
    });

    test('should hide overlay when debug manager is disabled', () => {
      mockGame.debugManager.enabled = false;
      mockDebugElement.style.display = 'block';

      uiDebugOverlay.updateDebugDisplay({ fps: 60 });

      expect(mockDebugElement.style.display).toBe('none');
      expect(debug.log).toHaveBeenCalledWith('[UIDebugOverlay] Hiding debug overlay.');
    });

    test('should not log when already hidden and debug is disabled', () => {
      mockGame.debugManager.enabled = false;
      mockDebugElement.style.display = 'none';

      uiDebugOverlay.updateDebugDisplay({ fps: 60 });

      expect(mockDebugElement.style.display).toBe('none');
      expect(debug.log).not.toHaveBeenCalledWith('[UIDebugOverlay] Hiding debug overlay.');
    });

    test('should show overlay when debug manager is enabled', () => {
      mockGame.debugManager.enabled = true;
      mockDebugElement.style.display = 'none';

      uiDebugOverlay.updateDebugDisplay({ fps: 60 });

      expect(mockDebugElement.style.display).toBe('block');
      expect(debug.log).toHaveBeenCalledWith('[UIDebugOverlay] Showing debug overlay.');
    });

    test('should format and display debug info with numbers', () => {
      mockGame.debugManager.enabled = true;

      const debugInfo = {
        fps: 60.123456,
        strokeCount: 3,
        timeElapsed: 45.6789
      };

      uiDebugOverlay.updateDebugDisplay(debugInfo);

      expect(mockDebugElement.innerHTML).toContain('<strong>fps:</strong> 60.12');
      expect(mockDebugElement.innerHTML).toContain('<strong>strokeCount:</strong> 3.00');
      expect(mockDebugElement.innerHTML).toContain('<strong>timeElapsed:</strong> 45.68');
    });

    test('should format and display debug info with Vector3-like objects', () => {
      mockGame.debugManager.enabled = true;

      const debugInfo = {
        ballPosition: { x: 1.234, y: 2.567, z: 3.891 },
        velocity: { x: -0.123, y: 0, z: 0.456 }
      };

      uiDebugOverlay.updateDebugDisplay(debugInfo);

      expect(mockDebugElement.innerHTML).toContain(
        '<strong>ballPosition:</strong> (1.23, 2.57, 3.89)'
      );
      expect(mockDebugElement.innerHTML).toContain(
        '<strong>velocity:</strong> (-0.12, 0.00, 0.46)'
      );
    });

    test('should format and display debug info with other objects', () => {
      mockGame.debugManager.enabled = true;

      const debugInfo = {
        gameState: { state: 'playing', level: 3 },
        flags: { isActive: true, isPaused: false }
      };

      uiDebugOverlay.updateDebugDisplay(debugInfo);

      expect(mockDebugElement.innerHTML).toContain(
        '<strong>gameState:</strong> {"state":"playing","level":3}'
      );
      expect(mockDebugElement.innerHTML).toContain(
        '<strong>flags:</strong> {"isActive":true,"isPaused":false}'
      );
    });

    test('should handle null values in debug info', () => {
      mockGame.debugManager.enabled = true;

      const debugInfo = {
        nullValue: null,
        undefinedValue: undefined,
        stringValue: 'test'
      };

      uiDebugOverlay.updateDebugDisplay(debugInfo);

      expect(mockDebugElement.innerHTML).toContain('<strong>nullValue:</strong> null');
      expect(mockDebugElement.innerHTML).toContain('<strong>undefinedValue:</strong> undefined');
      expect(mockDebugElement.innerHTML).toContain('<strong>stringValue:</strong> test');
    });

    test('should handle missing debugManager', () => {
      mockGame.debugManager = null;
      mockDebugElement.style.display = 'block';

      uiDebugOverlay.updateDebugDisplay({ fps: 60 });

      expect(mockDebugElement.style.display).toBe('none');
    });

    test('should handle debugManager without enabled property', () => {
      mockGame.debugManager = {};
      mockDebugElement.style.display = 'block';

      uiDebugOverlay.updateDebugDisplay({ fps: 60 });

      expect(mockDebugElement.style.display).toBe('none');
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      uiDebugOverlay = new UIDebugOverlay(mockGame, mockParentContainer);
      uiDebugOverlay.init();
    });

    test('should remove debug element and reset reference', () => {
      uiDebugOverlay.cleanup();

      expect(mockDebugElement.remove).toHaveBeenCalled();
      expect(uiDebugOverlay.debugElement).toBe(null);
      expect(debug.log).toHaveBeenCalledWith('[UIDebugOverlay] Cleaned up.');
    });

    test('should handle cleanup when debug element is already null', () => {
      uiDebugOverlay.debugElement = null;

      uiDebugOverlay.cleanup();

      expect(debug.log).toHaveBeenCalledWith('[UIDebugOverlay] Cleaned up.');
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      uiDebugOverlay = new UIDebugOverlay(mockGame, mockParentContainer);
    });

    test('should handle complete lifecycle', () => {
      // Initialize
      uiDebugOverlay.init();
      expect(uiDebugOverlay.debugElement).toBeDefined();

      // Update while disabled - should stay hidden
      uiDebugOverlay.updateDebugDisplay({ fps: 30 });
      expect(mockDebugElement.style.display).toBe('none');

      // Enable debug mode
      mockGame.debugManager.enabled = true;

      // Update with various data
      uiDebugOverlay.updateDebugDisplay({
        fps: 60,
        position: { x: 10, y: 5, z: 15 },
        score: 42
      });
      expect(mockDebugElement.style.display).toBe('block');
      expect(mockDebugElement.innerHTML).toContain('60.00');
      expect(mockDebugElement.innerHTML).toContain('(10.00, 5.00, 15.00)');
      expect(mockDebugElement.innerHTML).toContain('42.00');

      // Disable debug mode
      mockGame.debugManager.enabled = false;
      uiDebugOverlay.updateDebugDisplay({ fps: 45 });
      expect(mockDebugElement.style.display).toBe('none');

      // Cleanup
      uiDebugOverlay.cleanup();
      expect(uiDebugOverlay.debugElement).toBe(null);
    });

    test('should handle rapid enable/disable toggles', () => {
      uiDebugOverlay.init();

      // Toggle debug mode rapidly
      for (let i = 0; i < 5; i++) {
        mockGame.debugManager.enabled = true;
        uiDebugOverlay.updateDebugDisplay({ iteration: i });
        expect(mockDebugElement.style.display).toBe('block');

        mockGame.debugManager.enabled = false;
        uiDebugOverlay.updateDebugDisplay({ iteration: i });
        expect(mockDebugElement.style.display).toBe('none');
      }

      // Verify debug log was called appropriate number of times
      const showLogs = debug.log.mock.calls.filter(call =>
        call[0].includes('Showing debug overlay')
      );
      const hideLogs = debug.log.mock.calls.filter(call =>
        call[0].includes('Hiding debug overlay')
      );

      expect(showLogs.length).toBe(5);
      expect(hideLogs.length).toBe(5);
    });
  });
});
