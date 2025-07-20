import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Obstacle } from './Obstacle';
import { EventTypes } from '../../events/EventTypes';

/**
 * Rotating Barrier - a barrier that rotates continuously, requiring timing to pass
 */
export class RotatingBarrier extends Obstacle {
  constructor(config = {}) {
    super(config);

    this.type = 'rotatingbarrier';

    // Rotation properties
    this.rotationSpeed = config.rotationSpeed || 1; // radians per second
    this.rotationAxis = config.rotationAxis || 'y'; // 'x', 'y', or 'z'
    this.rotationDirection = config.rotationDirection || 1; // 1 or -1

    // Barrier properties
    this.armCount = config.armCount || 4;
    this.armLength = config.armLength || 3;
    this.armWidth = config.armWidth || 0.5;
    this.armHeight = config.armHeight || 0.8;
    this.centerRadius = config.centerRadius || 0.5;

    // Visual properties
    this.color = config.color || 0xff0044;
    this.warningColor = config.warningColor || 0xffff00;

    // Components
    this.arms = [];
    this.center = null;
    this.warningLights = [];
    this.currentRotation = 0;
  }

  /**
   * Create the barrier mesh
   */
  createMesh() {
    // Create center hub
    this.createCenterHub();

    // Create rotating arms
    this.createArms();

    // Add warning lights
    this.createWarningLights();

    // Add motion blur effect
    this.createMotionBlur();
  }

