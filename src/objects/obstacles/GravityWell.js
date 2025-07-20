import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Obstacle } from './Obstacle';
import { EventTypes } from '../../events/EventTypes';

/**
 * Gravity Well - attracts or repels the ball with physics forces
 */
export class GravityWell extends Obstacle {
  constructor(config = {}) {
    super(config);

    this.type = 'gravitywell';

    // Gravity properties
    this.force = config.force || 10; // Positive = attract, Negative = repel
    this.radius = config.radius || 5; // Effect radius
    this.falloff = config.falloff || 'linear'; // 'linear', 'quadratic', 'exponential'
    this.maxForce = config.maxForce || 20; // Cap on maximum force

    // Visual properties
    this.color = config.color || (this.force > 0 ? 0x9900ff : 0x00ff99);
    this.coreSize = config.coreSize || 0.5;

    // Components
    this.core = null;
    this.rings = [];
    this.particles = [];
    this.fieldMesh = null;
    this.ballsInRange = new Map(); // Track balls and their distances
  }

  /**
   * Create the gravity well mesh
   */
  createMesh() {
    // Create core sphere
    this.createCore();

    // Create field visualization
    this.createFieldVisualization();

    // Create orbital rings
    this.createOrbitalRings();

    // Create particle field
    this.createParticleField();
  }

