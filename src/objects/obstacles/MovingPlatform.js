import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Obstacle } from './Obstacle';
import { EventTypes } from '../../events/EventTypes';

/**
 * Moving Platform - a platform that moves between waypoints, carrying the ball
 */
export class MovingPlatform extends Obstacle {
  constructor(config = {}) {
    super(config);

    this.type = 'movingplatform';

    // Movement properties
    this.waypoints = config.waypoints || [
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 0, z: 0 }
    ];
    this.speed = config.speed || 2; // units per second
    this.pauseTime = config.pauseTime || 1000; // ms at each waypoint
    this.movementType = config.movementType || 'linear'; // 'linear' or 'smooth'

    // State
    this.currentWaypointIndex = 0;
    this.nextWaypointIndex = 1;
    this.movementProgress = 0;
    this.isPaused = false;
    this.pauseStartTime = 0;
    this.ballsOnPlatform = new Set();

    // Visual properties
    this.color = config.color || 0x4488ff;
    this.trackVisible = config.trackVisible !== false;

    // Components
    this.track = null;
    this.supportBeams = [];
  }

  /**
   * Create the platform mesh
   */
  createMesh() {
    // Main platform
    const geometry = new THREE.BoxGeometry(
      this.size.width || 3,
      this.size.height || 0.3,
      this.size.depth || 3
    );

    this.material = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.6,
      roughness: 0.4
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.group.add(this.mesh);

    // Add edge trim
    this.createEdgeTrim();

    // Add support structure
    this.createSupportStructure();

    // Create track if visible
    if (this.trackVisible) {
      this.createTrack();
    }

    // Position at first waypoint
    const firstWaypoint = this.waypoints[0];
    this.group.position.set(firstWaypoint.x, firstWaypoint.y, firstWaypoint.z);
  }

  /**
   * Create edge trim for the platform
   */
  createEdgeTrim() {
    const trimGeometry = new THREE.BoxGeometry(
      (this.size.width || 3) + 0.2,
      0.1,
      (this.size.depth || 3) + 0.2
    );

    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.8,
      roughness: 0.2
    });

    const trim = new THREE.Mesh(trimGeometry, trimMaterial);
    trim.position.y = -(this.size.height || 0.3) / 2 - 0.05;
    this.group.add(trim);

    // Add warning stripes
    const stripeGeometry = new THREE.PlaneGeometry((this.size.width || 3) + 0.1, 0.2);

    const stripeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      side: THREE.DoubleSide
    });

    // Front and back stripes
    for (let z of [-1, 1]) {
      const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
      stripe.position.z = z * ((this.size.depth || 3) / 2 + 0.1);
      stripe.position.y = (this.size.height || 0.3) / 2 + 0.01;
      stripe.rotation.x = -Math.PI / 2;
      this.group.add(stripe);
    }
  }

  /**
   * Create support structure under platform
   */
  createSupportStructure() {
    const beamGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1);
    const beamMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.7,
      roughness: 0.3
    });

    // Corner support beams
    const positions = [
      { x: -1, z: -1 },
      { x: 1, z: -1 },
      { x: -1, z: 1 },
      { x: 1, z: 1 }
    ];

    positions.forEach(pos => {
      const beam = new THREE.Mesh(beamGeometry, beamMaterial);
      beam.position.x = pos.x * ((this.size.width || 3) / 2 - 0.3);
      beam.position.z = pos.z * ((this.size.depth || 3) / 2 - 0.3);
      beam.position.y = -(this.size.height || 0.3) / 2 - 0.5;
      this.supportBeams.push(beam);
      this.group.add(beam);
    });
  }

  /**
   * Create visual track between waypoints
   */
  createTrack() {
    if (!this.game) return;

    const trackGroup = new THREE.Group();

    // Create path curve
    const points = this.waypoints.map(wp => new THREE.Vector3(wp.x, wp.y, wp.z));

    // Draw track segments
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      const direction = end.clone().sub(start);
      const length = direction.length();

      // Track rail
      const railGeometry = new THREE.BoxGeometry(0.1, 0.05, length);
      const railMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        metalness: 0.8,
        roughness: 0.2
      });

      // Create two rails
      for (let side of [-1, 1]) {
        const rail = new THREE.Mesh(railGeometry, railMaterial);

        // Position at midpoint
        rail.position.copy(start.clone().add(end).multiplyScalar(0.5));
        rail.position.x += side * ((this.size.width || 3) / 2 - 0.2);

        // Orient along direction
        rail.lookAt(end);
        rail.rotateX(Math.PI / 2);

        trackGroup.add(rail);
      }
    }

    // Add waypoint markers
    this.waypoints.forEach((wp, index) => {
      const markerGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
      const markerMaterial = new THREE.MeshStandardMaterial({
        color: index === 0 ? 0x00ff00 : index === this.waypoints.length - 1 ? 0xff0000 : 0xffff00,
        emissive:
          index === 0 ? 0x00ff00 : index === this.waypoints.length - 1 ? 0xff0000 : 0xffff00,
        emissiveIntensity: 0.3
      });

      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(wp.x, wp.y - 0.05, wp.z);
      trackGroup.add(marker);
    });

    this.track = trackGroup;
    this.game.scene.add(this.track);
  }

  /**
   * Create physics body
   */
  createPhysicsBody() {
    if (!this.game?.physicsWorld) return;

    const shape = new CANNON.Box(
      new CANNON.Vec3(
        (this.size.width || 3) / 2,
        (this.size.height || 0.3) / 2,
        (this.size.depth || 3) / 2
      )
    );

    this.body = new CANNON.Body({
      mass: 0, // Kinematic body
      shape: shape,
      type: CANNON.Body.KINEMATIC
    });

    this.body.userData = {
      obstacle: this,
      type: this.type,
      isMovingPlatform: true
    };

    // Position at first waypoint
    const firstWaypoint = this.waypoints[0];
    this.body.position.set(firstWaypoint.x, firstWaypoint.y, firstWaypoint.z);

    this.game.physicsWorld.addBody(this.body);
  }

  /**
   * Setup interactions - override to handle continuous contact
   */
  setupInteractions() {
    if (this.eventManager) {
      // Listen for collision start
      this.eventManager.subscribe(EventTypes.PHYSICS_COLLISION, this.handleCollision.bind(this));

      // Listen for collision end
      this.eventManager.subscribe(
        EventTypes.PHYSICS_COLLISION_END,
        this.handleCollisionEnd.bind(this)
      );
    }
  }

  /**
   * Handle collision end to remove ball from platform
   */
  handleCollisionEnd(event) {
    if (!this.active || this.disposed) return;

    const { bodyA, bodyB } = event.data;

    // Check if this platform is involved
    if (bodyA !== this.body && bodyB !== this.body) return;

    // Check if the other body is a ball
    const otherBody = bodyA === this.body ? bodyB : bodyA;
    if (otherBody.userData?.type === 'ball') {
      this.ballsOnPlatform.delete(otherBody);
    }
  }

  /**
   * Handle ball contact - add to platform
   */
  onBallContact(ballBody) {
    this.ballsOnPlatform.add(ballBody);
  }

  /**
   * Update platform movement
   */
  updateAnimation(deltaTime) {
    // Handle pause at waypoints
    if (this.isPaused) {
      if (Date.now() - this.pauseStartTime >= this.pauseTime) {
        this.isPaused = false;

        // Move to next waypoint
        this.currentWaypointIndex = this.nextWaypointIndex;
        this.nextWaypointIndex = (this.nextWaypointIndex + 1) % this.waypoints.length;
        this.movementProgress = 0;
      }
      return;
    }

    // Calculate movement
    const currentWaypoint = this.waypoints[this.currentWaypointIndex];
    const nextWaypoint = this.waypoints[this.nextWaypointIndex];

    const start = new THREE.Vector3(currentWaypoint.x, currentWaypoint.y, currentWaypoint.z);
    const end = new THREE.Vector3(nextWaypoint.x, nextWaypoint.y, nextWaypoint.z);
    const distance = start.distanceTo(end);

    // Update progress
    const moveDistance = this.speed * deltaTime;
    this.movementProgress += moveDistance / distance;

    if (this.movementProgress >= 1) {
      // Reached waypoint
      this.movementProgress = 1;
      this.isPaused = true;
      this.pauseStartTime = Date.now();
    }

    // Calculate position
    let t = this.movementProgress;

    // Apply easing for smooth movement
    if (this.movementType === 'smooth') {
      t = this.easeInOutCubic(t);
    }

    const newPosition = start.clone().lerp(end, t);

    // Store previous position for velocity calculation
    const previousPosition = this.body.position.clone();

    // Update platform position
    this.body.position.copy(newPosition);
    this.group.position.copy(newPosition);

    // Calculate platform velocity for ball movement
    const platformVelocity = newPosition.clone().sub(previousPosition).divideScalar(deltaTime);

    // Update balls on platform
    this.ballsOnPlatform.forEach(ballBody => {
      // Add platform velocity to ball
      ballBody.position.x += platformVelocity.x * deltaTime;
      ballBody.position.y = newPosition.y + (this.size.height || 0.3) / 2 + 0.2;
      ballBody.position.z += platformVelocity.z * deltaTime;
    });
  }

  /**
   * Easing function for smooth movement
   */
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Dispose of the platform
   */
  dispose() {
    // Remove track
    if (this.track && this.game?.scene) {
      this.track.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      this.game.scene.remove(this.track);
    }

    // Clear ball references
    this.ballsOnPlatform.clear();

    // Unsubscribe from collision end events
    if (this.eventManager) {
      this.eventManager.unsubscribe(EventTypes.PHYSICS_COLLISION_END, this.handleCollisionEnd);
    }

    super.dispose();
  }
}
