import * as THREE from 'three';
import { InputController } from '../controls/InputController';
import { CameraController } from '../controls/CameraController';
import { ScoringSystem } from '../game/ScoringSystem';
// Both course types are available for debug mode
import { BasicCourse } from '../objects/BasicCourse';
import { NineHoleCourse } from '../objects/NineHoleCourse';
import { SpaceDecorations } from '../objects/SpaceDecorations';
import { EventTypes } from '../events/EventTypes';
import { GameState } from '../states/GameState';
import { CannonDebugRenderer } from '../utils/CannonDebugRenderer';
import { debug } from '../utils/debug';

// Import managers
import { StateManager } from '../managers/StateManager';
import { UIManager } from '../managers/UIManager';
import { PhysicsManager } from '../managers/PhysicsManager';
import { DebugManager } from '../managers/DebugManager';
import { AudioManager } from '../managers/AudioManager';
import { VisualEffectsManager } from '../managers/VisualEffectsManager';
import { BallManager } from '../managers/BallManager';
import { HazardManager } from '../managers/HazardManager';
import { HoleStateManager } from '../managers/HoleStateManager';
import { HoleTransitionManager } from '../managers/HoleTransitionManager';
import { HoleCompletionManager } from '../managers/HoleCompletionManager';
import { GameLoopManager } from '../managers/GameLoopManager';
import { EventManager } from '../managers/EventManager';
import { PerformanceManager } from '../managers/PerformanceManager';
import { MaterialManager } from '../managers/MaterialManager';
import { EnvironmentManager } from '../managers/EnvironmentManager';
import { PostProcessingManager } from '../managers/PostProcessingManager';

/**
 * Game - Main class that orchestrates the mini-golf game
 * Uses a component-based architecture with dedicated managers for different concerns
 */
export class Game {
  constructor() {
    // Core Three.js components
    this.scene = new THREE.Scene();
    this.renderer = null; // Will be initialized in init()

    // Create managers
    this.debugManager = new DebugManager(this);
    this.eventManager = new EventManager(this);
    this.performanceManager = new PerformanceManager(this);
    this.stateManager = new StateManager(this);
    this.uiManager = new UIManager(this);
    this.physicsManager = new PhysicsManager(this);
    this.audioManager = new AudioManager(this);
    this.visualEffectsManager = new VisualEffectsManager(this);
    this.ballManager = new BallManager(this);
    this.hazardManager = new HazardManager(this);
    this.holeStateManager = new HoleStateManager(this);
    this.holeTransitionManager = new HoleTransitionManager(this);
    this.holeCompletionManager = new HoleCompletionManager(this);
    this.gameLoopManager = new GameLoopManager(this);
    this.materialManager = new MaterialManager();
    this.environmentManager = new EnvironmentManager(this.scene, null); // renderer will be set later
    this.postProcessingManager = null; // Will be initialized after renderer

    this.cannonDebugRenderer = null;

    // Create camera controller
    this.cameraController = new CameraController(this);
    this.camera = this.cameraController.camera;

    // Create scoring system
    this.scoringSystem = new ScoringSystem(this);

    // Game objects (these aren't managers but specific game elements)
    this.course = null;
    this.spaceDecorations = null;

    // Lighting
    this.lights = {
      ambient: null,
      directionalLight: null
    };

    // Performance tracking
    this.clock = new THREE.Clock();
    this.deltaTime = 0;

    // Store bound event handlers
    this.boundHandleResize = null;
  }

