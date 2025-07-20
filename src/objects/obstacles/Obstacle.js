import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { EventTypes } from '../../events/EventTypes';

/**
 * Base class for all obstacles in the game
 * Provides common functionality for visual representation, physics, and effects
 */
export class Obstacle {
  constructor(config = {}) {
    this.id = config.id || `obstacle_${Math.random().toString(36).substr(2, 9)}`;
    this.type = config.type || 'base';
    this.position =
      config.position instanceof THREE.Vector3
        ? config.position.clone()
        : new THREE.Vector3(
            config.position?.x || 0,
            config.position?.y || 0,
            config.position?.z || 0
          );
    this.rotation =
      config.rotation instanceof THREE.Euler
        ? config.rotation.clone()
        : new THREE.Euler(
            config.rotation?.x || 0,
            config.rotation?.y || 0,
            config.rotation?.z || 0
          );
    this.size = config.size || { width: 1, height: 1, depth: 1 };
    this.name = config.name || 'Obstacle';
    this.scale =
      config.scale instanceof THREE.Vector3
        ? config.scale.clone()
        : new THREE.Vector3(config.scale?.x || 1, config.scale?.y || 1, config.scale?.z || 1);
    this.isActive = config.isActive !== undefined ? config.isActive : true;
    this.config = config;

    // Visual and physics components
    this.mesh = null;
    this.body = null;
    this.group = new THREE.Group();
    this.group.position.set(this.position.x, this.position.y, this.position.z);
    this.group.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);

    // State
    this.active = this.isActive;
    this.disposed = false;

    // Effects
    this.particles = [];
    this.lights = [];
    this.sounds = [];

    // References
    this.game = null;
    this.eventManager = null;
  }

  /**
   * Initialize the obstacle with game references
   */
  init(game) {
    if (this.disposed) return;

    this.game = game;
    this.eventManager = game.eventManager;

    // Create visual representation
    this.createMesh();

    // Create physics body
    this.createPhysicsBody();

    // Setup interaction handlers
    this.setupInteractions();

    // Create effects
    this.createEffects();

    return this;
  }

  /**
   * Create the visual mesh - to be overridden by subclasses
   */
  createMesh() {
    // Default cube mesh
    const geometry = new THREE.BoxGeometry(this.size.width, this.size.height, this.size.depth);

    const material = new THREE.MeshStandardMaterial({
      color: 0x808080,
      metalness: 0.5,
      roughness: 0.5
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.group.add(this.mesh);
  }

  /**
   * Create physics body - to be overridden by subclasses
   */
  createPhysicsBody() {
    if (!this.game?.physicsWorld) return;

    const shape = new CANNON.Box(
      new CANNON.Vec3(this.size.width / 2, this.size.height / 2, this.size.depth / 2)
    );

    this.body = new CANNON.Body({
      mass: 0, // Static by default
      shape: shape,
      position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
      type: CANNON.Body.STATIC
    });

    // Store reference to obstacle in body
    this.body.userData = { obstacle: this, type: this.type };

    this.game.physicsWorld.addBody(this.body);
  }

  /**
   * Setup interaction handlers
   */
  setupInteractions() {
    // Subscribe to collision events
    if (this.eventManager) {
      this.eventManager.subscribe(EventTypes.PHYSICS_COLLISION, this.handleCollision.bind(this));
    }
  }

  /**
   * Handle collision with the ball
   */
  handleCollision(event) {
    if (!this.active || this.disposed) return;

    const { bodyA, bodyB } = event.data;

    // Check if this obstacle is involved in the collision
    if (bodyA !== this.body && bodyB !== this.body) return;

    // Check if the other body is the ball
    const otherBody = bodyA === this.body ? bodyB : bodyA;
    if (otherBody.userData?.type !== 'ball') return;

    // Trigger obstacle effect
    this.onBallContact(otherBody);
  }

  /**
   * Called when ball contacts the obstacle - to be overridden by subclasses
   */
  onBallContact(ballBody) {
    // Default: no effect
  }

  /**
   * Create visual effects - to be overridden by subclasses
   */
  createEffects() {
    // Default: no effects
  }

  /**
   * Update the obstacle - called each frame
   */
  update(deltaTime) {
    if (!this.active || this.disposed) return;

    // Update particles
    this.updateParticles(deltaTime);

    // Update animations
    this.updateAnimation(deltaTime);

    // Sync physics with visual
    if (this.body && this.mesh) {
      if (this.mesh.position && this.mesh.position.copy) {
        this.mesh.position.copy(this.body.position);
      }
      if (this.mesh.quaternion && this.mesh.quaternion.copy) {
        this.mesh.quaternion.copy(this.body.quaternion);
      }
    }
  }

  /**
   * Update particle effects
   */
  updateParticles(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      if (particle.update) {
        particle.update(deltaTime);

        // Remove dead particles
        if (particle.isDead) {
          this.group.remove(particle.mesh);
          particle.dispose();
          this.particles.splice(i, 1);
        }
      }
    }
  }

  /**
   * Update animations - to be overridden by subclasses
   */
  updateAnimation(deltaTime) {
    // Default: no animation
  }

  /**
   * Activate the obstacle
   */
  activate() {
    this.active = true;
    if (this.mesh) {
      this.mesh.visible = true;
    }
    if (this.body) {
      this.body.collisionResponse = true;
    }
  }

  /**
   * Deactivate the obstacle
   */
  deactivate() {
    this.active = false;
    if (this.mesh) {
      this.mesh.visible = false;
    }
    if (this.body) {
      this.body.collisionResponse = false;
    }
  }

  /**
   * Set active state
   */
  setActive(active) {
    this.isActive = active;
    this.active = active; // for backward compatibility
    if (active) {
      this.activate();
    } else {
      this.deactivate();
    }
  }

  /**
   * Get the Three.js group containing all visual elements
   */
  getGroup() {
    return this.group;
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.disposed) return;

    // Unsubscribe from events
    if (this.eventManager) {
      this.eventManager.unsubscribe(EventTypes.PHYSICS_COLLISION, this.handleCollision);
    }

    // Dispose particles
    this.particles.forEach(particle => {
      if (particle.dispose) particle.dispose();
    });
    this.particles = [];

    // Dispose lights
    this.lights.forEach(light => {
      if (light.dispose) light.dispose();
    });
    this.lights = [];

    // Remove physics body
    if (this.body && this.game?.physicsWorld) {
      this.game.physicsWorld.removeBody(this.body);
    }

    // Dispose mesh
    if (this.mesh) {
      if (this.mesh.geometry && this.mesh.geometry.dispose) {
        this.mesh.geometry.dispose();
      }
      if (this.mesh.material) {
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(mat => mat.dispose && mat.dispose());
        } else if (this.mesh.material.dispose) {
          this.mesh.material.dispose();
        }
      }
    }

    // Clear group
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    this.disposed = true;
  }
}
