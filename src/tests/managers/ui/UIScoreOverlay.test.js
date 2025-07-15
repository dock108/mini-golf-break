/**
 * Unit tests for UIScoreOverlay
 */

import { UIScoreOverlay } from '../../../managers/ui/UIScoreOverlay';

describe('UIScoreOverlay', () => {
  let mockGame;
  let mockParentContainer;
  let uiScoreOverlay;
  let mockElements;

  beforeEach(() => {
    // Mock DOM elements
    mockElements = {
      scoreContainer: {
        style: {},
        appendChild: jest.fn(),
        removeChild: jest.fn()
      },
      currentHoleElement: {
        textContent: '',
        style: {}
      },
      parElement: {
        textContent: '',
        style: {}
      },
      strokesElement: {
        textContent: '',
        style: {}
      },
      totalScoreElement: {
        textContent: '',
        style: {}
      }
    };

    // Mock document.createElement
    document.createElement = jest.fn(tagName => {
      switch (tagName) {
        case 'div':
          return {
            style: {},
            id: '',
            appendChild: jest.fn(),
            textContent: '',
            classList: {
              add: jest.fn(),
              remove: jest.fn(),
              contains: jest.fn(),
              toggle: jest.fn()
            }
          };
        default:
          return (
            mockElements[tagName] || {
              style: {},
              textContent: '',
              classList: {
                add: jest.fn(),
                remove: jest.fn(),
                contains: jest.fn(),
                toggle: jest.fn()
              }
            }
          );
      }
    });

    // Mock parent container
    mockParentContainer = {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      querySelector: jest.fn(() => null) // Returns null for top-right container query
    };

    // Mock game object
    mockGame = {
      stateManager: {
        state: {
          currentHoleNumber: 1
        },
        getTotalScore: jest.fn(() => 0)
      },
      course: {
        holes: [{ par: 3 }, { par: 4 }, { par: 5 }],
        getHolePar: jest.fn(hole => (hole < 3 ? hole + 3 : 5)),
        getCurrentHoleNumber: jest.fn(() => 1)
      },
      scoringSystem: {
        getStrokes: jest.fn(() => 0),
        getTotalScore: jest.fn(() => 0),
        getTotalStrokes: jest.fn(() => 0),
        getCurrentStrokes: jest.fn(() => 0)
      },
      debugManager: {
        log: jest.fn()
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with game and parent container', () => {
      uiScoreOverlay = new UIScoreOverlay(mockGame, mockParentContainer);

      expect(uiScoreOverlay.game).toBe(mockGame);
      expect(uiScoreOverlay.parentContainer).toBe(mockParentContainer);
      expect(uiScoreOverlay.scoreElement).toBe(null);
      expect(uiScoreOverlay.strokesElement).toBe(null);
      expect(uiScoreOverlay.holeInfoElement).toBe(null);
    });
  });

  describe('init', () => {
    beforeEach(() => {
      uiScoreOverlay = new UIScoreOverlay(mockGame, mockParentContainer);
    });

    test('should create score elements', () => {
      uiScoreOverlay.init();

      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(uiScoreOverlay.holeInfoElement).toBeDefined();
      expect(uiScoreOverlay.strokesElement).toBeDefined();
      expect(uiScoreOverlay.scoreElement).toBeDefined();
    });

    test('should add elements to parent container', () => {
      uiScoreOverlay.init();

      expect(mockParentContainer.appendChild).toHaveBeenCalled();
    });

    test('should update initial display', () => {
      uiScoreOverlay.init();

      expect(uiScoreOverlay.holeInfoElement.textContent).toContain('Hole');
      expect(uiScoreOverlay.strokesElement.textContent).toBe('Strokes: 0');
      expect(uiScoreOverlay.scoreElement.textContent).toBe('Total Strokes: 0');
    });
  });

  describe('updateHoleInfo', () => {
    beforeEach(() => {
      uiScoreOverlay = new UIScoreOverlay(mockGame, mockParentContainer);
      uiScoreOverlay.init();
    });

    test('should update hole number', () => {
      mockGame.course.getCurrentHoleNumber.mockReturnValue(5);

      uiScoreOverlay.updateHoleInfo();

      expect(uiScoreOverlay.holeInfoElement.textContent).toContain('Hole 5');
    });

    test('should update hole info correctly', () => {
      mockGame.course.getCurrentHoleNumber.mockReturnValue(2);

      uiScoreOverlay.updateHoleInfo();

      expect(uiScoreOverlay.holeInfoElement.textContent).toContain('Hole 2');
    });

    test('should handle missing course gracefully', () => {
      mockGame.course = null;

      expect(() => {
        uiScoreOverlay.updateHoleInfo();
      }).not.toThrow();
    });
  });

  describe('updateScore', () => {
    beforeEach(() => {
      uiScoreOverlay = new UIScoreOverlay(mockGame, mockParentContainer);
      uiScoreOverlay.init();
    });

    test('should update total strokes', () => {
      mockGame.scoringSystem.getTotalStrokes.mockReturnValue(15);

      uiScoreOverlay.updateScore();

      expect(uiScoreOverlay.scoreElement.textContent).toBe('Total Strokes: 15');
    });

    test('should display total strokes correctly', () => {
      mockGame.scoringSystem.getTotalStrokes.mockReturnValue(8);

      uiScoreOverlay.updateScore();

      expect(uiScoreOverlay.scoreElement.textContent).toBe('Total Strokes: 8');
    });
  });

  describe('updateStrokes', () => {
    beforeEach(() => {
      uiScoreOverlay = new UIScoreOverlay(mockGame, mockParentContainer);
      uiScoreOverlay.init();
    });

    test('should update strokes count', () => {
      mockGame.scoringSystem.getCurrentStrokes.mockReturnValue(3);

      uiScoreOverlay.updateStrokes();

      expect(uiScoreOverlay.strokesElement.textContent).toBe('Strokes: 3');
    });

    test('should handle zero strokes', () => {
      mockGame.scoringSystem.getCurrentStrokes.mockReturnValue(0);

      uiScoreOverlay.updateStrokes();

      expect(uiScoreOverlay.strokesElement.textContent).toBe('Strokes: 0');
    });
  });

  describe('visibility', () => {
    beforeEach(() => {
      uiScoreOverlay = new UIScoreOverlay(mockGame, mockParentContainer);
      uiScoreOverlay.init();
    });

    test('should show overlay', () => {
      uiScoreOverlay.hide();
      uiScoreOverlay.show();

      expect(uiScoreOverlay.scoreContainer.style.display).toBe('block');
    });

    test('should hide overlay', () => {
      uiScoreOverlay.hide();

      expect(uiScoreOverlay.scoreContainer.style.display).toBe('none');
    });

    test('should toggle visibility', () => {
      uiScoreOverlay.toggle();
      const firstState = uiScoreOverlay.scoreContainer.style.display;

      uiScoreOverlay.toggle();
      const secondState = uiScoreOverlay.scoreContainer.style.display;

      expect(firstState).not.toBe(secondState);
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      uiScoreOverlay = new UIScoreOverlay(mockGame, mockParentContainer);
      uiScoreOverlay.init();
    });

    test('should remove score container from parent', () => {
      uiScoreOverlay.cleanup();

      expect(mockParentContainer.removeChild).toHaveBeenCalled();
    });

    test('should clear references', () => {
      uiScoreOverlay.cleanup();

      expect(uiScoreOverlay.scoreContainer).toBe(null);
      expect(uiScoreOverlay.currentHoleElement).toBe(null);
      expect(uiScoreOverlay.parElement).toBe(null);
      expect(uiScoreOverlay.strokesElement).toBe(null);
      expect(uiScoreOverlay.totalScoreElement).toBe(null);
    });

    test('should handle cleanup without initialization', () => {
      uiScoreOverlay = new UIScoreOverlay(mockGame, mockParentContainer);

      expect(() => {
        uiScoreOverlay.cleanup();
      }).not.toThrow();
    });
  });

  describe('styling', () => {
    beforeEach(() => {
      uiScoreOverlay = new UIScoreOverlay(mockGame, mockParentContainer);
    });

    test('should apply proper CSS styles', () => {
      uiScoreOverlay.init();

      const containerStyle = uiScoreOverlay.scoreContainer.style;
      expect(containerStyle.position).toBe('absolute');
      expect(containerStyle.top).toBe('10px');
      expect(containerStyle.right).toBe('10px');
    });
  });
});