  /**
   * Initialize the game
   */
  async init() {
    try {
      // Setup renderer first
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.setClearColor(0x000000); // Black background for space

      // Configure renderer for proper color management
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;

      // Initialize managers in appropriate order with proper dependency management

      // First tier - Core systems that don't depend on others
      this.debugManager.init();
      this.eventManager.init();

      // Second tier - Systems that depend only on core systems
      this.performanceManager.init();
      this.stateManager.resetState();

      // Attach renderer to DOM via UI manager
      this.uiManager.init();
      this.uiManager.attachRenderer(this.renderer);

      // Initialize visual enhancement managers now that renderer is ready
      this.environmentManager.renderer = this.renderer;
      await this.environmentManager.init();

      // Initialize post-processing manager
      this.postProcessingManager = new PostProcessingManager(
        this.renderer,
        this.scene,
        this.camera
      );

      // Remove manual starfield creation - handled by EnvironmentManager now
      // The environment manager will handle the scene background and starfield

      // Initialize camera controller after renderer is created
      this.cameraController.setRenderer(this.renderer);
      this.cameraController.init();

      // Third tier - Game systems that may depend on UI and rendering
      this.visualEffectsManager.init();
      this.physicsManager.init();
      this.audioManager.init();

      // Publish physics initialized event
      this.eventManager.publish(EventTypes.PHYSICS_INITIALIZED, { timestamp: Date.now() }, this);

      // Initialize the CannonDebugRenderer after physics manager
      this.cannonDebugRenderer = new CannonDebugRenderer(
        this.scene,
        this.physicsManager.cannonWorld
      );

      // Fourth tier - Game object managers that depend on physics and scene
      this.holeCompletionManager.init();
      this.hazardManager.init();
      this.visualEffectsManager.init();

      // Add space decorations
      this.spaceDecorations = new SpaceDecorations(this.scene);
      this.spaceDecorations.init();

      debug.log('[Game.init] Awaiting createCourse...');
      await this.createCourse();
      debug.log('[Game.init] createCourse finished.');

      // Initialize the ball manager after the course is created
      this.ballManager.init();

      // Setup lights
      this.setupLights();

      // Create input controller - depends on camera and ball
      this.inputController = new InputController(this);
      this.inputController.init();

      // Update UI with initial state
      this.uiManager.updateHoleInfo();
      this.uiManager.updateScore();
      this.uiManager.updateStrokes();

      // Add window resize listener
      try {
        this.boundHandleResize = this.handleResize.bind(this); // Store bound function
        window.addEventListener('resize', this.boundHandleResize);
      } catch (error) {
        this.debugManager.warn('Game.init', 'Failed to add resize event listener', error);
      }

      // Start the game loop last, after everything is initialized
      this.gameLoopManager.init();
      this.gameLoopManager.startLoop();

      // Publish game started event
      this.eventManager.publish(EventTypes.GAME_STARTED, { timestamp: Date.now() }, this);

      // Debug log that game was initialized
      this.debugManager.log('Game initialized');

      // Set up event listeners
      this.setupEventListeners();

      // Set game state to PLAYING after successful initialization
      this.stateManager.setGameState(GameState.PLAYING);

      // Publish game initialized event
      this.eventManager.publish(EventTypes.GAME_INITIALIZED, { timestamp: Date.now() }, this);
    } catch (error) {
      this.debugManager.error('Game.init', 'Failed to initialize game', error, true);
      console.error('CRITICAL: Failed to initialize game:', error);
    }
  }

  /**
   * Enable game input, used after unpausing
   */
  enableGameInput() {
    if (this.inputController) {
      this.inputController.enableInput();
    }
  }

  /**
   * Set up scene lights
   */
  setupLights() {
    // Add ambient light
    this.lights.ambient = new THREE.AmbientLight(0x404040, 1);
    this.scene.add(this.lights.ambient);

    // Store reference for EnvironmentManager
    this.scene.userData.ambientLight = this.lights.ambient;

    // Add directional light for shadows
    this.lights.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.lights.directionalLight.position.set(10, 20, 15);
    this.lights.directionalLight.castShadow = true;

    // Configure shadow settings
    this.lights.directionalLight.shadow.mapSize.width = 2048;
    this.lights.directionalLight.shadow.mapSize.height = 2048;
    this.lights.directionalLight.shadow.camera.near = 0.5;
    this.lights.directionalLight.shadow.camera.far = 50;
    this.lights.directionalLight.shadow.camera.left = -20;
    this.lights.directionalLight.shadow.camera.right = 20;
    this.lights.directionalLight.shadow.camera.top = 20;
    this.lights.directionalLight.shadow.camera.bottom = -20;

    this.scene.add(this.lights.directionalLight);
  }

