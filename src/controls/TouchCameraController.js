import * as THREE from 'three';
import { debug } from '../utils/debug';

/**
 * TouchCameraController - Handles touch-specific camera controls
 * Provides pinch-to-zoom, pan, and rotation for mobile devices
 */
export class TouchCameraController {
  constructor(camera, domElement, orbitControls) {
    this.camera = camera;
    this.domElement = domElement;
    this.orbitControls = orbitControls;

    // Touch state tracking
    this.touches = new Map();
    this.lastTouchDistance = 0;
    this.lastTouchTime = 0;
    this.tapCount = 0;
    this.tapTimer = null;

    // Gesture thresholds
    this.pinchThreshold = 10; // Minimum pinch distance change
    this.doubleTapDelay = 300; // ms between taps
    this.panThreshold = 5; // Minimum pan distance

    // Camera limits
    this.minZoom = 3;
    this.maxZoom = 40;

    // Gesture state
    this.isPinching = false;
    this.isPanning = false;
    this.isRotating = false;

    // Bind event handlers
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    this.enabled = true;
  }

  /**
   * Enable touch controls
   */
  enable() {
    if (this.enabled) {
      return;
    }

    this.domElement.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.domElement.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.domElement.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.domElement.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });

    this.enabled = true;
    debug.log('[TouchCameraController] Enabled');
  }

  /**
   * Disable touch controls
   */
  disable() {
    if (!this.enabled) {
      return;
    }

    this.domElement.removeEventListener('touchstart', this.handleTouchStart);
    this.domElement.removeEventListener('touchmove', this.handleTouchMove);
    this.domElement.removeEventListener('touchend', this.handleTouchEnd);
    this.domElement.removeEventListener('touchcancel', this.handleTouchEnd);

    this.enabled = false;
    debug.log('[TouchCameraController] Disabled');
  }

  /**
   * Handle touch start
   */
  handleTouchStart(event) {
    // Only handle 2+ finger gestures
    if (event.touches.length < 2) {
      return;
    }

    event.preventDefault();

    // Update touch map
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      this.touches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now()
      });
    }

    // Initialize pinch gesture for 2 touches
    if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      this.lastTouchDistance = this.getTouchDistance(touch1, touch2);
      this.isPinching = true;
      this.isRotating = false;
      this.isPanning = false;
      debug.log('[TouchCameraController] Two-finger gesture started');
    }
  }

  /**
   * Handle touch move
   */
  handleTouchMove(event) {
    // Only handle 2+ finger gestures
    if (event.touches.length < 2) {
      return;
    }

    event.preventDefault();

    // Update touch positions
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      const touchData = this.touches.get(touch.identifier);
      if (touchData) {
        touchData.prevX = touchData.x;
        touchData.prevY = touchData.y;
        touchData.x = touch.clientX;
        touchData.y = touch.clientY;
      }
    }

    // Handle two-finger gestures
    if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const touchData1 = this.touches.get(touch1.identifier);
      const touchData2 = this.touches.get(touch2.identifier);

      if (!touchData1 || !touchData2) {
        return;
      }

      // Calculate current and previous distances for pinch zoom
      const currentDistance = this.getTouchDistance(touch1, touch2);
      const deltaDistance = currentDistance - this.lastTouchDistance;

      // Calculate movement for pan
      const avgDeltaX = (touchData1.x - touchData1.prevX + (touchData2.x - touchData2.prevX)) / 2;
      const avgDeltaY = (touchData1.y - touchData1.prevY + (touchData2.y - touchData2.prevY)) / 2;

      // Determine if this is primarily a pinch or pan
      const isPinch = Math.abs(deltaDistance) > 2; // Pinch threshold
      const isPan = Math.sqrt(avgDeltaX * avgDeltaX + avgDeltaY * avgDeltaY) > 2; // Pan threshold

      if (isPinch && Math.abs(deltaDistance) > Math.abs(avgDeltaX) + Math.abs(avgDeltaY)) {
        // Pinch zoom
        this.handlePinchZoom(currentDistance);
      } else if (isPan) {
        // Pan
        this.handlePan(touchData1, touchData2);
      }

      this.lastTouchDistance = currentDistance;
    }
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(event) {
    event.preventDefault();

    // Remove ended touches
    const remainingTouches = Array.from(event.touches);
    const remainingIds = remainingTouches.map(t => t.identifier);

    for (const [id] of this.touches) {
      if (!remainingIds.includes(id)) {
        this.touches.delete(id);
      }
    }

    // Reset gesture states
    if (event.touches.length < 2) {
      this.isPinching = false;
      this.isPanning = false;
    }

    if (event.touches.length === 0) {
      this.isRotating = false;
    }
  }

  /**
   * Handle rotation gesture (single touch drag)
   */
  handleRotation(touch) {
    const touchData = this.touches.get(touch.identifier);
    if (!touchData || !touchData.prevX) {
      return;
    }

    const deltaX = touchData.x - touchData.prevX;
    const deltaY = touchData.y - touchData.prevY;

    // Rotate camera using orbit controls
    if (this.orbitControls) {
      // Simulate mouse events for orbit controls
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        movementX: deltaX,
        movementY: deltaY
      });

      // Temporarily enable orbit controls rotation
      const originalRotateSpeed = this.orbitControls.rotateSpeed;
      this.orbitControls.rotateSpeed = 0.5; // Slower for touch

      // Dispatch the event
      this.domElement.dispatchEvent(mouseEvent);

      // Restore speed
      this.orbitControls.rotateSpeed = originalRotateSpeed;
    }
  }

  /**
   * Handle pinch zoom gesture
   */
  handlePinchZoom(currentDistance) {
    if (!this.lastTouchDistance || this.lastTouchDistance === 0) {
      return;
    }

    // Calculate zoom based on ratio of distances
    const zoomFactor = currentDistance / this.lastTouchDistance;

    // Apply zoom with damping
    const dampedZoomFactor = 1 + (zoomFactor - 1) * 0.5;
    this.zoom(dampedZoomFactor);

    debug.log(`[TouchCameraController] Pinch zoom: factor=${dampedZoomFactor.toFixed(2)}`);
  }

  /**
   * Handle pan gesture (two finger drag)
   */
  handlePan(touchData1, touchData2) {
    if (!touchData1.prevX || !touchData2.prevX) {
      return;
    }

    // Calculate average movement
    const avgDeltaX = (touchData1.x - touchData1.prevX + (touchData2.x - touchData2.prevX)) / 2;
    const avgDeltaY = (touchData1.y - touchData1.prevY + (touchData2.y - touchData2.prevY)) / 2;

    // Pan camera using orbit controls
    if (this.orbitControls) {
      const panSpeed = 0.5;

      // Calculate pan vector in screen space
      const vector = new THREE.Vector3(-avgDeltaX * panSpeed, avgDeltaY * panSpeed, 0);

      // Transform to world space considering camera orientation
      vector.multiplyScalar(this.orbitControls.target.distanceTo(this.camera.position) * 0.001);
      vector.applyQuaternion(this.camera.quaternion);

      // Apply pan
      this.orbitControls.target.add(vector);
      this.camera.position.add(vector);
      this.orbitControls.update();
    }
  }

  /**
   * Handle double tap - reset camera view
   */
  handleDoubleTap() {
    debug.log('[TouchCameraController] Double tap detected - resetting view');

    // Emit custom event that CameraController can listen to
    const event = new CustomEvent('camera-reset-view', { detail: { smooth: true } });
    this.domElement.dispatchEvent(event);
  }

  /**
   * Apply zoom to camera
   */
  zoom(factor) {
    if (!this.orbitControls) {
      return;
    }

    const distance = this.camera.position.distanceTo(this.orbitControls.target);
    const newDistance = distance / factor;

    // Clamp to zoom limits
    const clampedDistance = Math.max(this.minZoom, Math.min(this.maxZoom, newDistance));

    // Calculate new camera position
    const direction = new THREE.Vector3()
      .subVectors(this.camera.position, this.orbitControls.target)
      .normalize();

    this.camera.position
      .copy(this.orbitControls.target)
      .add(direction.multiplyScalar(clampedDistance));

    this.orbitControls.update();
  }

  /**
   * Calculate distance between two touches
   */
  getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Set zoom limits
   */
  setZoomLimits(min, max) {
    this.minZoom = min;
    this.maxZoom = max;
  }

  /**
   * Cleanup
   */
  dispose() {
    this.disable();
    this.touches.clear();

    if (this.tapTimer) {
      clearTimeout(this.tapTimer);
      this.tapTimer = null;
    }
  }
}
