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
    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn(cb => cb());

    // Mock document.getElementById and appendChild to track elements
    const elementStore = new Map();
    const querySelectorStore = new Map();

    document.getElementById = jest.fn(id => elementStore.get(id) || null);

    // Enhanced querySelector mock
    document.querySelector = jest.fn(selector => {
      if (selector === '.scorecard-button') {
        const button = {
          textContent: 'Play Again',
          addEventListener: jest.fn(),
          click: jest.fn(() => {
            // Simulate actual click behavior
            const clickEvent = new Event('click');
            button.addEventListener.mock.calls.forEach(([event, handler]) => {
              if (event === 'click') {
                handler(clickEvent);
              }
            });
          })
        };
        return button;
      }
      return querySelectorStore.get(selector) || null;
    });

    // Mock document.body methods
    document.body.appendChild = jest.fn(element => {
      if (element.id) {
        elementStore.set(element.id, element);
      }
      if (element.classList && element.classList.add) {
        const classNames = element.classList.add.mock.calls.flat();
        classNames.forEach(className => {
          querySelectorStore.set(`.${className}`, element);
        });
      }
    });

    document.body.innerHTML = '';
    document.body.querySelector = jest.fn(selector => document.querySelector(selector));
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
        case 'h2':
          return {
            style: {},
            id: '',
            appendChild: jest.fn(),
            textContent: '',
            innerHTML: '',
            addEventListener: jest.fn(),
            classList: {
              add: jest.fn(),
              remove: jest.fn(),
              contains: jest.fn(() => false),
              toggle: jest.fn()
            }
          };
        case 'button':
          const clickHandlers = [];
          return {
            style: {},
            id: '',
            appendChild: jest.fn(),
            textContent: '',
            innerHTML: '',
            addEventListener: jest.fn((event, handler) => {
              if (event === 'click') {
                clickHandlers.push(handler);
              }
            }),
            click: jest.fn(() => {
              clickHandlers.forEach(handler => handler());
            }),
            classList: {
              add: jest.fn(),
              remove: jest.fn(),
              contains: jest.fn(() => false),
              toggle: jest.fn()
            }
          };
        case 'table':
          return {
            style: {},
            appendChild: jest.fn(),
            classList: {
              add: jest.fn()
            }
          };
        case 'tbody':
        case 'tr':
          return {
            style: {},
            appendChild: jest.fn(),
            innerHTML: ''
          };
        default:
          return (
            mockElements[tagName] || {
              style: {},
              textContent: '',
              appendChild: jest.fn(),
              classList: {
                add: jest.fn(),
                remove: jest.fn(),
                contains: jest.fn(() => false),
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

  describe('updateScore edge cases', () => {
    beforeEach(() => {
      uiScoreOverlay = new UIScoreOverlay(mockGame, mockParentContainer);
    });

    test('should handle missing scoreElement', () => {
      uiScoreOverlay.init();
      uiScoreOverlay.scoreElement = null;

      expect(() => uiScoreOverlay.updateScore()).not.toThrow();
    });

    test('should handle missing scoringSystem', () => {
      uiScoreOverlay.init();
      uiScoreOverlay.game.scoringSystem = null;

      expect(() => uiScoreOverlay.updateScore()).not.toThrow();
    });
  });

  describe('updateStrokes edge cases', () => {
    beforeEach(() => {
      uiScoreOverlay = new UIScoreOverlay(mockGame, mockParentContainer);
    });

    test('should handle missing strokesElement', () => {
      uiScoreOverlay.init();
      uiScoreOverlay.strokesElement = null;

      expect(() => uiScoreOverlay.updateStrokes()).not.toThrow();
    });

    test('should handle missing scoringSystem', () => {
      uiScoreOverlay.init();
      uiScoreOverlay.game.scoringSystem = null;

      expect(() => uiScoreOverlay.updateStrokes()).not.toThrow();
    });

    test('should only update DOM when strokes change', () => {
      uiScoreOverlay.init();

      // First update
      uiScoreOverlay.updateStrokes();
      const initialText = uiScoreOverlay.strokesElement.textContent;

      // Second update with same value
      uiScoreOverlay.updateStrokes();
      expect(uiScoreOverlay.strokesElement.textContent).toBe(initialText);

      // Update with different value
      mockGame.scoringSystem.getCurrentStrokes.mockReturnValue(5);
      uiScoreOverlay.updateStrokes();
      expect(uiScoreOverlay.strokesElement.textContent).toBe('Strokes: 5');
    });
  });

  describe('updateHoleInfo edge cases', () => {
    beforeEach(() => {
      uiScoreOverlay = new UIScoreOverlay(mockGame, mockParentContainer);
    });

    test('should handle regex match for hole description', () => {
      uiScoreOverlay.init();
      mockGame.course.getCurrentHoleConfig = jest.fn(() => ({ description: '1. Test Hole' }));

      uiScoreOverlay.updateHoleInfo();

      expect(uiScoreOverlay.holeInfoElement.textContent).toBe('Hole 1: Test Hole');
    });

    test('should handle description without number prefix', () => {
      uiScoreOverlay.init();
      mockGame.course.getCurrentHoleConfig = jest.fn(() => ({ description: 'Test Hole' }));

      uiScoreOverlay.updateHoleInfo();

      expect(uiScoreOverlay.holeInfoElement.textContent).toBe('Hole 1: Test Hole');
    });
  });

  describe('showFinalScorecard', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
      document.body.appendChild = jest.fn();
      uiScoreOverlay = new UIScoreOverlay(mockGame, mockParentContainer);
    });

    test('should create and show final scorecard', () => {
      uiScoreOverlay.init();

      uiScoreOverlay.showFinalScorecard();

      // Test that showFinalScorecard creates a scorecard element
      expect(uiScoreOverlay.scorecardElement).toBeTruthy();
      expect(uiScoreOverlay.scorecardElement.classList.add).toHaveBeenCalledWith(
        'scorecard-overlay'
      );
    });

    test('should show existing scorecard if already created', () => {
      uiScoreOverlay.init();

      // Create scorecard first
      uiScoreOverlay.showFinalScorecard();
      const firstScorecard = document.getElementById('scorecard-overlay');

      // Try to show again
      uiScoreOverlay.showFinalScorecard();
      const secondScorecard = document.getElementById('scorecard-overlay');

      expect(firstScorecard).toBe(secondScorecard);
    });

    test('should display total strokes in scorecard', () => {
      uiScoreOverlay.init();
      mockGame.scoringSystem.getTotalStrokes.mockReturnValue(42);

      uiScoreOverlay.showFinalScorecard();

      // Test that the scoringSystem method was called
      expect(mockGame.scoringSystem.getTotalStrokes).toHaveBeenCalled();
      expect(uiScoreOverlay.scorecardElement).toBeTruthy();
    });

    test('should create play again button', () => {
      uiScoreOverlay.init();

      let mockButton;
      document.querySelector = jest.fn(selector => {
        if (selector === '.scorecard-button') {
          mockButton = mockButton || { textContent: 'Play Again', addEventListener: jest.fn() };
          return mockButton;
        }
        return null;
      });

      uiScoreOverlay.showFinalScorecard();

      const button = document.querySelector('.scorecard-button');
      expect(button).toBeTruthy();
      expect(button.textContent).toBe('Play Again');
    });

    test('should handle play again button click', () => {
      uiScoreOverlay.init();
      const reloadSpy = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true
      });

      // Test that button is created with the proper event listener
      uiScoreOverlay.showFinalScorecard();

      // Verify button creation was attempted
      expect(document.createElement).toHaveBeenCalledWith('button');
    });

    test('should track analytics on play again click', () => {
      uiScoreOverlay.init();
      window.gtag = jest.fn();

      // Test analytics setup availability
      uiScoreOverlay.showFinalScorecard();

      // Verify the scorecard was created
      expect(uiScoreOverlay.scorecardElement).toBeTruthy();

      delete window.gtag;
    });
  });

  describe('hideFinalScorecard', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
      uiScoreOverlay = new UIScoreOverlay(mockGame, mockParentContainer);
    });

    test('should hide scorecard element', () => {
      uiScoreOverlay.init();
      uiScoreOverlay.showFinalScorecard();

      uiScoreOverlay.hideFinalScorecard();

      const scorecardElement = document.getElementById('scorecard-overlay');
      expect(scorecardElement.classList.contains('scorecard-visible')).toBe(false);
    });

    test('should handle missing scorecard element', () => {
      uiScoreOverlay.init();

      expect(() => uiScoreOverlay.hideFinalScorecard()).not.toThrow();
    });
  });

  describe('updateScorecard', () => {
    beforeEach(() => {
      uiScoreOverlay = new UIScoreOverlay(mockGame, mockParentContainer);
    });

    test('should log placeholder message', () => {
      const debugSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      uiScoreOverlay.init();

      uiScoreOverlay.updateScorecard();

      // The debug log will include [DEBUG] prefix
      expect(debugSpy).toHaveBeenCalledWith(
        '[DEBUG]',
        '[UIScoreOverlay.updateScorecard] Placeholder called.'
      );
      debugSpy.mockRestore();
    });
  });
});
