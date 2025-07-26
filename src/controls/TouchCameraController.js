import * as THREE from 'three';
import { debug } from '../utils/debug';

/**
 * TouchCameraController - Apple Maps-style touch camera controls
 * Provides comprehensive multi-touch gestures:
 * - Pinch to zoom in/out
 * - Two-finger pan to move around
 * - Two-finger twist to rotate view
 * - Two-finger vertical swipe to tilt camera angle
 * - Momentum and smoothing for natural feel
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

    // Apple Maps-style gesture tracking
    this.lastTouchAngle = 0;
    this.lastTouchMidpoint = new THREE.Vector2();
    this.gestureStartData = null;

    // Gesture thresholds and sensitivities
    this.pinchThreshold = 10; // Minimum pinch distance change
    this.doubleTapDelay = 300; // ms between taps
    this.panThreshold = 5; // Minimum pan distance
    this.rotationThreshold = 0.1; // Minimum rotation angle (radians)
    this.tiltThreshold = 15; // Minimum tilt distance

    // Gesture sensitivity controls
    this.zoomSensitivity = 1.0;
    this.panSensitivity = 1.0;
    this.rotationSensitivity = 1.0;
    this.tiltSensitivity = 1.0;

    // Camera limits
    this.minZoom = 3;
    this.maxZoom = 40;
    this.minTiltAngle = Math.PI * 0.15; // 27 degrees minimum tilt
    this.maxTiltAngle = Math.PI * 0.48; // 86 degrees maximum tilt

    // Gesture state
    this.isPinching = false;
    this.isPanning = false;
    this.isRotating = false;
    this.isTilting = false;
    this.isAppleMapsGesture = false; // Track if we're in Apple Maps mode

    // Smoothing and momentum
    this.enableSmoothing = true;
    this.smoothingFactor = 0.15;
    this.momentum = {
      pan: new THREE.Vector2(),
      rotation: 0,
      tilt: 0,
      decay: 0.9
    };

    // Bind event handlers
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    this.enabled = true;
  }

  /**
   * Enable touch controls (now works via delegation from InputController)
   */
  enable() {
    if (this.enabled) {
      return;
    }

    // No longer add direct event listeners - InputController will delegate to us
    this.enabled = true;
    debug.log('[TouchCameraController] Enabled (delegation mode)');
  }

  /**
   * Disable touch controls (now works via delegation from InputController)
   */
  disable() {
    if (!this.enabled) {
      return;
    }

    // No longer remove direct event listeners - InputController handles delegation
    this.enabled = false;
    debug.log('[TouchCameraController] Disabled (delegation mode)');
  }

  /**
   * Handle touch start
   */
  handleTouchStart(event) {
    // Only process if enabled
    if (!this.enabled) {
      return;
    }

    // Only handle 2+ finger gestures
    if (event.touches.length < 2) {
      return;
    }

    // Only preventDefault for multi-touch on canvas, not UI elements
    const target = event.target;
    const isUIElement =
      target.closest('#ui-overlay') ||
      target.closest('.camera-controls-container') ||
      target.closest('button');

    if (!isUIElement) {
      event.preventDefault();
    }

    // Update touch map
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      this.touches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        prevX: touch.clientX,
        prevY: touch.clientY
      });
    }

    // Initialize Apple Maps-style gesture tracking for 2 touches
    if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];

      // Store initial gesture data
      this.gestureStartData = {
        distance: this.getTouchDistance(touch1, touch2),
        angle: this.getTouchAngle(touch1, touch2),
        midpoint: this.getTouchMidpoint(touch1, touch2),
        startTime: Date.now()
      };

      this.lastTouchDistance = this.gestureStartData.distance;
      this.lastTouchAngle = this.gestureStartData.angle;
      this.lastTouchMidpoint.copy(this.gestureStartData.midpoint);

      // Reset all gesture states
      this.isPinching = false;
      this.isRotating = false;
      this.isPanning = false;
      this.isTilting = false;
      this.isAppleMapsGesture = true;

      debug.log('[TouchCameraController] Apple Maps gesture started');
    }
  }

  /**
   * Handle touch move - Apple Maps-style gesture processing
   */
  handleTouchMove(event) {
    // Only process if enabled
    if (!this.enabled) {
      return;
    }

    // Only handle 2+ finger gestures
    if (event.touches.length < 2 || !this.isAppleMapsGesture) {
      return;
    }

    // Only preventDefault for multi-touch on canvas, not UI elements
    const target = event.target;
    const isUIElement =
      target.closest('#ui-overlay') ||
      target.closest('.camera-controls-container') ||
      target.closest('button');

    if (!isUIElement) {
      event.preventDefault();
    }

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

    // Handle Apple Maps-style two-finger gestures
    if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];

      this.processAppleMapsGestures(touch1, touch2);
    }
  }

  /**
   * Process all Apple Maps-style gestures simultaneously
   */
  processAppleMapsGestures(touch1, touch2) {
    // Calculate current gesture properties
    const currentDistance = this.getTouchDistance(touch1, touch2);
    const currentAngle = this.getTouchAngle(touch1, touch2);
    const currentMidpoint = this.getTouchMidpoint(touch1, touch2);

    // Calculate deltas
    const distanceDelta = currentDistance - this.lastTouchDistance;
    const angleDelta = this.normalizeAngle(currentAngle - this.lastTouchAngle);
    const midpointDelta = {
      x: currentMidpoint.x - this.lastTouchMidpoint.x,
      y: currentMidpoint.y - this.lastTouchMidpoint.y
    };

    // Determine gesture types based on movement patterns
    const isPinching = Math.abs(distanceDelta) > this.pinchThreshold;
    const isRotating = Math.abs(angleDelta) > this.rotationThreshold;
    const isPanning =
      Math.sqrt(midpointDelta.x * midpointDelta.x + midpointDelta.y * midpointDelta.y) >
      this.panThreshold;
    const isTilting = this.detectTiltGesture(touch1, touch2);

    // Process gestures in order of priority
    if (isPinching) {
      this.handleAppleMapsZoom(distanceDelta);
    }

    if (isRotating) {
      this.handleAppleMapsRotation(angleDelta);
    }

    if (isPanning && !isTilting) {
      this.handleAppleMapsPan(midpointDelta);
    }

    if (isTilting) {
      this.handleAppleMapsTilt(touch1, touch2);
    }

    // Update last values
    this.lastTouchDistance = currentDistance;
    this.lastTouchAngle = currentAngle;
    this.lastTouchMidpoint.copy(currentMidpoint);
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(event) {
    // Only process if enabled
    if (!this.enabled) {
      return;
    }

    // Only preventDefault for multi-touch on canvas, not UI elements
    const target = event.target;
    const isUIElement =
      target.closest('#ui-overlay') ||
      target.closest('.camera-controls-container') ||
      target.closest('button');

    if (!isUIElement) {
      event.preventDefault();
    }

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
      this.isRotating = false;
      this.isTilting = false;
      this.isAppleMapsGesture = false;
      this.gestureStartData = null;

      debug.log('[TouchCameraController] Apple Maps gesture ended');
    }

    if (event.touches.length === 0) {
      // All touches ended - apply momentum if enabled
      if (this.enableSmoothing) {
        this.applyMomentum();
      }
    }
  }

  /**
   * Apple Maps-style zoom gesture
   */
  handleAppleMapsZoom(distanceDelta) {
    if (!this.orbitControls) {
      return;
    }

    const zoomFactor = 1 + distanceDelta * this.zoomSensitivity * 0.005;
    const distance = this.camera.position.distanceTo(this.orbitControls.target);
    const newDistance = distance / zoomFactor;

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
   * Apple Maps-style rotation gesture (twist)
   */
  handleAppleMapsRotation(angleDelta) {
    if (!this.orbitControls) {
      return;
    }

    // Apply rotation around the Y-axis (vertical)
    const rotationSpeed = this.rotationSensitivity * 2.0;
    const targetPosition = this.orbitControls.target.clone();

    // Rotate camera around the target point
    const offset = new THREE.Vector3().subVectors(this.camera.position, targetPosition);
    const rotationMatrix = new THREE.Matrix4().makeRotationY(-angleDelta * rotationSpeed);
    offset.applyMatrix4(rotationMatrix);

    this.camera.position.copy(targetPosition).add(offset);
    this.camera.lookAt(targetPosition);
    this.orbitControls.update();
  }

  /**
   * Apple Maps-style pan gesture
   */
  handleAppleMapsPan(midpointDelta) {
    if (!this.orbitControls) {
      return;
    }

    const panSpeed = this.panSensitivity * 0.5;
    const distance = this.camera.position.distanceTo(this.orbitControls.target);

    // Calculate pan vector in screen space
    const vector = new THREE.Vector3(-midpointDelta.x * panSpeed, midpointDelta.y * panSpeed, 0);

    // Transform to world space considering camera orientation and distance
    vector.multiplyScalar(distance * 0.001);
    vector.applyQuaternion(this.camera.quaternion);

    // Apply pan to both camera and target
    this.orbitControls.target.add(vector);
    this.camera.position.add(vector);
    this.orbitControls.update();
  }

  /**
   * Apple Maps-style tilt gesture
   */
  handleAppleMapsTilt(touch1, touch2) {
    if (!this.orbitControls) {
      return;
    }

    const touchData1 = this.touches.get(touch1.identifier);
    const touchData2 = this.touches.get(touch2.identifier);

    if (!touchData1 || !touchData2) {
      return;
    }

    // Calculate average vertical movement
    const avgVerticalDelta =
      (touchData1.y - touchData1.prevY + (touchData2.y - touchData2.prevY)) / 2;

    if (Math.abs(avgVerticalDelta) < this.tiltThreshold) {
      return;
    }

    // Apply tilt by rotating around camera's right vector
    const tiltSpeed = this.tiltSensitivity * 0.01;
    const tiltDelta = avgVerticalDelta * tiltSpeed;

    // Get camera's current polar angle (tilt)
    const targetPosition = this.orbitControls.target.clone();
    const offset = new THREE.Vector3().subVectors(this.camera.position, targetPosition);
    const currentPolarAngle = Math.acos(offset.y / offset.length());

    // Calculate new polar angle
    const newPolarAngle = Math.max(
      this.minTiltAngle,
      Math.min(this.maxTiltAngle, currentPolarAngle + tiltDelta)
    );

    // Apply new tilt angle
    if (Math.abs(newPolarAngle - currentPolarAngle) > 0.01) {
      const distance = offset.length();
      const azimuthalAngle = Math.atan2(offset.x, offset.z);

      offset.x = distance * Math.sin(newPolarAngle) * Math.sin(azimuthalAngle);
      offset.y = distance * Math.cos(newPolarAngle);
      offset.z = distance * Math.sin(newPolarAngle) * Math.cos(azimuthalAngle);

      this.camera.position.copy(targetPosition).add(offset);
      this.camera.lookAt(targetPosition);
      this.orbitControls.update();
    }
  }

  /**
   * Detect if gesture is a tilt (both fingers moving vertically in parallel)
   */
  detectTiltGesture(touch1, touch2) {
    const touchData1 = this.touches.get(touch1.identifier);
    const touchData2 = this.touches.get(touch2.identifier);

    if (!touchData1 || !touchData2 || !touchData1.prevY || !touchData2.prevY) {
      return false;
    }

    const deltaY1 = touchData1.y - touchData1.prevY;
    const deltaY2 = touchData2.y - touchData2.prevY;
    const deltaX1 = touchData1.x - touchData1.prevX;
    const deltaX2 = touchData2.x - touchData2.prevX;

    // Check if both fingers are moving primarily vertically
    const verticalMovement1 = Math.abs(deltaY1) > Math.abs(deltaX1);
    const verticalMovement2 = Math.abs(deltaY2) > Math.abs(deltaX2);

    // Check if movement is in same direction
    const sameDirection = deltaY1 * deltaY2 > 0;

    // Check if movement is significant
    const significantMovement =
      Math.abs(deltaY1) > this.tiltThreshold || Math.abs(deltaY2) > this.tiltThreshold;

    return verticalMovement1 && verticalMovement2 && sameDirection && significantMovement;
  }

  /**
   * Get angle between two touches
   */
  getTouchAngle(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.atan2(dy, dx);
  }

  /**
   * Get midpoint between two touches
   */
  getTouchMidpoint(touch1, touch2) {
    return new THREE.Vector2(
      (touch1.clientX + touch2.clientX) / 2,
      (touch1.clientY + touch2.clientY) / 2
    );
  }

  /**
   * Normalize angle to [-π, π] range
   */
  normalizeAngle(angle) {
    while (angle > Math.PI) {
      angle -= 2 * Math.PI;
    }
    while (angle < -Math.PI) {
      angle += 2 * Math.PI;
    }
    return angle;
  }

  /**
   * Apply momentum for smooth gesture endings
   */
  applyMomentum() {
    // Simple momentum decay - could be enhanced with smooth animation
    this.momentum.pan.multiplyScalar(this.momentum.decay);
    this.momentum.rotation *= this.momentum.decay;
    this.momentum.tilt *= this.momentum.decay;

    // Apply residual momentum if significant
    if (this.momentum.pan.length() > 0.1) {
      this.handleAppleMapsPan({ x: this.momentum.pan.x, y: this.momentum.pan.y });
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
   * Set gesture sensitivities
   */
  setSensitivities({ zoom = 1.0, pan = 1.0, rotation = 1.0, tilt = 1.0 } = {}) {
    this.zoomSensitivity = Math.max(0.1, Math.min(3.0, zoom));
    this.panSensitivity = Math.max(0.1, Math.min(3.0, pan));
    this.rotationSensitivity = Math.max(0.1, Math.min(3.0, rotation));
    this.tiltSensitivity = Math.max(0.1, Math.min(3.0, tilt));

    debug.log(
      `[TouchCameraController] Sensitivities updated: zoom=${this.zoomSensitivity}, pan=${this.panSensitivity}, rotation=${this.rotationSensitivity}, tilt=${this.tiltSensitivity}`
    );
  }

  /**
   * Set tilt angle limits
   */
  setTiltLimits(minAngleDegrees = 27, maxAngleDegrees = 86) {
    this.minTiltAngle = (Math.PI * minAngleDegrees) / 180;
    this.maxTiltAngle = (Math.PI * maxAngleDegrees) / 180;
  }

  /**
   * Enable or disable smoothing
   */
  setSmoothing(enabled) {
    this.enableSmoothing = enabled;
  }

  /**
   * Reset gesture state (useful for debugging or state changes)
   */
  resetGestureState() {
    this.isPinching = false;
    this.isPanning = false;
    this.isRotating = false;
    this.isTilting = false;
    this.isAppleMapsGesture = false;
    this.gestureStartData = null;
    this.touches.clear();

    // Reset momentum
    this.momentum.pan.set(0, 0);
    this.momentum.rotation = 0;
    this.momentum.tilt = 0;
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
