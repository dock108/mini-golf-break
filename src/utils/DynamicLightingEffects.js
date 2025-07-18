import * as THREE from 'three';

/**
 * DynamicLightingEffects - Utility functions for adding dynamic lighting to game objects
 * Provides pulsing lights, hazard warnings, and special effects
 */
export class DynamicLightingEffects {
  constructor(lightingManager) {
    this.lightingManager = lightingManager;
    this.animatedLights = new Map(); // Track animated lights for updates
    this.time = 0;
  }

  /**
   * Add pulsing hazard warning light
   * @param {THREE.Vector3} position - Light position
   * @param {string} hazardType - Type of hazard (sand, water, etc.)
   * @returns {THREE.PointLight} Created light
   */
  addHazardWarningLight(position, hazardType = 'sand') {
    const colorMap = {
      sand: 0xffa500, // Orange
      water: 0x0080ff, // Blue
      lava: 0xff4500, // Red-orange
      ice: 0x87ceeb, // Sky blue
      void: 0x8b00ff // Purple
    };

    const color = colorMap[hazardType] || 0xffa500;
    const light = this.lightingManager?.addPointLight(
      new THREE.Vector3(position.x, position.y + 1.0, position.z),
      color,
      0.6,
      4.0
    );

    if (light) {
      light.userData.type = 'hazardWarning';
      light.userData.hazardType = hazardType;
      light.userData.baseIntensity = 0.6;
      light.userData.pulseSpeed = 2.0 + Math.random() * 2.0;
      light.userData.pulsePhase = Math.random() * Math.PI * 2;

      this.animatedLights.set(light.uuid, light);
      console.log(
        `[DynamicLightingEffects] Added ${hazardType} hazard warning light at:`,
        position
      );
    }

    return light;
  }

  /**
   * Add pulsing bumper effect light
   * @param {THREE.Vector3} position - Light position
   * @param {string} bumperType - Type of bumper
   * @returns {THREE.PointLight} Created light
   */
  addBumperEffectLight(position, bumperType = 'standard') {
    const colorMap = {
      standard: 0x00ff00, // Green
      bouncy: 0xff00ff, // Magenta
      explosive: 0xff0000, // Red
      magnetic: 0x00ffff, // Cyan
      teleport: 0x8a2be2 // Blue violet
    };

    const color = colorMap[bumperType] || 0x00ff00;
    const light = this.lightingManager?.addPointLight(
      new THREE.Vector3(position.x, position.y + 0.8, position.z),
      color,
      0.8,
      3.0
    );

    if (light) {
      light.userData.type = 'bumperEffect';
      light.userData.bumperType = bumperType;
      light.userData.baseIntensity = 0.8;
      light.userData.pulseSpeed = 3.0;
      light.userData.pulsePhase = Math.random() * Math.PI * 2;

      this.animatedLights.set(light.uuid, light);
      console.log(`[DynamicLightingEffects] Added ${bumperType} bumper effect light at:`, position);
    }

    return light;
  }

  /**
   * Add space-themed obstacle lighting
   * @param {THREE.Vector3} position - Light position
   * @param {string} obstacleType - Type of obstacle
   * @returns {THREE.PointLight} Created light
   */
  addObstacleLight(position, obstacleType = 'tech') {
    const colorMap = {
      tech: 0x00ffff, // Cyan tech glow
      energy: 0xff00ff, // Magenta energy
      plasma: 0x8a2be2, // Blue violet plasma
      crystal: 0x00ff88, // Green crystal
      alien: 0xff4500, // Orange alien tech
      portal: 0x1e90ff // Dodger blue portal
    };

    const color = colorMap[obstacleType] || 0x00ffff;
    const light = this.lightingManager?.addPointLight(
      new THREE.Vector3(position.x, position.y + 1.2, position.z),
      color,
      1.0,
      5.0
    );

    if (light) {
      light.userData.type = 'obstacleEffect';
      light.userData.obstacleType = obstacleType;
      light.userData.baseIntensity = 1.0;
      light.userData.pulseSpeed = 1.5 + Math.random() * 1.0;
      light.userData.pulsePhase = Math.random() * Math.PI * 2;

      this.animatedLights.set(light.uuid, light);
      console.log(`[DynamicLightingEffects] Added ${obstacleType} obstacle light at:`, position);
    }

    return light;
  }

  /**
   * Add ambient space phenomena lighting
   * @param {THREE.Vector3} position - Light position
   * @param {string} phenomenaType - Type of space phenomena
   * @returns {THREE.PointLight} Created light
   */
  addSpacePhenomenaLight(position, phenomenaType = 'nebula') {
    const colorMap = {
      nebula: 0x8b00ff, // Purple nebula
      star: 0xffffff, // White star
      pulsar: 0x00ff00, // Green pulsar
      quasar: 0xff0080, // Pink quasar
      aurora: 0x00ff80, // Green aurora
      comet: 0x87ceeb // Sky blue comet
    };

    const color = colorMap[phenomenaType] || 0x8b00ff;
    const light = this.lightingManager?.addPointLight(
      new THREE.Vector3(position.x, position.y + 2.0, position.z),
      color,
      0.4,
      8.0
    );

    if (light) {
      light.userData.type = 'spacePhenomena';
      light.userData.phenomenaType = phenomenaType;
      light.userData.baseIntensity = 0.4;
      light.userData.pulseSpeed = 0.5 + Math.random() * 1.0;
      light.userData.pulsePhase = Math.random() * Math.PI * 2;
      light.userData.flickerIntensity = phenomenaType === 'pulsar' ? 0.8 : 0.3;

      this.animatedLights.set(light.uuid, light);
      console.log(
        `[DynamicLightingEffects] Added ${phenomenaType} space phenomena light at:`,
        position
      );
    }

    return light;
  }

