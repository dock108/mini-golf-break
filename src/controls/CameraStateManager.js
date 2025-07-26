import * as THREE from 'three';
import { debug } from '../utils/debug';

/**
 * Camera modes for different viewing states
 */
export const CameraModes = {
  OVERHEAD: 'overhead', // Default top-down strategic view
  BALL_FOLLOW: 'ball_follow', // Cinematic ball tracking
  MANUAL: 'manual', // Free-look user control
  AIMING: 'aiming', // Close-up aiming view
  TRANSITION: 'transition' // Transitioning between modes
};

/**
 * CameraStateManager - Manages camera modes and smooth transitions
 * Provides state-based camera control with smooth interpolation
 */
export class CameraStateManager {
  constructor(camera, orbitControls) {
    this.camera = camera;
    this.orbitControls = orbitControls;

    // Current state
    this.currentMode = CameraModes.OVERHEAD;
    this.previousMode = null;
    this.isTransitioning = false;
    this.transitionProgress = 0;
    this.transitionDuration = 1.5; // seconds

    // Camera state storage
    this.cameraStates = new Map();
    this.initializeCameraStates();

    // Transition interpolation
    this.startTransitionState = {
      position: new THREE.Vector3(),
      target: new THREE.Vector3(),
      up: new THREE.Vector3()
    };
    this.endTransitionState = {
      position: new THREE.Vector3(),
      target: new THREE.Vector3(),
      up: new THREE.Vector3()
    };

    // Easing functions
    this.easingFunctions = {
      easeInOut: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
      easeOut: t => 1 - Math.pow(1 - t, 3),
      easeIn: t => t * t * t
    };

    // Animation frame tracking
    this.lastUpdateTime = 0;
    this.animationFrameId = null;

    // Settings
    this.settings = {
      enableSmoothing: true,
      transitionSpeed: 1.0,
      damping: 0.1
    };
  }

  /**
   * Initialize default camera states
   */
  initializeCameraStates() {
    // Overhead view - strategic course overview
    this.cameraStates.set(CameraModes.OVERHEAD, {
      position: new THREE.Vector3(0, 15, 10),
      target: new THREE.Vector3(0, -1.5, -5),
      up: new THREE.Vector3(0, 1, 0),
      fov: 60,
      description: 'Strategic overhead view'
    });

    // Ball follow - cinematic tracking
    this.cameraStates.set(CameraModes.BALL_FOLLOW, {
      position: new THREE.Vector3(2, 8, 4),
      target: new THREE.Vector3(0, 0, 0),
      up: new THREE.Vector3(0, 1, 0),
      fov: 60,
      description: 'Cinematic ball following'
    });

    // Manual control - user controlled
    this.cameraStates.set(CameraModes.MANUAL, {
      position: new THREE.Vector3(5, 12, 8),
      target: new THREE.Vector3(0, 0, 0),
      up: new THREE.Vector3(0, 1, 0),
      fov: 60,
      description: 'Manual user control'
    });

    // Aiming view - close-up ball view
    this.cameraStates.set(CameraModes.AIMING, {
      position: new THREE.Vector3(1, 3, 2),
      target: new THREE.Vector3(0, 0, 0),
      up: new THREE.Vector3(0, 1, 0),
      fov: 70,
      description: 'Close-up aiming view'
    });
  }

  /**
   * Set camera mode with optional smooth transition
   * @param {string} mode - Target camera mode
   * @param {boolean} immediate - Skip transition animation
   * @param {Object} options - Additional options (duration, easing)
   */
  setCameraMode(mode, immediate = false, options = {}) {
    if (!this.cameraStates.has(mode)) {
      debug.warn(`[CameraStateManager] Unknown camera mode: ${mode}`);
      return false;
    }

    if (this.currentMode === mode) {
      debug.log(`[CameraStateManager] Already in mode: ${mode}`);
      return true;
    }

    this.previousMode = this.currentMode;
    const targetState = this.cameraStates.get(mode);

    debug.log(`[CameraStateManager] Transitioning from ${this.currentMode} to ${mode}`);

    if (immediate) {
      this.applyDirectCameraState(targetState);
      this.currentMode = mode;
      this.isTransitioning = false;
    } else {
      this.startTransition(mode, targetState, options);
    }

    return true;
  }