  /**
   * Create the golf course environment
   */
  async createCourse() {
    try {
      debug.log('[Game.createCourse] Attempting to create the course...');

      // Ensure PhysicsManager is ready before creating the course
      if (!this.physicsManager || !this.physicsManager.getWorld()) {
        console.error('[Game.createCourse] PhysicsManager not ready. Aborting course creation.');
        throw new Error('PhysicsManager must be initialized before creating the course.');
      }

      const useNineHoleCourse = true; // Or based on a setting
      if (useNineHoleCourse) {
        this.course = await NineHoleCourse.create(this);
      } else {
        this.course = await BasicCourse.create(this);
      }

      if (!this.course || !this.course.currentHoleEntity) {
        throw new Error('Course or initial HoleEntity failed to initialize.');
      }

      // Set course ref in CameraController
      if (this.cameraController) {
        this.cameraController.setCourse(this.course);
      }

      // Create ball using WORLD start position from course config
      const worldStartPosition = this.course.getHoleStartPosition(); // Returns WORLD coords now
      if (worldStartPosition) {
        this.ballManager.createBall(worldStartPosition);
      } else {
        throw new Error('Failed to get world start position for ball creation.');
      }

      // Position camera for the initial hole
      if (this.cameraController) {
        this.cameraController.positionCameraForHole();
      }

      this.eventManager.publish(EventTypes.COURSE_CREATED, { course: this.course }, this);
    } catch (error) {
      this.debugManager.error('Game.createCourse', 'Failed to create course', error, true);
      console.error('CRITICAL: Failed to create course:', error);
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    if (this.renderer && this.camera) {
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      // The camera aspect ratio update is handled by the CameraController

      // Update post-processing manager
      if (this.postProcessingManager) {
        this.postProcessingManager.handleResize();
      }
    }
  }

  /**
   * Cleanup the game and all its components
   */
  /**
   * Helper method to cleanup a manager safely
   */
  cleanupManager(manager) {
    if (manager && typeof manager.cleanup === 'function') {
      manager.cleanup();
    }
  }

  /**
   * Helper method to dispose Three.js objects
   */
  disposeThreeObject(object) {
    if (object.geometry) {
      object.geometry.dispose();
    }
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material.dispose();
      }
    }
  }

  cleanup() {
    try {
      // Stop the game loop first
      if (this.gameLoopManager) {
        this.gameLoopManager.stopLoop();
        this.cleanupManager(this.gameLoopManager);
      }

      // Remove event listeners
      if (this.boundHandleResize) {
        window.removeEventListener('resize', this.boundHandleResize);
        this.boundHandleResize = null;
      }

      // Clean up managers in reverse order of initialization
      const managers = [
        'inputController',
        'ballManager',
        'holeCompletionManager',
        'holeTransitionManager',
        'holeStateManager',
        'hazardManager',
        'audioManager',
        'physicsManager',
        'visualEffectsManager',
        'postProcessingManager',
        'environmentManager',
        'materialManager',
        'cameraController',
        'uiManager',
        'stateManager',
        'performanceManager'
      ];

      managers.forEach(managerName => {
        this.cleanupManager(this[managerName]);
      });

      // Core systems last
      this.cleanupManager(this.eventManager);
      this.cleanupManager(this.debugManager);

      // Remove objects from scene
      if (this.scene) {
        while (this.scene.children.length > 0) {
          const object = this.scene.children[0];
          this.scene.remove(object);
          this.disposeThreeObject(object);
        }
      }

      // Dispose of renderer
      if (this.renderer) {
        this.renderer.dispose();
        this.renderer = null;
      }

      // Clear references
      this.camera = null;
      this.scene = null;
      this.clock = null;

      debug.log('Game cleaned up');
    } catch (error) {
      if (this.debugManager) {
        this.debugManager.error('Game.cleanup', 'Error during cleanup', error);
      } else {
        console.error('Error during cleanup:', error);
      }
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Subscribe to ball in hole events - REMOVED
    // this.eventManager.subscribe(
    //     EventTypes.BALL_IN_HOLE,
    //     this.handleBallInHole,
    //     this
    // );

    // Add other event subscriptions as needed
    window.addEventListener('resize', this.handleResize.bind(this));
  }
}