  /**
   * Create the core of the gravity well
   */
  createCore() {
    const coreGeometry = new THREE.SphereGeometry(this.coreSize, 32, 32);

    const coreMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 2,
      metalness: 0.8,
      roughness: 0.2
    });

    this.core = new THREE.Mesh(coreGeometry, coreMaterial);
    this.group.add(this.core);

    // Add inner glow
    const glowGeometry = new THREE.SphereGeometry(this.coreSize * 1.5, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.3
    });

    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.group.add(glow);
  }

  /**
   * Create field visualization
   */
  createFieldVisualization() {
    // Create custom shader for field effect
    const fieldMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(this.color) },
        time: { value: 0 },
        radius: { value: this.radius },
        isAttractor: { value: this.force > 0 }
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          vPosition = position;
          vNormal = normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float time;
        uniform float radius;
        uniform bool isAttractor;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          float dist = length(vPosition);
          float normalizedDist = dist / radius;
          
          // Create ripple effect
          float ripple = sin(normalizedDist * 10.0 - time * 2.0) * 0.5 + 0.5;
          
          // Fade based on distance
          float alpha = (1.0 - normalizedDist) * 0.2 * ripple;
          
          // Different patterns for attract vs repel
          if (isAttractor) {
            alpha *= (1.0 - normalizedDist); // Stronger at center
          } else {
            alpha *= normalizedDist; // Stronger at edge
          }
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const fieldGeometry = new THREE.SphereGeometry(this.radius, 32, 32);
    this.fieldMesh = new THREE.Mesh(fieldGeometry, fieldMaterial);
    this.group.add(this.fieldMesh);
  }

  /**
   * Create orbital rings
   */
  createOrbitalRings() {
    const ringCount = 3;

    for (let i = 0; i < ringCount; i++) {
      const ringRadius = this.radius * (0.3 + i * 0.3);
      const ringGeometry = new THREE.TorusGeometry(ringRadius, 0.05, 8, 64);

      const ringMaterial = new THREE.MeshBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: 0.5 - i * 0.15
      });

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);

      // Random orientation
      ring.rotation.x = Math.random() * Math.PI;
      ring.rotation.y = Math.random() * Math.PI;
      ring.rotationSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );

      this.rings.push(ring);
      this.group.add(ring);
    }
  }

  /**
   * Create particle field effect
   */
  createParticleField() {
    const particleCount = 50;
    const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);

    for (let i = 0; i < particleCount; i++) {
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: 0.6
      });

      const particle = new THREE.Mesh(particleGeometry, particleMaterial);

      // Random position within radius
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = Math.random() * this.radius;

      particle.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      // Store initial position for animation
      particle.userData = {
        initialPos: particle.position.clone(),
        offset: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5
      };

      this.particles.push(particle);
      this.group.add(particle);
    }
  }

  /**
   * Create physics body for detection
   */
  createPhysicsBody() {
    if (!this.game?.physicsWorld) return;

    // Create a trigger sphere for detection
    const shape = new CANNON.Sphere(this.radius);

    this.body = new CANNON.Body({
      mass: 0,
      shape: shape,
      position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
      isTrigger: true
    });

    this.body.userData = {
      obstacle: this,
      type: this.type,
      isGravityWell: true
    };

    this.game.physicsWorld.addBody(this.body);
  }

  /**
   * Handle ball entering range
   */
  onBallContact(ballBody) {
    if (!this.ballsInRange.has(ballBody)) {
      this.ballsInRange.set(ballBody, {
        body: ballBody,
        enteredTime: Date.now()
      });

      // Emit event
      if (this.eventManager) {
        this.eventManager.publish(EventTypes.OBSTACLE_ACTIVATED, {
          obstacle: this,
          type: 'gravitywell',
          ball: ballBody.userData?.ball,
          action: 'entered'
        });
      }
    }
  }

  /**
   * Update gravity effects on balls
   */
  update(deltaTime) {
    super.update(deltaTime);

    // Check all balls in physics world
    if (this.game?.physicsWorld?.world) {
      const bodies = this.game.physicsWorld.world.bodies;

      bodies.forEach(body => {
        if (body.userData?.type === 'ball') {
          const distance = body.position.distanceTo(this.body.position);

          if (distance <= this.radius) {
            // Ball is in range
            if (!this.ballsInRange.has(body)) {
              this.onBallContact(body);
            }

            // Apply gravity force
            this.applyGravityForce(body, distance, deltaTime);
          } else {
            // Ball left range
            if (this.ballsInRange.has(body)) {
              this.ballsInRange.delete(body);

              if (this.eventManager) {
                this.eventManager.publish(EventTypes.OBSTACLE_ACTIVATED, {
                  obstacle: this,
                  type: 'gravitywell',
                  ball: body.userData?.ball,
                  action: 'exited'
                });
              }
            }
          }
        }
      });
    }
  }

  /**
   * Apply gravity force to ball
   */
  applyGravityForce(ballBody, distance, deltaTime) {
    if (distance < 0.1) distance = 0.1; // Prevent division by zero

    // Calculate force magnitude based on falloff
    let forceMagnitude = this.force;

    switch (this.falloff) {
      case 'linear':
        forceMagnitude *= 1 - distance / this.radius;
        break;
      case 'quadratic':
        forceMagnitude *= Math.pow(1 - distance / this.radius, 2);
        break;
      case 'exponential':
        forceMagnitude *= Math.exp((-distance / this.radius) * 3);
        break;
    }

    // Cap the force
    forceMagnitude = Math.max(-this.maxForce, Math.min(this.maxForce, forceMagnitude));

    // Calculate direction (toward center for attract, away for repel)
    const direction = new CANNON.Vec3();
    this.body.position.vsub(ballBody.position, direction);
    direction.normalize();

    if (this.force < 0) {
      direction.scale(-1, direction); // Reverse for repulsion
    }

    // Apply force
    const force = direction.scale(forceMagnitude * deltaTime * 60); // 60 for frame independence
    ballBody.velocity.vadd(force, ballBody.velocity);

    // Add some visual feedback
    this.createForceVisualization(ballBody.position, direction, forceMagnitude);
  }

  /**
   * Create visual feedback for force application
   */
  createForceVisualization(position, direction, magnitude) {
    if (!this.game || Math.random() > 0.1) return; // Limit particle creation

    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 4, 4),
      new THREE.MeshBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: 1
      })
    );

    particle.position.copy(position);

    // Move toward/away from center
    const velocity = direction.clone().multiplyScalar(this.force > 0 ? 5 : -5);
    particle.velocity = new THREE.Vector3(velocity.x, velocity.y, velocity.z);

    particle.life = 0.5;
    particle.decay = 0.02;

    this.game.scene.add(particle);

    this.particles.push({
      mesh: particle,
      update: deltaTime => {
        particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
        particle.life -= particle.decay;
        particle.material.opacity = particle.life * 2;

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

  /**
   * Update animation
   */
  updateAnimation(deltaTime) {
    const time = Date.now() * 0.001;

    // Update shader uniforms
    if (this.fieldMesh) {
      this.fieldMesh.material.uniforms.time.value = time;
    }

    // Rotate core
    if (this.core) {
      this.core.rotation.y += deltaTime * 0.5;
    }

    // Animate rings
    this.rings.forEach(ring => {
      ring.rotation.x += ring.rotationSpeed.x * deltaTime;
      ring.rotation.y += ring.rotationSpeed.y * deltaTime;
      ring.rotation.z += ring.rotationSpeed.z * deltaTime;
    });

    // Animate field particles
    this.particles.forEach(particle => {
      if (particle.userData) {
        const t = time * particle.userData.speed + particle.userData.offset;
        const radius = particle.userData.initialPos.length();

        if (this.force > 0) {
          // Spiral inward for attractors
          const spiralRadius = radius * (1 - (Math.sin(t) * 0.5 + 0.5) * 0.3);
          particle.position.x = Math.cos(t * 2) * spiralRadius;
          particle.position.z = Math.sin(t * 2) * spiralRadius;
          particle.position.y = particle.userData.initialPos.y + Math.sin(t * 3) * 0.2;
        } else {
          // Spiral outward for repulsors
          const spiralRadius = radius * (1 + (Math.sin(t) * 0.5 + 0.5) * 0.3);
          particle.position.x = Math.cos(t * 2) * spiralRadius;
          particle.position.z = Math.sin(t * 2) * spiralRadius;
          particle.position.y = particle.userData.initialPos.y + Math.cos(t * 3) * 0.2;
        }
      }
    });
  }

  /**
   * Dispose of the gravity well
   */
  dispose() {
    // Clear ball tracking
    this.ballsInRange.clear();

    // Dispose field mesh
    if (this.fieldMesh) {
      if (this.fieldMesh.geometry) this.fieldMesh.geometry.dispose();
      if (this.fieldMesh.material) this.fieldMesh.material.dispose();
    }

    super.dispose();
  }
}
