import * as THREE from 'three';

/**
 * EnvironmentManager - Manages skyboxes, environment maps, and atmospheric effects
 * Provides dynamic environment switching and reflection mapping for PBR materials
 */
export class EnvironmentManager {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    // Environment map for reflections
    this.envMap = null;

    // Current skybox
    this.currentSkybox = null;
    this.skyboxMesh = null;

    // Texture loader for skyboxes
    this.textureLoader = new THREE.TextureLoader();
    this.cubeTextureLoader = new THREE.CubeTextureLoader();

    // Available environments
    this.environments = {
      'deep-space': {
        name: 'Deep Space',
        type: 'cubemap',
        path: './assets/skyboxes/deep-space/',
        files: ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'],
        ambientColor: 0x0a0a1a,
        fogColor: 0x000510,
        fogDensity: 0.0001
      },
      nebula: {
        name: 'Nebula Vista',
        type: 'equirectangular',
        path: './assets/skyboxes/nebula.jpg',
        ambientColor: 0x1a0a2a,
        fogColor: 0x100520,
        fogDensity: 0.0002
      },
      'space-station': {
        name: 'Space Station Interior',
        type: 'cubemap',
        path: './assets/skyboxes/station/',
        files: ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'],
        ambientColor: 0x2a2a3a,
        fogColor: 0x1a1a2a,
        fogDensity: 0.0005
      },
      'asteroid-field': {
        name: 'Asteroid Field',
        type: 'procedural',
        ambientColor: 0x1a1515,
        fogColor: 0x0a0505,
        fogDensity: 0.0003
      }
    };

    // Stars for procedural skyboxes
    this.starField = null;