  /**
   * Start smooth transition to new camera mode
   */
  startTransition(targetMode, targetState, options = {}) {
    // Store current state as start of transition
    this.startTransitionState.position.copy(this.camera.position);
    this.startTransitionState.target.copy(
      this.orbitControls
        ? this.orbitControls.target
        : this.camera.position.clone().add(new THREE.Vector3(0, 0, -1))
    );
    this.startTransitionState.up.copy(this.camera.up);

    // Set target state
    this.endTransitionState.position.copy(targetState.position);
    this.endTransitionState.target.copy(targetState.target);
    this.endTransitionState.up.copy(targetState.up);

    // Configure transition
    this.transitionDuration =
      options.duration || this.transitionDuration / this.settings.transitionSpeed;
    this.transitionProgress = 0;
    this.isTransitioning = true;
    this.currentMode = CameraModes.TRANSITION;
    this.lastUpdateTime = performance.now();

    // Start animation loop
    this.startAnimationLoop();

    // Set final mode after transition
    setTimeout(() => {
      this.currentMode = targetMode;
    }, this.transitionDuration * 1000);
  }

  /**
   * Apply camera state directly without transition
   */
  applyDirectCameraState(state) {
    this.camera.position.copy(state.position);
    this.camera.lookAt(state.target);
    this.camera.up.copy(state.up);
    this.camera.fov = state.fov || 60;
    this.camera.updateProjectionMatrix();

    if (this.orbitControls) {
      this.orbitControls.target.copy(state.target);
      this.orbitControls.update();
    }
  }

  /**
   * Update camera state - call this in main update loop
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    if (!this.isTransitioning) {
      return;
    }

    this.transitionProgress += deltaTime / this.transitionDuration;

    if (this.transitionProgress >= 1.0) {
      // Transition complete
      this.transitionProgress = 1.0;
      this.isTransitioning = false;
      this.stopAnimationLoop();
    }

    // Apply eased interpolation
    const easedProgress = this.easingFunctions.easeInOut(this.transitionProgress);

    // Interpolate position
    this.camera.position.lerpVectors(
      this.startTransitionState.position,
      this.endTransitionState.position,
      easedProgress
    );

    // Interpolate target/look-at
    const currentTarget = new THREE.Vector3().lerpVectors(
      this.startTransitionState.target,
      this.endTransitionState.target,
      easedProgress
    );

    this.camera.lookAt(currentTarget);

    // Update orbit controls if available
    if (this.orbitControls) {
      this.orbitControls.target.copy(currentTarget);
      this.orbitControls.update();
    }
  }

  /**
   * Start internal animation loop for transitions
   */
  startAnimationLoop() {
    if (this.animationFrameId) {
      return; // Already running
    }

    const animate = currentTime => {
      if (!this.isTransitioning) {
        this.stopAnimationLoop();
        return;
      }

      const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
      this.lastUpdateTime = currentTime;

      this.update(deltaTime);
      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Stop animation loop
   */
  stopAnimationLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Update camera state for specific mode (useful for dynamic ball following)
   * @param {string} mode - Camera mode to update
   * @param {Object} stateUpdate - Partial state update
   */
  updateCameraState(mode, stateUpdate) {
    if (!this.cameraStates.has(mode)) {
      debug.warn(`[CameraStateManager] Cannot update unknown mode: ${mode}`);
      return;
    }

    const state = this.cameraStates.get(mode);

    if (stateUpdate.position) {
      state.position.copy(stateUpdate.position);
    }
    if (stateUpdate.target) {
      state.target.copy(stateUpdate.target);
    }
    if (stateUpdate.up) {
      state.up.copy(stateUpdate.up);
    }
    if (stateUpdate.fov !== undefined) {
      state.fov = stateUpdate.fov;
    }

    // If we're currently in this mode and not transitioning, apply immediately
    if (this.currentMode === mode && !this.isTransitioning) {
      this.applyDirectCameraState(state);
    }
  }

  /**
   * Get current camera mode
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * Check if camera is currently transitioning
   */
  isInTransition() {
    return this.isTransitioning;
  }

  /**
   * Force end current transition
   */
  completeTransition() {
    if (this.isTransitioning) {
      this.transitionProgress = 1.0;
      this.update(0); // Force final update
    }
  }

  /**
   * Configure transition settings
   */
  setTransitionSettings({ enableSmoothing, transitionSpeed, damping } = {}) {
    if (enableSmoothing !== undefined) {
      this.settings.enableSmoothing = enableSmoothing;
    }
    if (transitionSpeed !== undefined) {
      this.settings.transitionSpeed = Math.max(0.1, Math.min(5.0, transitionSpeed));
    }
    if (damping !== undefined) {
      this.settings.damping = Math.max(0.01, Math.min(1.0, damping));
    }
  }

  /**
   * Get available camera modes
   */
  getAvailableModes() {
    return Array.from(this.cameraStates.keys());
  }

  /**
   * Get state description for a mode
   */
  getModeDescription(mode) {
    const state = this.cameraStates.get(mode);
    return state ? state.description : 'Unknown mode';
  }

  /**
   * Reset to default camera mode
   */
  reset() {
    this.setCameraMode(CameraModes.OVERHEAD, true);
  }

  /**
   * Cleanup
   */
  dispose() {
    this.stopAnimationLoop();
    this.cameraStates.clear();
  }
}
