import * as THREE from 'three';

/**
 * LightingManager - Manages multi-source lighting for enhanced space atmosphere
 * Provides dramatic sci-fi lighting with proper PBR workflow
 */
export class LightingManager {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    // Light references
    this.lights = {
      mainSun: null, // Primary directional light (distant star)
      ambient: null, // Ambient space lighting
      rimLights: [], // Colored rim lights from space phenomena
      pointLights: [], // Point lights for specific effects
      holeLights: [] // Glowing hole rim lights
    };

    // Light settings
    this.settings = {
      mainSunIntensity: 2.0,
      ambientIntensity: 0.3,
      rimLightIntensity: 0.8,
      enableShadows: true,
      shadowQuality: 'high' // 'low', 'medium', 'high'
    };

    // Performance tracking
    this.lightCount = 0;
    this.maxLights = 8; // WebGL limitation
  }

  /**
   * Initialize the lighting system
   */
  init() {
    // Configure renderer for physically correct lights
    this.renderer.physicallyCorrectLights = true;

    this.createMainSunlight();
    this.createAmbientLighting();
    this.createRimLights();
    this.configureShadows();

    console.log(`[LightingManager] Initialized with ${this.lightCount} lights`);
  }

  /**
   * Create main directional light (distant star/sun)
   */
  createMainSunlight() {
    this.lights.mainSun = new THREE.DirectionalLight(0xffffff, this.settings.mainSunIntensity);

    // Position the sun for dramatic shadows
    this.lights.mainSun.position.set(50, 100, 50);
    this.lights.mainSun.target.position.set(0, 0, 0);

    // Configure shadows
    if (this.settings.enableShadows) {
      this.lights.mainSun.castShadow = true;

      // Enhanced shadow configuration based on quality
      const shadowMapSize = this.getShadowMapSize();
      this.lights.mainSun.shadow.mapSize.width = shadowMapSize;
      this.lights.mainSun.shadow.mapSize.height = shadowMapSize;

      // Optimize shadow camera
      this.lights.mainSun.shadow.camera.near = 0.1;
      this.lights.mainSun.shadow.camera.far = 200;
      this.lights.mainSun.shadow.camera.left = -50;
      this.lights.mainSun.shadow.camera.right = 50;
      this.lights.mainSun.shadow.camera.top = 50;
      this.lights.mainSun.shadow.camera.bottom = -50;

      // Reduce shadow acne
      this.lights.mainSun.shadow.bias = -0.0001;
      this.lights.mainSun.shadow.normalBias = 0.02;
    }

    this.scene.add(this.lights.mainSun);
    this.scene.add(this.lights.mainSun.target);
    this.lightCount++;
  }

  /**
   * Create ambient lighting for space environment
   */
  createAmbientLighting() {
    // Cool ambient light simulating reflected starlight
    this.lights.ambient = new THREE.AmbientLight(0x404080, this.settings.ambientIntensity);
    this.scene.add(this.lights.ambient);

    // Store reference for EnvironmentManager
    this.scene.userData.ambientLight = this.lights.ambient;
  }

  /**
   * Create rim lights for atmospheric effects
   */
  createRimLights() {
    // Blue rim light (distant nebula)
    const blueRim = new THREE.DirectionalLight(0x4080ff, this.settings.rimLightIntensity * 0.3);
    blueRim.position.set(-80, 20, -60);
    blueRim.target.position.set(0, 0, 0);
    this.scene.add(blueRim);
    this.scene.add(blueRim.target);
    this.lights.rimLights.push(blueRim);
    this.lightCount++;

    // Purple rim light (cosmic phenomena)
    const purpleRim = new THREE.DirectionalLight(0x8040ff, this.settings.rimLightIntensity * 0.2);
    purpleRim.position.set(60, -10, 80);
    purpleRim.target.position.set(0, 0, 0);
    this.scene.add(purpleRim);
    this.scene.add(purpleRim.target);
    this.lights.rimLights.push(purpleRim);
    this.lightCount++;

    // Orange rim light (distant star)
    const orangeRim = new THREE.DirectionalLight(0xff8040, this.settings.rimLightIntensity * 0.15);
    orangeRim.position.set(30, 50, -100);
    orangeRim.target.position.set(0, 0, 0);
    this.scene.add(orangeRim);
    this.scene.add(orangeRim.target);
    this.lights.rimLights.push(orangeRim);
    this.lightCount++;
  }

  /**
   * Add point light for specific game elements
   * @param {THREE.Vector3} position - Light position
   * @param {number} color - Light color (hex)
   * @param {number} intensity - Light intensity
   * @param {number} distance - Light distance
   * @returns {THREE.PointLight} Created light
   */
  addPointLight(position, color = 0xffffff, intensity = 1.0, distance = 10) {
    if (this.lightCount >= this.maxLights) {
      console.warn('[LightingManager] Maximum light count reached');
      return null;
    }

    const pointLight = new THREE.PointLight(color, intensity, distance);
    pointLight.position.copy(position);
    pointLight.decay = 2; // Physically correct decay

    this.scene.add(pointLight);
    this.lights.pointLights.push(pointLight);
    this.lightCount++;

    return pointLight;
  }

  /**
   * Add glowing light to hole rim
   * @param {THREE.Vector3} position - Hole position
   * @param {number} color - Glow color
   * @returns {THREE.PointLight} Created hole light
   */
  addHoleLight(position, color = 0x00ff88) {
    const holeLight = this.addPointLight(
      new THREE.Vector3(position.x, position.y + 0.5, position.z),
      color,
      0.8,
      3.0
    );

    if (holeLight) {
      holeLight.userData.type = 'holeLight';
      this.lights.holeLights.push(holeLight);
    }

    return holeLight;
  }

  /**
   * Configure shadow quality based on settings
   */
  configureShadows() {
    if (!this.settings.enableShadows) {
      return;
    }

    // Configure renderer shadow settings
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = this.getShadowMapType();
    this.renderer.shadowMap.autoUpdate = true;
  }

  /**
   * Get shadow map size based on quality setting
   * @returns {number} Shadow map size
   */
  getShadowMapSize() {
    switch (this.settings.shadowQuality) {
      case 'low':
        return 1024;
      case 'medium':
        return 2048;
      case 'high':
        return 4096;
      default:
        return 2048;
    }
  }

  /**
   * Get shadow map type based on quality setting
   * @returns {number} Three.js shadow map type
   */
  getShadowMapType() {
    switch (this.settings.shadowQuality) {
      case 'low':
        return THREE.BasicShadowMap;
      case 'medium':
        return THREE.PCFShadowMap;
      case 'high':
        return THREE.PCFSoftShadowMap;
      default:
        return THREE.PCFSoftShadowMap;
    }
  }

  /**
   * Update lighting animations (call in render loop)
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    const time = Date.now() * 0.001;

    // Animate rim lights for dynamic atmosphere
    this.lights.rimLights.forEach((light, index) => {
      const phase = time + index * 2.0;
      const intensity = this.settings.rimLightIntensity * (0.5 + 0.3 * Math.sin(phase * 0.5));
      light.intensity = intensity * (index === 0 ? 0.3 : index === 1 ? 0.2 : 0.15);
    });

    // Animate hole lights with pulsing effect
    this.lights.holeLights.forEach((light, index) => {
      const phase = time * 2.0 + index * 1.5;
      light.intensity = 0.6 + 0.4 * Math.sin(phase);
    });
  }

  /**
   * Set lighting quality
   * @param {string} quality - 'low', 'medium', 'high'
   */
  setQuality(quality) {
    this.settings.shadowQuality = quality;

    if (this.lights.mainSun && this.lights.mainSun.castShadow) {
      const shadowMapSize = this.getShadowMapSize();
      this.lights.mainSun.shadow.mapSize.setScalar(shadowMapSize);
      this.lights.mainSun.shadow.map?.dispose();
      this.lights.mainSun.shadow.map = null;
    }

    this.renderer.shadowMap.type = this.getShadowMapType();
  }

  /**
   * Enable/disable shadows
   * @param {boolean} enabled
   */
  setShadowsEnabled(enabled) {
    this.settings.enableShadows = enabled;
    this.renderer.shadowMap.enabled = enabled;

    if (this.lights.mainSun) {
      this.lights.mainSun.castShadow = enabled;
    }
  }

  /**
   * Update light intensities
   * @param {object} intensities - Object with light intensity settings
   */
  updateIntensities(intensities) {
    if (intensities.mainSun !== undefined && this.lights.mainSun) {
      this.lights.mainSun.intensity = intensities.mainSun;
      this.settings.mainSunIntensity = intensities.mainSun;
    }

    if (intensities.ambient !== undefined && this.lights.ambient) {
      this.lights.ambient.intensity = intensities.ambient;
      this.settings.ambientIntensity = intensities.ambient;
    }

    if (intensities.rimLights !== undefined) {
      this.settings.rimLightIntensity = intensities.rimLights;
    }
  }

  /**
   * Clean up lighting resources
   */
  dispose() {
    // Remove all lights from scene
    Object.values(this.lights).forEach(lightOrArray => {
      if (Array.isArray(lightOrArray)) {
        lightOrArray.forEach(light => {
          this.scene.remove(light);
          if (light.target) {
            this.scene.remove(light.target);
          }
          if (light.shadow?.map) {
            light.shadow.map.dispose();
          }
        });
      } else if (lightOrArray) {
        this.scene.remove(lightOrArray);
        if (lightOrArray.target) {
          this.scene.remove(lightOrArray.target);
        }
        if (lightOrArray.shadow?.map) {
          lightOrArray.shadow.map.dispose();
        }
      }
    });

    // Clear references
    Object.keys(this.lights).forEach(key => {
      if (Array.isArray(this.lights[key])) {
        this.lights[key] = [];
      } else {
        this.lights[key] = null;
      }
    });

    this.lightCount = 0;
  }

  /**
   * Cleanup method for manager compatibility
   */
  cleanup() {
    this.dispose();
  }
}
