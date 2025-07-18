import { Game } from './scenes/Game';
import '../public/style.css';

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

// Start the application when the window loads
window.addEventListener('load', () => {
  window.App = new App();
  // Also expose game for easier testing access
  window.game = window.App.game;
});
