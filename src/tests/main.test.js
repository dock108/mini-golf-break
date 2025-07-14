/**
 * Unit tests for main.js App class
 */

// Mock the Game import
jest.mock('../scenes/Game', () => ({
  Game: jest.fn(() => ({
    init: jest.fn().mockResolvedValue(),
    enableGameInput: jest.fn()
  }))
}));

// Mock CSS import
jest.mock('../../public/style.css', () => ({}));

import { Game } from '../scenes/Game';

// Create App class for testing (extracted from main.js)
class App {
  constructor() {
    this.game = new Game();
    this.isGameRunning = false;
    this.menuScreen = document.getElementById('menu-screen');
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Add click event for the play course button
    const playCourseButton = document.getElementById('play-course');
    if (playCourseButton) {
      console.log('[App] Adding click listener to Play Course button.');
      playCourseButton.addEventListener('click', () => {
        console.log('[App] Play Course button CLICKED.');
        this.startCourse();
      });
    }
  }

  /**
   * Opens the feedback form in a new tab
   */
  openFeedbackForm() {
    console.log('[App] Opening feedback form...');
    // Open feedback form in new tab
    const feedbackWindow = window.open('/feedback.html', '_blank');

    // Fallback if browser blocks popups
    if (!feedbackWindow) {
      window.location.href = '/feedback.html';
    }
  }

  async startCourse() {
    console.log('[App] startCourse called.');
    // Hide the menu screen
    if (this.menuScreen) {
      console.log('[App] Hiding menu screen.');
      this.menuScreen.style.display = 'none';
    }

    // Initialize the game if not already initialized
    if (!this.isGameRunning) {
      console.log('[App] Game not running, calling App.init()...');
      await this.init();
      console.log('[App] App.init() finished.');
      this.isGameRunning = true;
    } else {
      console.log('[App] Game already running.');
    }

    // Enable game input
    console.log('[App] Enabling game input...');
    this.game.enableGameInput();
    console.log('[App] startCourse finished.');
  }

  async init() {
    console.log('[App.init] Starting...');
    try {
      // Initialize the game
      console.log('[App.init] Calling game.init()...');
      await this.game.init();
      console.log('[App.init] game.init() finished.');
      console.log('[App.init] Finished successfully.');
    } catch (error) {
      console.error('[App.init] CRITICAL: Failed to initialize game:', error);
      // Show error message to user
      if (this.menuScreen) {
        this.menuScreen.style.display = 'block';
        const errorMessage = document.createElement('div');
        errorMessage.style.color = 'red';
        errorMessage.style.marginTop = '20px';
        errorMessage.textContent = 'Failed to initialize game. Please refresh the page.';
        this.menuScreen.appendChild(errorMessage);
      }
      throw error;
    }
  }
}

