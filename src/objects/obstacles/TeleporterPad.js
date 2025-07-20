import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Obstacle } from './Obstacle';
import { EventTypes } from '../../events/EventTypes';

/**
 * Teleporter Pad - instantly transports the ball to a target location
 */
export class TeleporterPad extends Obstacle {
  constructor(config = {}) {
    super(config);

    this.type = 'teleporter';

    // Exit position configuration
    this.exitPosition = config.exitPosition
      ? config.exitPosition instanceof THREE.Vector3
        ? config.exitPosition.clone()
        : new THREE.Vector3(
            config.exitPosition.x || 0,
            config.exitPosition.y || 0,
            config.exitPosition.z || 0
          )
      : new THREE.Vector3(0, 0, 10);
    this.targetPosition = this.exitPosition;

    // Teleporter properties
    this.teleportDelay = config.teleportDelay || 0.5;
    this.cooldownTime = config.cooldownTime || 2;

    // Visual properties
    this.color = config.color || 0x00ffff;
    this.particleColor = config.particleColor || 0x00ffff;
    this.particleCount = config.particleCount || 50;
    this.glowIntensity = config.glowIntensity || 2.0;

    // State
    this.lastTeleportTime = 0;
    this.isCharging = false;
    this.teleportingBalls = new Map();
    this.cooldownBalls = new Set();

    // Animation
    this.animationTime = 0;
    this.particleSystem = null;
    this.glowLight = null;
    this.targetMarker = null;
    this.rings = [];
    this.padMesh = null;
    this.portalPlane = null;
  }