  /**
   * Create rim lighting effect on mesh
   * @param {THREE.Mesh} mesh - Target mesh
   * @param {number} color - Rim light color
   * @param {number} intensity - Rim light intensity
   */
  addRimLightingToMesh(mesh, color = 0x00ffff, intensity = 0.5) {
    if (!mesh || !mesh.material) {
      return;
    }

    // Create rim lighting shader
    const rimLightShader = this.createRimLightShader(color, intensity);

    // If material supports it, add rim lighting
    if (mesh.material.onBeforeCompile) {
      mesh.material.onBeforeCompile = shader => {
        // Inject rim lighting into existing shader
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `
          #include <common>
          varying vec3 vWorldNormal;
          varying vec3 vViewPosition;
          `
        );

        shader.vertexShader = shader.vertexShader.replace(
          '#include <worldpos_vertex>',
          `
          #include <worldpos_vertex>
          vWorldNormal = normalize(normalMatrix * normal);
          vViewPosition = -mvPosition.xyz;
          `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `
          #include <common>
          varying vec3 vWorldNormal;
          varying vec3 vViewPosition;
          uniform vec3 rimColor;
          uniform float rimIntensity;
          `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `
          #include <dithering_fragment>
          
          // Rim lighting calculation
          float rimPower = 2.0;
          vec3 viewDir = normalize(vViewPosition);
          float rim = 1.0 - max(dot(viewDir, vWorldNormal), 0.0);
          rim = pow(rim, rimPower);
          
          gl_FragColor.rgb += rimColor * rim * rimIntensity;
          `
        );

        shader.uniforms.rimColor = { value: new THREE.Color(color) };
        shader.uniforms.rimIntensity = { value: intensity };
      };

      // Force material recompilation
      mesh.material.needsUpdate = true;
    }
  }

  /**
   * Create rim light shader material
   * @param {number} color - Rim color
   * @param {number} intensity - Rim intensity
   * @returns {object} Shader uniforms and code
   */
  createRimLightShader(color, intensity) {
    return {
      uniforms: {
        rimColor: { value: new THREE.Color(color) },
        rimIntensity: { value: intensity },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vViewPosition;
        
        void main() {
          vWorldNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldNormal;
        varying vec3 vViewPosition;
        uniform vec3 rimColor;
        uniform float rimIntensity;
        uniform float time;
        
        void main() {
          float rimPower = 2.0;
          vec3 viewDir = normalize(vViewPosition);
          float rim = 1.0 - max(dot(viewDir, vWorldNormal), 0.0);
          rim = pow(rim, rimPower);
          
          // Add time-based pulsing
          float pulse = sin(time * 3.0) * 0.3 + 0.7;
          
          gl_FragColor = vec4(rimColor * rim * rimIntensity * pulse, rim * rimIntensity);
        }
      `
    };
  }

  /**
   * Update all animated lights
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    this.time += deltaTime;

    this.animatedLights.forEach(light => {
      const userData = light.userData;

      if (userData.type === 'hazardWarning') {
        // Pulsing hazard warning
        const pulse = Math.sin(this.time * userData.pulseSpeed + userData.pulsePhase) * 0.5 + 0.5;
        light.intensity = userData.baseIntensity * (0.3 + 0.7 * pulse);
      } else if (userData.type === 'bumperEffect') {
        // Rapid pulsing for bumpers
        const pulse = Math.sin(this.time * userData.pulseSpeed + userData.pulsePhase) * 0.5 + 0.5;
        light.intensity = userData.baseIntensity * (0.4 + 0.6 * pulse);
      } else if (userData.type === 'obstacleEffect') {
        // Smooth pulsing for obstacles
        const pulse = Math.sin(this.time * userData.pulseSpeed + userData.pulsePhase) * 0.5 + 0.5;
        light.intensity = userData.baseIntensity * (0.6 + 0.4 * pulse);
      } else if (userData.type === 'spacePhenomena') {
        // Complex animation for space phenomena
        const pulse = Math.sin(this.time * userData.pulseSpeed + userData.pulsePhase) * 0.5 + 0.5;
        const flicker = Math.random() < 0.1 ? Math.random() * userData.flickerIntensity : 1.0;
        light.intensity = userData.baseIntensity * (0.5 + 0.5 * pulse) * flicker;
      }
    });
  }

  /**
   * Remove a dynamic light
   * @param {THREE.PointLight} light - Light to remove
   */
  removeLight(light) {
    if (light && this.animatedLights.has(light.uuid)) {
      this.animatedLights.delete(light.uuid);

      // Remove from scene
      if (light.parent) {
        light.parent.remove(light);
      }

      console.log('[DynamicLightingEffects] Removed dynamic light:', light.userData.type);
    }
  }

  /**
   * Remove all dynamic lights
   */
  removeAllLights() {
    this.animatedLights.forEach(light => {
      if (light.parent) {
        light.parent.remove(light);
      }
    });
    this.animatedLights.clear();
    console.log('[DynamicLightingEffects] Removed all dynamic lights');
  }

  /**
   * Get count of active dynamic lights
   * @returns {number} Number of active lights
   */
  getActiveLightCount() {
    return this.animatedLights.size;
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.removeAllLights();
  }
}
