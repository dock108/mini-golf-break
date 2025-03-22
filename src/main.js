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
        // Add click event for the start practice button
        const startPracticeButton = document.getElementById('start-practice');
        if (startPracticeButton) {
            startPracticeButton.addEventListener('click', () => this.startPractice());
        }
        
        // Add click event for the play course button
        const playCourseButton = document.getElementById('play-course');
        if (playCourseButton) {
            playCourseButton.addEventListener('click', () => this.startCourse());
        }
        
        // Add click event for the pause button
        const pauseButton = document.getElementById('pause-button');
        if (pauseButton) {
            pauseButton.addEventListener('click', () => this.pauseGame());
        }
    }

    startPractice() {
        // Hide the menu screen
        if (this.menuScreen) {
            this.menuScreen.style.display = 'none';
            
            // Restore original title for next time
            const titleElement = this.menuScreen.querySelector('h1');
            if (titleElement && titleElement.textContent === 'Paused') {
                titleElement.textContent = 'Mini Golf Break';
            }
            
            // Restore original button text
            const startPracticeButton = document.getElementById('start-practice');
            if (startPracticeButton && startPracticeButton.textContent === 'Resume Game') {
                startPracticeButton.textContent = 'Start Practice';
            }
        }
        
        // Initialize the game if not already initialized
        if (!this.isGameRunning) {
            this.init('practice');
            this.isGameRunning = true;
        }
        
        // Enable game input
        this.game.enableGameInput();
    }
    
    startCourse() {
        // Hide the menu screen
        if (this.menuScreen) {
            this.menuScreen.style.display = 'none';
        }
        
        // Initialize the game with course mode if not already initialized
        if (!this.isGameRunning) {
            this.init('course');
            this.isGameRunning = true;
        } else {
            // If game is already running, switch to course mode
            this.game.setCourseMode('basic');
        }
        
        // Enable game input
        this.game.enableGameInput();
    }
    
    pauseGame() {
        // Show the menu screen
        if (this.menuScreen) {
            this.menuScreen.style.display = 'flex';
            
            // Change title to show "Paused" instead of "Mini Golf Break"
            const titleElement = this.menuScreen.querySelector('h1');
            if (titleElement) {
                titleElement.textContent = 'Paused';
            }
            
            // Change button text to "Resume Game"
            const startPracticeButton = document.getElementById('start-practice');
            if (startPracticeButton) {
                startPracticeButton.textContent = 'Resume Game';
            }
        }
        
        // Disable game input
        if (this.game && this.game.inputController) {
            this.game.inputController.disableInput();
        }
    }

    init(mode = 'practice') {
        // Initialize the game with the specified mode
        this.game.init(mode);
        
        // Start the game loop
        this.animate();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.game.update();
    }
}

// Start the application when the window loads
window.addEventListener('load', () => {
    new App();
}); 