import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Obstacle } from './Obstacle';
import { EventTypes } from '../../events/EventTypes';

/**
 * Force Field - creates a directional force field that pushes the ball
 */
export class ForceField extends Obstacle {
  constructor(config = {}) {
    super(config);

    this.type = 'forcefield';

    // Force properties
    this.forceDirection = new THREE.Vector3(
      config.forceDirection?.x || 0,
      config.forceDirection?.y || 1,
      config.forceDirection?.z || 0
    ).normalize();
    this.forceMagnitude = config.forceMagnitude || 5;
    this.fieldType = config.fieldType || 'constant'; // 'constant', 'pulsing', 'wave'

    // Visual properties
    this.color = config.color || 0x00ffcc;
    this.opacity = config.opacity || 0.3;

    // Animation
    this.animationTime = 0;
    this.flowLines = [];
    this.hexGrid = [];
  }

  /**
   * Create the force field mesh
   */
  createMesh() {
    // Create field boundary box
    this.createFieldBoundary();

    // Create hex grid pattern
    this.createHexGrid();

    // Create flow lines
    this.createFlowLines();

    // Create energy walls
    this.createEnergyWalls();
  }

  /**
   * Create field boundary visualization
   */
  createFieldBoundary() {
    const geometry = new THREE.BoxGeometry(
      this.size.width || 3,
      this.size.height || 4,
      this.size.depth || 3
    );

    // Create wireframe for boundary
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.8
    });

    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    this.group.add(wireframe);
  }

  /**
   * Create hexagonal grid pattern
   */
  createHexGrid() {
    const hexRadius = 0.3;
    const rows = Math.ceil((this.size.height || 4) / (hexRadius * 1.5));
    const cols = Math.ceil((this.size.width || 3) / (hexRadius * 2));

    const hexGeometry = new THREE.CircleGeometry(hexRadius, 6);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const hexMaterial = new THREE.MeshBasicMaterial({
          color: this.color,
          transparent: true,
          opacity: 0.1,
          side: THREE.DoubleSide
        });

        const hex = new THREE.Mesh(hexGeometry, hexMaterial);

        // Position in grid with hex offset
        hex.position.x = (col - cols / 2) * hexRadius * 1.7 + (row % 2) * hexRadius * 0.85;
        hex.position.y = (row - rows / 2) * hexRadius * 1.5;
        hex.position.z = -(this.size.depth || 3) / 2 - 0.01;

        // Face the field direction
        hex.lookAt(hex.position.clone().add(this.forceDirection));

        // Store animation data
        hex.userData = {
          row: row,
          col: col,
          baseOpacity: 0.1
        };

        this.hexGrid.push(hex);
        this.group.add(hex);
      }
    }
  }

  /**
   * Create flow lines showing force direction
   */
  createFlowLines() {
    const lineCount = 10;

    for (let i = 0; i < lineCount; i++) {
      // Create line path
      const points = [];
      const segments = 20;

      for (let j = 0; j < segments; j++) {
        const t = j / (segments - 1);
        const point = new THREE.Vector3(
          (Math.random() - 0.5) * (this.size.width || 3),
          (Math.random() - 0.5) * (this.size.height || 4),
          -(this.size.depth || 3) / 2 + t * (this.size.depth || 3)
        );

        // Add wave motion perpendicular to force direction
        const perpendicular = new THREE.Vector3()
          .crossVectors(this.forceDirection, new THREE.Vector3(0, 0, 1))
          .normalize();

        point.add(perpendicular.clone().multiplyScalar(Math.sin(t * Math.PI * 2) * 0.2));
        points.push(point);
      }

      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: 0.5
      });

      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.userData = {
        offset: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5
      };

      this.flowLines.push(line);
      this.group.add(line);
    }
  }

  /**
   * Create energy wall effects
   */
  createEnergyWalls() {
    // Create shader material for energy effect
    const wallMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(this.color) },
        time: { value: 0 },
        opacity: { value: this.opacity },
        forceDirection: { value: this.forceDirection }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float time;
        uniform float opacity;
        uniform vec3 forceDirection;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          // Create energy wave pattern
          float wave = sin(vUv.y * 10.0 - time * 2.0) * 0.5 + 0.5;
          float flow = sin(vUv.x * 5.0 + time * 3.0) * 0.5 + 0.5;
          
          // Combine patterns
          float pattern = wave * flow;
          
          // Edge fade
          float edgeFade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x) *
                          smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
          
          float finalOpacity = opacity * pattern * edgeFade;
          
          gl_FragColor = vec4(color, finalOpacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // Create wall planes
    const wallGeometry = new THREE.PlaneGeometry(this.size.width || 3, this.size.height || 4);

    // Front wall
    const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
    frontWall.position.z = (this.size.depth || 3) / 2;
    this.group.add(frontWall);

    // Back wall
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
    backWall.position.z = -(this.size.depth || 3) / 2;
    backWall.rotation.y = Math.PI;
    this.group.add(backWall);

    // Store for animation
    this.energyWalls = [frontWall, backWall];
  }

  /**
   * Create physics body for trigger detection
   */
  createPhysicsBody() {
    if (!this.game?.physicsWorld) return;

    const shape = new CANNON.Box(
      new CANNON.Vec3(
        (this.size.width || 3) / 2,
        (this.size.height || 4) / 2,
        (this.size.depth || 3) / 2
      )
    );

    this.body = new CANNON.Body({
      mass: 0,
      shape: shape,
      position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
      isTrigger: true
    });

    this.body.userData = {
      obstacle: this,
      type: this.type,
      isForceField: true
    };

    this.game.physicsWorld.addBody(this.body);
  }

  /**
   * Handle ball contact
   */
  onBallContact(ballBody) {
    // Calculate force based on field type
    let forceMagnitude = this.forceMagnitude;

    switch (this.fieldType) {
      case 'pulsing':
        // Pulsing force
        forceMagnitude *= Math.sin(this.animationTime * 2) * 0.5 + 0.5;
        break;

      case 'wave':
        // Wave pattern based on position
        const relativePos = ballBody.position.vsub(this.body.position);
        const wavePhase = relativePos.x * 0.5 + this.animationTime * 2;
        forceMagnitude *= Math.sin(wavePhase) * 0.5 + 0.5;
        break;
    }

    // Apply force in field direction
    const force = new CANNON.Vec3(
      this.forceDirection.x * forceMagnitude,
      this.forceDirection.y * forceMagnitude,
      this.forceDirection.z * forceMagnitude
    );

    ballBody.velocity.vadd(force, ballBody.velocity);

    // Create visual effect
    this.createForceEffect(ballBody.position);

    // Emit event
    if (this.eventManager) {
      this.eventManager.publish(EventTypes.OBSTACLE_ACTIVATED, {
        obstacle: this,
        type: 'forcefield',
        ball: ballBody.userData?.ball,
        force: force
      });
    }
  }

  /**
   * Create force application visual effect
   */
  createForceEffect(position) {
    if (!this.game) return;

    // Create energy burst
    const burstCount = 5;

    for (let i = 0; i < burstCount; i++) {
      const particleGeometry = new THREE.PlaneGeometry(0.2, 0.2);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide
      });

      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(position);

      // Move in force direction with spread
      const spread = 0.2;
      particle.velocity = this.forceDirection
        .clone()
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread
          )
        )
        .multiplyScalar(5);

      particle.life = 1.0;
      particle.decay = 0.02;

      // Orient to camera
      particle.lookAt(this.game.camera.position);

      this.game.scene.add(particle);

      this.particles.push({
        mesh: particle,
        update: deltaTime => {
          particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
          particle.life -= particle.decay;
          particle.material.opacity = particle.life;
          particle.scale.setScalar(1 + (1 - particle.life) * 2);

          // Keep oriented to camera
          particle.lookAt(this.game.camera.position);

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
    this.animationTime += deltaTime;

    // Update shader uniforms
    if (this.energyWalls) {
      this.energyWalls.forEach(wall => {
        wall.material.uniforms.time.value = this.animationTime;
      });
    }

    // Animate hex grid
    this.hexGrid.forEach(hex => {
      const { row, col, baseOpacity } = hex.userData;

      // Create wave effect across grid
      const wavePhase = this.animationTime * 2 + row * 0.2 + col * 0.1;
      const wave = Math.sin(wavePhase) * 0.5 + 0.5;

      hex.material.opacity = baseOpacity + wave * 0.2;

      // Pulse on field activation
      if (this.fieldType === 'pulsing') {
        const pulse = Math.sin(this.animationTime * 2) * 0.5 + 0.5;
        hex.material.opacity *= pulse;
      }
    });

    // Animate flow lines
    this.flowLines.forEach(line => {
      const offset = line.userData.offset;
      const speed = line.userData.speed;

      // Update line opacity to create flow effect
      const phase = this.animationTime * speed + offset;
      line.material.opacity = (Math.sin(phase) * 0.5 + 0.5) * 0.5;
    });
  }

  /**
   * Dispose of the force field
   */
  dispose() {
    // Dispose hex grid
    this.hexGrid.forEach(hex => {
      if (hex.geometry) hex.geometry.dispose();
      if (hex.material) hex.material.dispose();
    });

    // Dispose flow lines
    this.flowLines.forEach(line => {
      if (line.geometry) line.geometry.dispose();
      if (line.material) line.material.dispose();
    });

    // Dispose energy walls
    if (this.energyWalls) {
      this.energyWalls.forEach(wall => {
        if (wall.geometry) wall.geometry.dispose();
        if (wall.material) wall.material.dispose();
      });
    }

    super.dispose();
  }
}
