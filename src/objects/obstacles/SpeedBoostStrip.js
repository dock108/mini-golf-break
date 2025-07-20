import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Obstacle } from './Obstacle';
import { EventTypes } from '../../events/EventTypes';

/**
 * Speed Boost Strip - accelerates the ball in a specific direction
 */
export class SpeedBoostStrip extends Obstacle {
  constructor(config = {}) {
    super(config);

    this.type = 'speedboost';

    // Boost properties
    this.boostDirection = new THREE.Vector3(
      config.direction?.x || 0,
      config.direction?.y || 0,
      config.direction?.z || 1
    ).normalize();
    this.boostForce = config.force || 10;
    this.boostType = config.boostType || 'additive'; // 'additive' or 'override'

    // Visual properties
    this.color = config.color || 0xff6600;
    this.arrowCount = config.arrowCount || 3;

    // Animation
    this.animationTime = 0;
    this.arrows = [];
    this.trailParticles = [];
  }

  /**
   * Create the speed boost strip mesh
   */
  createMesh() {
    // Main strip platform
    const geometry = new THREE.BoxGeometry(this.size.width || 2, 0.05, this.size.length || 4);

    // Create material with emissive glow
    this.material = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.3
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.y = 0.025;
    this.group.add(this.mesh);

    // Add directional arrows
    this.createArrows();

    // Add energy strips
    this.createEnergyStrips();

    // Add edge glow
    this.createEdgeGlow();
  }

