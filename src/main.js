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
        // Add click event for the start game button
        const startButton = document.getElementById('start-game');
        if (startButton) {
            startButton.addEventListener('click', () => this.startGame());
        }
        
        // Add click event for the pause button
        const pauseButton = document.getElementById('pause-button');
        if (pauseButton) {
            pauseButton.addEventListener('click', () => this.pauseGame());
        }
    }

    startGame() {
        // Hide the menu screen
        if (this.menuScreen) {
            this.menuScreen.style.display = 'none';
            
            // Restore original title for next time
            const titleElement = this.menuScreen.querySelector('h1');
            if (titleElement && titleElement.textContent === 'Paused') {
                titleElement.textContent = 'Mini Golf Break';
            }
            
            // Restore original button text
            const startButton = document.getElementById('start-game');
            if (startButton && startButton.textContent === 'Resume Game') {
                startButton.textContent = 'Start Game';
            }
        }
        
        // Initialize the game if not already initialized
        if (!this.isGameRunning) {
            this.init();
            this.isGameRunning = true;
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
            const startButton = document.getElementById('start-game');
            if (startButton) {
                startButton.textContent = 'Resume Game';
            }
        }
        
        // Disable game input
        if (this.game && this.game.inputController) {
            this.game.inputController.disableInput();
        }
    }

    init() {
        // Initialize the game
        this.game.init();
        
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