  /**
   * Create the center hub
   */
  createCenterHub() {
    const hubGeometry = new THREE.CylinderGeometry(
      this.centerRadius,
      this.centerRadius,
      this.armHeight + 0.2,
      16
    );

    const hubMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2
    });

    this.center = new THREE.Mesh(hubGeometry, hubMaterial);
    this.center.position.y = this.armHeight / 2;
    this.group.add(this.center);

    // Add center cap
    const capGeometry = new THREE.CylinderGeometry(
      this.centerRadius * 1.2,
      this.centerRadius * 1.2,
      0.1,
      16
    );

    const capMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 0.3,
      metalness: 0.7,
      roughness: 0.3
    });

    const topCap = new THREE.Mesh(capGeometry, capMaterial);
    topCap.position.y = this.armHeight + 0.1;
    this.group.add(topCap);

    const bottomCap = new THREE.Mesh(capGeometry, capMaterial);
    bottomCap.position.y = -0.05;
    this.group.add(bottomCap);
  }

  /**
   * Create rotating arms
   */
  createArms() {
    const armGeometry = new THREE.BoxGeometry(this.armLength, this.armHeight, this.armWidth);

    for (let i = 0; i < this.armCount; i++) {
      const angle = (i / this.armCount) * Math.PI * 2;

      // Create arm group for easier rotation
      const armGroup = new THREE.Group();

      // Create arm mesh
      const armMaterial = new THREE.MeshStandardMaterial({
        color: this.color,
        metalness: 0.6,
        roughness: 0.4
      });

      const arm = new THREE.Mesh(armGeometry, armMaterial);
      arm.position.x = this.armLength / 2 + this.centerRadius;
      arm.position.y = this.armHeight / 2;

      // Add warning stripes
      this.addWarningStripes(arm);

      armGroup.add(arm);
      armGroup.rotation.y = angle;

      this.arms.push(armGroup);
      this.group.add(armGroup);
    }
  }

  /**
   * Add warning stripes to arm
   */
  addWarningStripes(arm) {
    const stripeCount = Math.floor(this.armLength / 0.5);
    const stripeGeometry = new THREE.PlaneGeometry(0.4, this.armHeight * 0.9);

    for (let i = 0; i < stripeCount; i++) {
      if (i % 2 === 0) continue; // Alternate stripes

      const stripeMaterial = new THREE.MeshBasicMaterial({
        color: this.warningColor,
        side: THREE.DoubleSide
      });

      const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
      stripe.position.x = (i / stripeCount - 0.5) * this.armLength;
      stripe.position.z = this.armWidth / 2 + 0.01;
      arm.add(stripe);

      // Add stripe on back too
      const backStripe = stripe.clone();
      backStripe.position.z = -this.armWidth / 2 - 0.01;
      arm.add(backStripe);
    }
  }

  /**
   * Create warning lights
   */
  createWarningLights() {
    const lightGeometry = new THREE.SphereGeometry(0.1, 8, 8);

    this.arms.forEach((armGroup, index) => {
      const lightMaterial = new THREE.MeshBasicMaterial({
        color: this.warningColor,
        emissive: this.warningColor,
        emissiveIntensity: 1
      });

      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      light.position.x = this.armLength + this.centerRadius;
      light.position.y = this.armHeight / 2;

      armGroup.add(light);
      this.warningLights.push(light);

      // Add point light
      const pointLight = new THREE.PointLight(this.warningColor, 0.5, 2);
      pointLight.position.copy(light.position);
      armGroup.add(pointLight);
    });
  }

  /**
   * Create motion blur effect
   */
  createMotionBlur() {
    // Create transparent cylinder for blur effect
    const blurGeometry = new THREE.CylinderGeometry(
      this.armLength + this.centerRadius,
      this.armLength + this.centerRadius,
      this.armHeight,
      32,
      1,
      true
    );

    const blurMaterial = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    });

    this.blurMesh = new THREE.Mesh(blurGeometry, blurMaterial);
    this.blurMesh.position.y = this.armHeight / 2;
    this.group.add(this.blurMesh);
  }

  /**
   * Create physics bodies for arms
   */
  createPhysicsBody() {
    if (!this.game?.physicsWorld) return;

    // Create a compound body with all arms
    this.body = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.KINEMATIC
    });

    // Add shapes for each arm
    for (let i = 0; i < this.armCount; i++) {
      const angle = (i / this.armCount) * Math.PI * 2;

      const armShape = new CANNON.Box(
        new CANNON.Vec3(this.armLength / 2, this.armHeight / 2, this.armWidth / 2)
      );

      // Position relative to body center
      const offsetX = Math.cos(angle) * (this.armLength / 2 + this.centerRadius);
      const offsetZ = Math.sin(angle) * (this.armLength / 2 + this.centerRadius);

      this.body.addShape(
        armShape,
        new CANNON.Vec3(offsetX, this.armHeight / 2, offsetZ),
        new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle)
      );
    }

    // Add center hub shape
    const hubShape = new CANNON.Cylinder(this.centerRadius, this.centerRadius, this.armHeight, 8);

    this.body.addShape(hubShape, new CANNON.Vec3(0, this.armHeight / 2, 0));

    this.body.position.copy(this.position);

    this.body.userData = {
      obstacle: this,
      type: this.type,
      isRotatingBarrier: true
    };

    this.game.physicsWorld.addBody(this.body);
  }

  /**
   * Handle ball contact
   */
  onBallContact(ballBody) {
    // Calculate impact force based on rotation speed and contact point
    const contactPoint = ballBody.position.clone().sub(this.body.position);
    contactPoint.y = 0; // Only consider horizontal plane

    // Calculate tangential velocity at contact point
    const distance = contactPoint.length();
    const tangentialSpeed = distance * Math.abs(this.rotationSpeed);

    // Calculate impact direction (perpendicular to radius)
    const impactDirection = new THREE.Vector3(-contactPoint.z, 0, contactPoint.x).normalize();

    if (this.rotationDirection < 0) {
      impactDirection.multiplyScalar(-1);
    }

    // Apply impact force
    const impactForce = impactDirection.multiplyScalar(tangentialSpeed * 5);
    ballBody.velocity.x += impactForce.x;
    ballBody.velocity.z += impactForce.z;
    ballBody.velocity.y += 2; // Small upward bounce

    // Create impact effect
    this.createImpactEffect(contactPoint.add(this.body.position));

    // Emit event
    if (this.eventManager) {
      this.eventManager.publish(EventTypes.OBSTACLE_ACTIVATED, {
        obstacle: this,
        type: 'rotatingbarrier',
        ball: ballBody.userData?.ball,
        impactForce: impactForce
      });
    }
  }

  /**
   * Create impact particle effect
   */
  createImpactEffect(position) {
    if (!this.game) return;

    const particleCount = 10;

    for (let i = 0; i < particleCount; i++) {
      const particleGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: 1
      });

      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(position);

      // Random velocity
      particle.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 5
      );

      particle.rotationSpeed = new THREE.Vector3(
        Math.random() * 10,
        Math.random() * 10,
        Math.random() * 10
      );

      particle.life = 1.0;
      particle.decay = 0.02;

      this.game.scene.add(particle);

      this.particles.push({
        mesh: particle,
        update: deltaTime => {
          particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
          particle.velocity.y -= 9.8 * deltaTime;

          particle.rotation.x += particle.rotationSpeed.x * deltaTime;
          particle.rotation.y += particle.rotationSpeed.y * deltaTime;
          particle.rotation.z += particle.rotationSpeed.z * deltaTime;

          particle.life -= particle.decay;
          particle.material.opacity = particle.life;
          particle.scale.setScalar(particle.life);

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
   * Update animation
   */
  updateAnimation(deltaTime) {
    // Update rotation
    const rotationDelta = this.rotationSpeed * this.rotationDirection * deltaTime;
    this.currentRotation += rotationDelta;

    // Apply rotation based on axis
    switch (this.rotationAxis) {
      case 'x':
        this.group.rotation.x = this.currentRotation;
        this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), this.currentRotation);
        break;
      case 'y':
        this.group.rotation.y = this.currentRotation;
        this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.currentRotation);
        break;
      case 'z':
        this.group.rotation.z = this.currentRotation;
        this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), this.currentRotation);
        break;
    }

    // Update warning lights
    this.warningLights.forEach((light, index) => {
      const pulse = Math.sin(this.currentRotation * 4 + (index * Math.PI) / 2) * 0.5 + 0.5;
      light.material.emissiveIntensity = pulse;
    });

    // Update motion blur opacity based on speed
    if (this.blurMesh) {
      this.blurMesh.material.opacity = Math.min(Math.abs(this.rotationSpeed) * 0.1, 0.3);
    }
  }

  /**
   * Dispose of the barrier
   */
  dispose() {
    // Dispose arms
    this.arms.forEach(armGroup => {
      armGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    });

    super.dispose();
  }
}