  /**
   * Create directional arrow indicators
   */
  createArrows() {
    const arrowGeometry = new THREE.ConeGeometry(0.2, 0.6, 4);
    arrowGeometry.rotateX(-Math.PI / 2);

    const arrowMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.8
    });

    for (let i = 0; i < this.arrowCount; i++) {
      const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial.clone());

      // Position along the strip
      const t = (i + 0.5) / this.arrowCount;
      arrow.position.z = ((this.size.length || 4) - 1) * (t - 0.5);
      arrow.position.y = 0.1;

      // Orient to boost direction
      arrow.lookAt(arrow.position.clone().add(this.boostDirection));
      arrow.rotateX(-Math.PI / 2);

      this.arrows.push(arrow);
      this.group.add(arrow);
    }
  }

  /**
   * Create energy strip effects
   */
  createEnergyStrips() {
    const stripCount = 5;
    this.energyStrips = [];

    for (let i = 0; i < stripCount; i++) {
      const stripGeometry = new THREE.PlaneGeometry(0.1, this.size.length || 4);

      const stripMaterial = new THREE.MeshBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });

      const strip = new THREE.Mesh(stripGeometry, stripMaterial);
      strip.rotation.x = -Math.PI / 2;
      strip.position.x = (i / (stripCount - 1) - 0.5) * (this.size.width || 2) * 0.8;
      strip.position.y = 0.06;

      this.energyStrips.push(strip);
      this.group.add(strip);
    }
  }

  /**
   * Create edge glow effect
   */
  createEdgeGlow() {
    const edgeGeometry = new THREE.BoxGeometry(
      (this.size.width || 2) + 0.2,
      0.02,
      (this.size.length || 4) + 0.2
    );

    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.5
    });

    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.y = 0.01;
    this.group.add(edge);
  }

  /**
   * Create physics body for trigger detection
   */
  createPhysicsBody() {
    if (!this.game?.physicsWorld) return;

    const shape = new CANNON.Box(
      new CANNON.Vec3((this.size.width || 2) / 2, 0.5, (this.size.length || 4) / 2)
    );

    this.body = new CANNON.Body({
      mass: 0,
      shape: shape,
      position: new CANNON.Vec3(this.position.x, this.position.y + 0.5, this.position.z),
      isTrigger: true
    });

    // Apply rotation to body
    const quaternion = new CANNON.Quaternion();
    quaternion.setFromEuler(this.rotation.x, this.rotation.y, this.rotation.z);
    this.body.quaternion.copy(quaternion);

    this.body.userData = {
      obstacle: this,
      type: this.type,
      isSpeedBoost: true
    };

    this.game.physicsWorld.addBody(this.body);
  }

  /**
   * Handle ball contact
   */
  onBallContact(ballBody) {
    // Apply boost force
    const worldDirection = this.boostDirection.clone();

    // Transform direction by obstacle rotation
    worldDirection.applyEuler(this.rotation);

    if (this.boostType === 'override') {
      // Override current velocity
      ballBody.velocity.x = worldDirection.x * this.boostForce;
      ballBody.velocity.z = worldDirection.z * this.boostForce;
      // Preserve some vertical velocity
      ballBody.velocity.y = Math.max(ballBody.velocity.y, worldDirection.y * this.boostForce);
    } else {
      // Add to current velocity
      const boost = worldDirection.multiplyScalar(this.boostForce);
      ballBody.velocity.x += boost.x;
      ballBody.velocity.y += boost.y;
      ballBody.velocity.z += boost.z;
    }

    // Create boost effect
    this.createBoostEffect(ballBody.position);

    // Flash the strip
    this.flashStrip();

    // Emit event
    if (this.eventManager) {
      this.eventManager.publish(EventTypes.OBSTACLE_ACTIVATED, {
        obstacle: this,
        type: 'speedboost',
        ball: ballBody.userData?.ball,
        boostDirection: worldDirection,
        boostForce: this.boostForce
      });
    }
  }

  /**
   * Create boost particle effect
   */
  createBoostEffect(position) {
    if (!this.game) return;

    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      const particleGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.3);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: 1
      });

      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(position);
      particle.position.y = 0.2;

      // Particle moves in boost direction
      const spread = 0.3;
      const worldDirection = this.boostDirection.clone().applyEuler(this.rotation);
      particle.velocity = new THREE.Vector3(
        worldDirection.x + (Math.random() - 0.5) * spread,
        0.5 + Math.random() * 0.5,
        worldDirection.z + (Math.random() - 0.5) * spread
      ).multiplyScalar(3);

      particle.life = 1.0;
      particle.decay = 0.03;

      // Orient particle to direction
      particle.lookAt(particle.position.clone().add(particle.velocity));

      this.game.scene.add(particle);

      // Add to particles array for update
      this.particles.push({
        mesh: particle,
        update: deltaTime => {
          particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
          particle.velocity.y -= 5 * deltaTime; // Gravity

          particle.life -= particle.decay;
          particle.material.opacity = particle.life;
          particle.scale.z = particle.life;

          if (particle.life <= 0) {
            particle.isDead = true;
          }
        },
        dispose: () => {
          if (particle.geometry) particle.geometry.dispose();
          if (particle.material) particle.material.dispose();
          this.game.scene.remove(particle);
        },
        isDead: false
      });
    }
  }

  /**
   * Flash the strip when activated
   */
  flashStrip() {
    this.material.emissiveIntensity = 2.0;

    // Reset after a short time
    setTimeout(() => {
      this.material.emissiveIntensity = 0.5;
    }, 200);
  }

  /**
   * Update animation
   */
  updateAnimation(deltaTime) {
    this.animationTime += deltaTime;

    // Animate arrows
    this.arrows.forEach((arrow, index) => {
      const offset = index / this.arrowCount;
      const t = (this.animationTime * 2 + offset * Math.PI * 2) % (Math.PI * 2);

      // Pulse opacity
      arrow.material.opacity = 0.5 + Math.sin(t) * 0.3;

      // Move along strip
      const baseZ = ((this.size.length || 4) - 1) * ((index + 0.5) / this.arrowCount - 0.5);
      arrow.position.z = baseZ + Math.sin(t) * 0.3;
    });

    // Animate energy strips
    this.energyStrips.forEach((strip, index) => {
      const offset = index / this.energyStrips.length;
      strip.material.opacity = 0.2 + Math.sin(this.animationTime * 3 + offset * Math.PI) * 0.2;
    });
  }

  /**
   * Dispose of the speed boost
   */
  dispose() {
    // Dispose arrows
    if (this.arrows) {
      this.arrows.forEach(arrow => {
        if (arrow.geometry) arrow.geometry.dispose();
        if (arrow.material) arrow.material.dispose();
      });
    }

    // Dispose energy strips
    if (this.energyStrips) {
      this.energyStrips.forEach(strip => {
        if (strip.geometry) strip.geometry.dispose();
        if (strip.material) strip.material.dispose();
      });
    }

    super.dispose();
  }
}