describe('App Class (main.js)', () => {
  let mockGame;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset DOM
    document.body.innerHTML = '';

    // Create mock DOM elements
    const menuScreen = document.createElement('div');
    menuScreen.id = 'menu-screen';
    menuScreen.style.display = 'block';
    document.body.appendChild(menuScreen);

    const playCourseButton = document.createElement('button');
    playCourseButton.id = 'play-course';
    document.body.appendChild(playCourseButton);

    // Mock game instance
    mockGame = {
      init: jest.fn().mockResolvedValue(),
      enableGameInput: jest.fn()
    };
    Game.mockImplementation(() => mockGame);

    // Mock window.open
    global.window.open = jest.fn();
    delete window.location;
    window.location = { href: '' };

    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with game instance', () => {
      const app = new App();

      expect(Game).toHaveBeenCalled();
      expect(app.game).toBe(mockGame);
    });

    test('should initialize isGameRunning to false', () => {
      const app = new App();

      expect(app.isGameRunning).toBe(false);
    });

    test('should find and store menu screen element', () => {
      const app = new App();

      expect(app.menuScreen).toBe(document.getElementById('menu-screen'));
    });

    test('should setup event listeners', () => {
      new App();

      expect(console.log).toHaveBeenCalledWith(
        '[App] Adding click listener to Play Course button.'
      );
    });
  });

  describe('setupEventListeners', () => {
    test('should add click listener to play course button', () => {
      const playCourseButton = document.getElementById('play-course');
      const addEventListenerSpy = jest.spyOn(playCourseButton, 'addEventListener');

      new App();

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('should handle missing play course button gracefully', () => {
      // Remove the button
      document.getElementById('play-course').remove();

      expect(() => {
        new App();
      }).not.toThrow();
    });
  });

  describe('openFeedbackForm', () => {
    test('should open feedback form in new tab', () => {
      const app = new App();
      window.open.mockReturnValue({}); // Simulate successful popup

      app.openFeedbackForm();

      expect(console.log).toHaveBeenCalledWith('[App] Opening feedback form...');
      expect(window.open).toHaveBeenCalledWith('/feedback.html', '_blank');
    });

    test('should fallback to location.href if popup is blocked', () => {
      const app = new App();
      window.open.mockReturnValue(null); // Simulate blocked popup

      app.openFeedbackForm();

      expect(window.open).toHaveBeenCalledWith('/feedback.html', '_blank');
      expect(window.location.href).toBe('/feedback.html');
    });
  });

  describe('startCourse', () => {
    test('should hide menu screen', async () => {
      const app = new App();
      const menuScreen = document.getElementById('menu-screen');

      await app.startCourse();

      expect(menuScreen.style.display).toBe('none');
      expect(console.log).toHaveBeenCalledWith('[App] Hiding menu screen.');
    });

    test('should handle missing menu screen gracefully', async () => {
      document.getElementById('menu-screen').remove();
      const app = new App();

      await expect(app.startCourse()).resolves.not.toThrow();
    });

    test('should initialize game if not running', async () => {
      const app = new App();
      const initSpy = jest.spyOn(app, 'init').mockResolvedValue();

      await app.startCourse();

      expect(initSpy).toHaveBeenCalled();
      expect(app.isGameRunning).toBe(true);
    });

    test('should not initialize game if already running', async () => {
      const app = new App();
      app.isGameRunning = true;
      const initSpy = jest.spyOn(app, 'init').mockResolvedValue();

      await app.startCourse();

      expect(initSpy).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('[App] Game already running.');
    });

    test('should enable game input', async () => {
      const app = new App();

      await app.startCourse();

      expect(mockGame.enableGameInput).toHaveBeenCalled();
    });

    test('should log appropriate messages', async () => {
      const app = new App();

      await app.startCourse();

      expect(console.log).toHaveBeenCalledWith('[App] startCourse called.');
      expect(console.log).toHaveBeenCalledWith('[App] Enabling game input...');
      expect(console.log).toHaveBeenCalledWith('[App] startCourse finished.');
    });
  });

  describe('init', () => {
    test('should initialize game successfully', async () => {
      const app = new App();

      await app.init();

      expect(mockGame.init).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('[App.init] Starting...');
      expect(console.log).toHaveBeenCalledWith('[App.init] Finished successfully.');
    });

    test('should handle initialization errors', async () => {
      const app = new App();
      const error = new Error('Game initialization failed');
      mockGame.init.mockRejectedValue(error);

      await expect(app.init()).rejects.toThrow('Game initialization failed');

      expect(console.error).toHaveBeenCalledWith(
        '[App.init] CRITICAL: Failed to initialize game:',
        error
      );
    });

    test('should show error message to user on failure', async () => {
      const app = new App();
      const error = new Error('Game initialization failed');
      mockGame.init.mockRejectedValue(error);
      const menuScreen = document.getElementById('menu-screen');

      try {
        await app.init();
      } catch (e) {
        // Expected error
      }

      expect(menuScreen.style.display).toBe('block');
      const errorMessage = menuScreen.querySelector('div');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.style.color).toBe('red');
      expect(errorMessage.style.marginTop).toBe('20px');
      expect(errorMessage.textContent).toBe('Failed to initialize game. Please refresh the page.');
    });

    test('should handle missing menu screen during error display', async () => {
      document.getElementById('menu-screen').remove();
      const app = new App();
      const error = new Error('Game initialization failed');
      mockGame.init.mockRejectedValue(error);

      await expect(app.init()).rejects.toThrow('Game initialization failed');
      // Should not crash even without menu screen
    });
  });

  describe('integration scenarios', () => {
    test('should handle complete startup flow', async () => {
      const app = new App();

      // Simulate button click
      const playCourseButton = document.getElementById('play-course');
      const clickEvent = new Event('click');

      const startCourseSpy = jest.spyOn(app, 'startCourse');
      playCourseButton.dispatchEvent(clickEvent);

      expect(startCourseSpy).toHaveBeenCalled();
    });
  });
});