    // Initialize with default environment
    this.currentEnvironment = null;
  }

  /**
   * Initialize the environment manager
   */
  async init() {
    // Set up renderer for HDR
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    // Load default environment
    await this.loadEnvironment('deep-space');

    // Create star field for procedural skyboxes
    this.createStarField();
  }

  /**
   * Load and set an environment
   * @param {string} envName - Name of the environment to load
   */
  async loadEnvironment(envName) {
    const envConfig = this.environments[envName];
    if (!envConfig) {
      console.error(`Environment '${envName}' not found`);
      return;
    }

    this.currentEnvironment = envName;

    // Update ambient light color
    if (this.scene.userData.ambientLight) {
      this.scene.userData.ambientLight.color.setHex(envConfig.ambientColor);
    }

    // Update fog
    if (envConfig.fogDensity > 0) {
      this.scene.fog = new THREE.FogExp2(envConfig.fogColor, envConfig.fogDensity);
    } else {
      this.scene.fog = null;
    }

    // Load skybox based on type
    if (envConfig.type === 'cubemap') {
      await this.loadCubemapSkybox(envConfig);
    } else if (envConfig.type === 'equirectangular') {
      await this.loadEquirectangularSkybox(envConfig);
    } else if (envConfig.type === 'procedural') {
      this.createProceduralSkybox(envConfig);
    }
  }

  /**
   * Load a cubemap skybox
   * @param {object} config - Environment configuration
   */
  async loadCubemapSkybox(config) {
    return new Promise((resolve, reject) => {
      const paths = config.files.map(file => config.path + file);

      this.cubeTextureLoader.load(
        paths,
        texture => {
          // Remove old skybox
          if (this.skyboxMesh) {
            this.scene.remove(this.skyboxMesh);
            this.skyboxMesh.geometry.dispose();
            this.skyboxMesh.material.dispose();
          }

          // Set as scene background
          this.scene.background = texture;

          // Use as environment map for reflections
          this.envMap = texture;
          this.updateMaterialsEnvMap();

          resolve();
        },
        undefined,
        error => {
          console.error('Failed to load cubemap:', error);
          // Fallback to procedural skybox
          this.createProceduralSkybox(config);
          resolve();
        }
      );
    });
  }

  /**
   * Load an equirectangular skybox
   * @param {object} config - Environment configuration
   */
  async loadEquirectangularSkybox(config) {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        config.path,
        texture => {
          // Convert to cube map for better performance
          texture.mapping = THREE.EquirectangularReflectionMapping;
          texture.encoding = THREE.sRGBEncoding;

          // Remove old skybox
          if (this.skyboxMesh) {
            this.scene.remove(this.skyboxMesh);
            this.skyboxMesh.geometry.dispose();
            this.skyboxMesh.material.dispose();
          }

          // Create skybox sphere
          const geometry = new THREE.SphereGeometry(500, 60, 40);
          geometry.scale(-1, 1, 1); // Invert to render on inside

          const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.BackSide,
            fog: false
          });

          this.skyboxMesh = new THREE.Mesh(geometry, material);
          this.skyboxMesh.rotation.y = Math.PI; // Adjust orientation
          this.scene.add(this.skyboxMesh);

          // Use as environment map
          this.envMap = texture;
          this.updateMaterialsEnvMap();

          resolve();
        },
        undefined,
        error => {
          console.error('Failed to load equirectangular map:', error);
          // Fallback to procedural skybox
          this.createProceduralSkybox(config);
          resolve();
        }
      );
    });
  }

  /**
   * Create a procedural skybox with stars
   * @param {object} config - Environment configuration
   */
  createProceduralSkybox(config) {
    // Remove old skybox
    if (this.skyboxMesh) {
      this.scene.remove(this.skyboxMesh);
      this.skyboxMesh.geometry.dispose();
      this.skyboxMesh.material.dispose();
    }

    // Create gradient background
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        h = pow(max(h, 0.0), exponent);
        gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
      }
    `;

    const uniforms = {
      topColor: { value: new THREE.Color(0x0a0a2a) },
      bottomColor: { value: new THREE.Color(0x000005) },
      offset: { value: 33 },
      exponent: { value: 0.6 }
    };

    const skyGeo = new THREE.SphereGeometry(400, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.BackSide
    });

    this.skyboxMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyboxMesh);

    // Show star field
    if (this.starField) {
      this.starField.visible = true;
    }

    // Create simple environment map for reflections
    this.createSimpleEnvMap();
  }

  /**
   * Create a star field for procedural skyboxes
   */
  createStarField() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 10000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;

      // Random position on sphere
      const radius = 300 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // Star color (white to blue-white to orange)
      const colorChoice = Math.random();
      if (colorChoice < 0.7) {
        // White
        colors[i3] = 1.0;
        colors[i3 + 1] = 1.0;
        colors[i3 + 2] = 1.0;
      } else if (colorChoice < 0.9) {
        // Blue-white
        colors[i3] = 0.8;
        colors[i3 + 1] = 0.9;
        colors[i3 + 2] = 1.0;
      } else {
        // Orange
        colors[i3] = 1.0;
        colors[i3 + 1] = 0.8;
        colors[i3 + 2] = 0.6;
      }

      // Star size
      sizes[i] = Math.random() * 2 + 0.5;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.PointsMaterial({
      size: 1.5,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      fog: false
    });

    this.starField = new THREE.Points(starGeometry, starMaterial);
    this.starField.visible = false; // Hidden by default
    this.scene.add(this.starField);
  }

  /**
   * Create a simple environment map for reflections
   */
  createSimpleEnvMap() {
    const size = 256;
    const data = new Uint8Array(size * size * 4);

    // Create gradient from dark blue to black
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const t = y / size;

        data[i] = Math.floor(10 * (1 - t)); // R
        data[i + 1] = Math.floor(10 * (1 - t)); // G
        data[i + 2] = Math.floor(30 * (1 - t)); // B
        data[i + 3] = 255; // A
      }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.needsUpdate = true;
    texture.mapping = THREE.EquirectangularReflectionMapping;

    this.envMap = texture;
    this.updateMaterialsEnvMap();
  }

  /**
   * Update all materials in the scene with the current environment map
   */
  updateMaterialsEnvMap() {
    this.scene.traverse(child => {
      if (child.isMesh && child.material) {
        if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
          child.material.envMap = this.envMap;
          child.material.needsUpdate = true;
        }
      }
    });
  }

  /**
   * Add atmospheric effects like nebula clouds
   */
  addNebulaEffect() {
    const nebulaGeometry = new THREE.PlaneGeometry(200, 200);
    const nebulaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x4a0080) },
        color2: { value: new THREE.Color(0x000040) },
        opacity: { value: 0.3 }
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
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float opacity;
        varying vec2 vUv;
        
        float noise(vec2 p) {
          return sin(p.x * 10.0 + time) * sin(p.y * 10.0 + time) * 0.5 + 0.5;
        }
        
        void main() {
          float n = noise(vUv);
          vec3 color = mix(color1, color2, n);
          gl_FragColor = vec4(color, opacity * n);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
    nebula.position.set(0, 50, -150);
    nebula.rotation.x = Math.PI * 0.3;
    this.scene.add(nebula);

    // Animate nebula
    const animate = () => {
      nebulaMaterial.uniforms.time.value += 0.001;
    };

    // Store animation function for cleanup
    this.nebulaAnimation = animate;
  }

  /**
   * Update environment effects (call in render loop)
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    // Rotate star field slowly
    if (this.starField && this.starField.visible) {
      this.starField.rotation.y += deltaTime * 0.00005;
    }

    // Update nebula animation
    if (this.nebulaAnimation) {
      this.nebulaAnimation();
    }
  }

  /**
   * Get current environment configuration
   * @returns {object} Current environment config
   */
  getCurrentEnvironment() {
    return this.environments[this.currentEnvironment];
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.dispose();
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.skyboxMesh) {
      this.scene.remove(this.skyboxMesh);
      this.skyboxMesh.geometry.dispose();
      this.skyboxMesh.material.dispose();
    }

    if (this.starField) {
      this.scene.remove(this.starField);
      this.starField.geometry.dispose();
      this.starField.material.dispose();
    }

    if (this.envMap) {
      this.envMap.dispose();
    }
  }
}