  /**
   * Create the teleporter pad mesh
   */
  createMesh() {
    // Main pad geometry - circular platform
    const geometry = new THREE.CylinderGeometry(
      this.size.radius || 1,
      this.size.radius || 1,
      0.1,
      32
    );

    // Create glowing material
    this.material = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: this.glowIntensity,
      metalness: 0.8,
      roughness: 0.2
    });

    this.padMesh = new THREE.Mesh(geometry, this.material);
    this.mesh = this.padMesh; // Keep reference for base class
    this.padMesh.position.y = 0.05;
    this.group.add(this.padMesh);

    // Add ring effects
    this.createRings();

    // Add center crystal
    this.createCrystal();

    // Create target marker at destination
    this.createTargetMarker();

    // Create portal plane
    this.createPortalPlane();
  }

  /**
   * Create animated rings
   */
  createRings() {
    const ringCount = 3;
    this.rings = [];

    for (let i = 0; i < ringCount; i++) {
      const ringGeometry = new THREE.TorusGeometry(
        (this.size.radius || 1) * (1 + i * 0.3),
        0.05,
        8,
        32
      );

      const ringMaterial = new THREE.MeshStandardMaterial({
        color: this.color,
        emissive: this.color,
        emissiveIntensity: this.glowIntensity * 0.5,
        transparent: true,
        opacity: 0.6 - i * 0.2
      });

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.1 + i * 0.05;

      this.rings.push(ring);
      this.group.add(ring);
    }
  }

  /**
   * Create central energy crystal
   */
  createCrystal() {
    const crystalGeometry = new THREE.OctahedronGeometry(0.3, 0);
    const crystalMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: this.color,
      emissiveIntensity: this.glowIntensity * 2,
      transparent: true,
      opacity: 0.8
    });

    this.crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
    this.crystal.position.y = 0.5;
    this.group.add(this.crystal);
  }

  /**
   * Create target marker at destination
   */
  createTargetMarker() {
    if (!this.game) return;

    const markerGroup = new THREE.Group();

    // Target ring
    const ringGeometry = new THREE.TorusGeometry(this.size.radius || 1, 0.1, 8, 32);

    const ringMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: this.glowIntensity * 0.3,
      transparent: true,
      opacity: 0.5
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    markerGroup.add(ring);

    markerGroup.position.set(this.targetPosition.x, this.targetPosition.y, this.targetPosition.z);
    markerGroup.position.y = 0.1;

    this.targetMarker = markerGroup;
    this.game.scene.add(this.targetMarker);
  }

  /**
   * Create physics body for trigger detection
   */
  createPhysicsBody() {
    if (!this.game?.physicsWorld) return;

    // Create cylinder trigger zone
    const shape = new CANNON.Box(
      new CANNON.Vec3(this.size.radius || 1, 0.5, this.size.radius || 1)
    );

    this.body = new CANNON.Body({
      mass: 0,
      shape: shape,
      position: new CANNON.Vec3(this.position.x, this.position.y + 0.5, this.position.z),
      isTrigger: true
    });

    this.body.userData = {
      obstacle: this,
      type: this.type,
      isTeleporter: true
    };

    this.game.physicsWorld.addBody(this.body);
  }

  /**
   * Create portal plane with shader
   */
  createPortalPlane() {
    const planeGeometry = new THREE.PlaneGeometry(
      this.size.radius * 2 || 2,
      this.size.radius * 2 || 2
    );

    const portalMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(this.color) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;
        void main() {
          float wave = sin(vUv.x * 10.0 + time) * 0.5 + 0.5;
          gl_FragColor = vec4(color * wave, 0.5);
        }
      `,
      transparent: true
    });

    this.portalPlane = new THREE.Mesh(planeGeometry, portalMaterial);
    this.portalPlane.rotation.x = -Math.PI / 2;
    this.portalPlane.position.y = 0.02;
    this.group.add(this.portalPlane);
  }

  /**
   * Create particle effects
   */
  createEffects() {
    // Add point light
    this.glowLight = new THREE.PointLight(this.color, 1, 5);
    this.glowLight.position.y = 0.5;
    this.group.add(this.glowLight);

    // Particle system will be created on teleport
  }

  /**
   * Handle ball contact
   */
  onBallContact(ballBody) {
    const currentTime = Date.now();

    // Check cooldown
    if (currentTime - this.lastTeleportTime < this.cooldownTime) {
      return;
    }

    // Get ball reference
    const ball = ballBody.userData?.ball;
    if (!ball) return;

    // Start teleport sequence
    this.teleportBall(ball, ballBody);
    this.lastTeleportTime = currentTime;
  }

  /**
   * Teleport the ball
   */
  teleportBall(ball, ballBody) {
    // Create teleport effect at current position
    this.createTeleportEffect(ballBody.position);

    // Stop ball velocity
    ballBody.velocity.set(0, 0, 0);
    ballBody.angularVelocity.set(0, 0, 0);

    // Set new position
    ballBody.position.copy(this.targetPosition);
    ballBody.position.y = this.targetPosition.y + 0.5; // Drop from above

    // Update ball mesh immediately
    if (ball.mesh) {
      ball.mesh.position.copy(ballBody.position);
    }

    // Create arrival effect
    setTimeout(() => {
      this.createTeleportEffect(this.targetPosition);
    }, 100);

    // Emit event
    if (this.eventManager) {
      this.eventManager.publish(EventTypes.OBSTACLE_ACTIVATED, {
        obstacle: this,
        type: 'teleporter',
        ball: ball,
        from: this.position,
        to: this.targetPosition
      });
    }

    // Start charging animation
    this.isCharging = true;
  }

  /**
   * Create entrance portal effect
   */
  createEntrancePortal(position) {
    this.createTeleportEffect(position);
  }

  /**
   * Create exit portal effect
   */
  createExitPortal(position) {
    this.createTeleportEffect(position);
  }

  /**
   * Create teleport particle effect
   */
  createTeleportEffect(position) {
    if (!this.game) return;

    const particleCount = this.particleCount || 50;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: this.particleColor,
        transparent: true,
        opacity: 1
      });

      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(position);

      // Random velocity
      particle.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 5 + 2,
        (Math.random() - 0.5) * 5
      );

      particle.life = 1.0;
      particle.decay = 0.02;

      particles.push(particle);
      this.game.scene.add(particle);
    }

    // Store particles for update
    this.particles.push(
      ...particles.map(particle => ({
        mesh: particle,
        update: deltaTime => {
          particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
          particle.velocity.y -= 9.8 * deltaTime; // Gravity

          particle.life -= particle.decay;
          particle.material.opacity = particle.life;

          if (particle.life <= 0) {
            particle.isDead = true;
          }
        },
        dispose: () => {
          if (particle.geometry && particle.geometry.dispose) {
            particle.geometry.dispose();
          }
          if (particle.material && particle.material.dispose) {
            particle.material.dispose();
          }
          this.game.scene.remove(particle);
        },
        isDead: false
      }))
    );
  }

  /**
   * Update animation
   */
  updateAnimation(deltaTime) {
    this.animationTime += deltaTime;

    // Rotate crystal
    if (this.crystal) {
      this.crystal.rotation.y += deltaTime * 2;
      this.crystal.position.y = 0.5 + Math.sin(this.animationTime * 3) * 0.1;
    }

    // Animate rings
    this.rings.forEach((ring, index) => {
      ring.rotation.z += deltaTime * (1 + index * 0.5);
      ring.scale.setScalar(1 + Math.sin(this.animationTime * 2 + index) * 0.1);
    });

    // Pulse glow when charging
    if (this.isCharging) {
      const chargeProgress = (Date.now() - this.lastTeleportTime) / this.cooldownTime;
      if (chargeProgress >= 1) {
        this.isCharging = false;
        this.material.emissiveIntensity = this.glowIntensity;
      } else {
        this.material.emissiveIntensity = this.glowIntensity * chargeProgress;
      }
    }

    // Animate target marker
    if (this.targetMarker) {
      this.targetMarker.rotation.y += deltaTime;
    }

    // Update portal plane shader
    if (this.portalPlane && this.portalPlane.material.uniforms) {
      this.portalPlane.material.uniforms.time.value = this.animationTime;
    }
  }

  /**
   * Dispose of the teleporter
   */
  dispose() {
    // Remove target marker
    if (this.targetMarker && this.game?.scene) {
      this.game.scene.remove(this.targetMarker);
    }

    // Dispose rings
    if (this.rings) {
      this.rings.forEach(ring => {
        if (ring.geometry) ring.geometry.dispose();
        if (ring.material && ring.material.dispose) {
          ring.material.dispose();
        }
      });
    }

    // Dispose crystal
    if (this.crystal) {
      if (this.crystal.geometry) this.crystal.geometry.dispose();
      if (this.crystal.material && this.crystal.material.dispose) {
        this.crystal.material.dispose();
      }
    }

    // Dispose portal plane
    if (this.portalPlane) {
      if (this.portalPlane.geometry && this.portalPlane.geometry.dispose) {
        this.portalPlane.geometry.dispose();
      }
      if (this.portalPlane.material && this.portalPlane.material.dispose) {
        this.portalPlane.material.dispose();
      }
    }

    // Clear tracking maps
    this.teleportingBalls.clear();
    this.cooldownBalls.clear();

    super.dispose();
  }
}
