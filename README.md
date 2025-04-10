# Mini Golf Break - A 3D Mini Golf Game

**Mini Golf Break** is a simple yet engaging 3D mini-golf game built with Three.js for graphics and Cannon-es for physics simulation. Enjoy a relaxing break with intuitive controls and progressively challenging holes.

## Features

*   **3D Graphics:** Clean and simple low-poly aesthetics using Three.js.
*   **Realistic Physics:** Accurate ball rolling, bouncing, and interactions powered by Cannon-es.
*   **Intuitive Controls:** Simple click-and-drag aiming and power control.
*   **Multiple Holes:** Includes a basic 3-hole test course (`BasicCourse`) and scaffolding for a full 9-hole course (`NineHoleCourse`).
*   **Configurable Hazards:** Easily define sand traps and water hazards with various shapes (circles, rectangles, compound shapes!) via configuration.
*   **Hazard Penalties:** Water hazards apply a one-stroke penalty and reset the ball to the last hit position.
*   **Improved Hole Physics:** Ball entry logic considers speed and overlap for more realistic interactions (including high-speed rejections).
*   **Bunker Effects:** Ball experiences increased drag when rolling through sand traps.
*   **Dynamic Camera:** Camera actively follows the ball with intelligent positioning based on ball movement direction and speed.
*   **Custom Hole Layouts:** Supports standard rectangular holes and custom shapes (like L-shapes) using boundary wall definitions.
*   **Scoring System:** Tracks strokes per hole and total score.
*   **Basic UI:** Displays current hole, stroke count, and total score.
*   **In-World Ad System:** Features dynamic ad ships (NASA, Alien, Station types) flying beneath the course, displaying dynamically generated, clickable banners that rotate to face the player.
*   **AdSense Integration:** Includes standard Google AdSense script and placeholder for HTML overlay ads (e.g., bottom banner) separate from the in-game AdShips.
*   **Debug Mode:** Includes physics debugging visuals (toggle with 'd') and Ad Inspect mode (toggle with 'i').

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd mini-golf-break
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the development server:**
    ```bash
    npm start
    ```
4.  Open your browser to `http://localhost:8080` (or the specified port).

## How to Play

1.  **Aim:** Click and hold the left mouse button on the golf ball.
2.  **Set Power:** Drag the mouse backward away from the direction you want to shoot. The further you drag, the more power you apply (indicated by the aiming line).
3.  **Shoot:** Release the mouse button to hit the ball.
4.  **Goal:** Get the ball into the hole in the fewest strokes possible.
5.  Navigate through the different holes using the UI prompts after completing each hole.
6.  **(Optional) Click Ads:** Clicking on an ad ship's banner during gameplay will open its link in a new tab and cancel the current shot action.
7.  **(Optional) Inspect Ads:** Press the 'i' key to toggle Ad Inspect mode. In this mode, camera controls are enabled. Press 'i' again to return to aiming mode. *Note: Clicking ads works outside this mode too.*

## Development

See the [DEVELOPMENT_GUIDE.md](docs/development-guide.md) for details on the project structure, key components, and how to extend the game.

## Contributing

Contributions are welcome! Please follow standard fork-and-pull-request workflows.

## License

This project is open-source (specify license if applicable, e.g., MIT License).