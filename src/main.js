import { Game } from './scenes/Game';
import './utils/styles.css';

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
            playCourseButton.addEventListener('click', () => this.startCourse());
        }
    }
    
    startCourse() {
        // Hide the menu screen
        if (this.menuScreen) {
            this.menuScreen.style.display = 'none';
        }
        
        // Initialize the game if not already initialized
        if (!this.isGameRunning) {
            this.init();
            this.isGameRunning = true;
        }
        
        // Enable game input
        this.game.enableGameInput();
    }

    init() {
        // Initialize the game
        this.game.init();
        
        // Game handles its own animation loop, so we don't need to start one here
    }
}

// Start the application when the window loads
window.addEventListener('load', () => {
    new App();
}); 