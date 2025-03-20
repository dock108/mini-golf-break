import { Game } from './scenes/Game';
import './utils/styles.css';

class App {
    constructor() {
        this.game = new Game();
        this.init();
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