# File Structure Documentation for Mini Golf Break

This document describes the recommended file structure for the **Mini Golf Break** project, following industry best practices for JavaScript-based game development using Three.js and Cannon-es.

## Project Root

```
mini-golf-break/
├── src/                      # Source code for the game
│   ├── main.js               # Main entry point initializing the app
│   ├── physics/              # Physics engine setup and logic
│   │   └── physicsEngine.js
│   ├── controls/             # Input handling and camera control logic
│   │   └── inputControls.js
│   ├── scenes/               # Scene setup and management
│   │   └── initialScene.js
│   ├── objects/              # Game object classes (combining meshes and physics bodies)
│   └── utils/                # Utility functions and helpers
├── assets/                   # Non-code assets
│   ├── models/               # 3D models
│   ├── textures/             # Textures and images
│   └── audio/                # Sound effects
├── public/                   # Static files for serving (HTML, CSS, bundled JS)
│   ├── index.html            # HTML entry point
│   └── style.css             # Global styles
├── test/                     # Automated tests (unit and integration)
│   └── physics.test.js       # Example test file
├── sandbox/                  # Experimental and AI-generated content
├── docs/                     # Additional detailed documentation
│   └── architecture.md       # System architecture documentation
├── .github/                  # GitHub configurations (Actions, templates)
│   └── workflows/            # CI/CD workflows (if needed)
├── package.json              # Project metadata and dependencies
├── README.md                 # Main project documentation (overview, setup)
├── LICENSE                   # License file (if applicable)
├── .gitignore                # Ignore file for node_modules, build files, etc.
└── webpack.config.js         # Webpack configuration
```

## Folder Descriptions

### `/src`
Contains all game-related JavaScript code, organized by functionality.

### `/assets`
Stores all non-code resources required for gameplay, such as models, textures, and audio files.

### `/public`
Holds static files like HTML, CSS, and bundled JS files, which are used during development and production deployment.

### `/test`
Dedicated to automated tests, ensuring code reliability and ease of future development.

### `/sandbox`
Used for experimenting and testing new ideas or AI-generated content without affecting main project code.

### `/docs`
Additional detailed documentation about project architecture, system design, and implementation details.

### `/.github`
Configuration for GitHub actions, workflows, and issue/pull request templates.

## Best Practices

- **Keep modular:** Group related code logically (physics, controls, etc.) for easy maintenance.
- **Centralize environment configuration:** Use Webpack to handle dev vs. production builds.
- **Testing as you go:** Maintain a robust test suite in the `/test` folder to catch regressions early.
- **Sandbox new ideas:** Keep experimental features separate in `/sandbox`.
- **Document consistently:** Regularly update `README.md` and maintain additional documentation in `/docs`.

This file structure is designed for clarity, scalability, and ease of collaboration throughout development.
