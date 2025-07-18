import * as THREE from 'three';
import { StarfieldShader, GalaxyShader, ShootingStarShader } from '../utils/StarfieldShader.js';

/**
 * StarfieldManager - Advanced starfield system with realistic effects
 * Manages twinkling stars, distant galaxies, and shooting star effects
 */
export class StarfieldManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // Starfield components
    this.starField = null;
    this.galaxyBackground = null;
    this.shootingStars = [];

    // Settings
    this.settings = {
      starCount: 15000,
      galaxyVisible: true,
      shootingStarFrequency: 0.02, // Probability per frame
      maxShootingStars: 3,
      starTwinkleSpeed: 1.0,
      starTwinkleIntensity: 0.6,
      galaxyOpacity: 0.4,
      nebulaOpacity: 0.3
    };

    // Animation
    this.time = 0;
    this.lastShootingStarTime = 0;

    // Star catalogs for realism
    this.starCatalog = this.generateStarCatalog();
  }

  /**
   * Initialize the starfield system
   */
  init() {
    this.createMainStarField();
    this.createGalaxyBackground();
    this.setupShootingStarSystem();

    console.log(`[StarfieldManager] Initialized with ${this.settings.starCount} stars`);
  }

  /**
   * Generate realistic star catalog based on astronomical data
   */
  generateStarCatalog() {
    const catalog = {
      mainSequence: [], // Regular stars
      giants: [], // Bright giant stars
      dwarfs: [], // Dim dwarf stars
      binaries: [], // Binary star systems
      variables: [] // Variable stars
    };

    // Generate main sequence stars (80% of stars)
    const mainCount = Math.floor(this.settings.starCount * 0.8);
    for (let i = 0; i < mainCount; i++) {
      catalog.mainSequence.push({
        position: this.randomSpherePosition(200 + Math.random() * 200),
        brightness: 0.3 + Math.random() * 0.5,
        color: this.getMainSequenceColor(),
        size: 1 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
        type: 'main'
      });
    }

    // Generate giant stars (5% of stars)
    const giantCount = Math.floor(this.settings.starCount * 0.05);
    for (let i = 0; i < giantCount; i++) {
      catalog.giants.push({
        position: this.randomSpherePosition(300 + Math.random() * 100),
        brightness: 0.8 + Math.random() * 0.2,
        color: this.getGiantColor(),
        size: 3 + Math.random() * 4,
        twinklePhase: Math.random() * Math.PI * 2,
        type: 'giant'
      });
    }

    // Generate dwarf stars (12% of stars)
    const dwarfCount = Math.floor(this.settings.starCount * 0.12);
    for (let i = 0; i < dwarfCount; i++) {
      catalog.dwarfs.push({
        position: this.randomSpherePosition(150 + Math.random() * 150),
        brightness: 0.1 + Math.random() * 0.3,
        color: this.getDwarfColor(),
        size: 0.5 + Math.random() * 1,
        twinklePhase: Math.random() * Math.PI * 2,
        type: 'dwarf'
      });
    }

    // Generate binary systems (2% of stars)
    const binaryCount = Math.floor(this.settings.starCount * 0.02);
    for (let i = 0; i < binaryCount; i++) {
      const basePosition = this.randomSpherePosition(250 + Math.random() * 150);
      const separation = 0.5 + Math.random() * 2;

      catalog.binaries.push({
        position: basePosition,
        position2: this.addRandomOffset(basePosition, separation),
        brightness: 0.6 + Math.random() * 0.3,
        color: this.getMainSequenceColor(),
        size: 2 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
        orbitalPhase: Math.random() * Math.PI * 2,
        type: 'binary'
      });
    }

    // Generate variable stars (1% of stars)
    const variableCount = Math.floor(this.settings.starCount * 0.01);
    for (let i = 0; i < variableCount; i++) {
      catalog.variables.push({
        position: this.randomSpherePosition(200 + Math.random() * 200),
        baseBrightness: 0.4 + Math.random() * 0.4,
        variationAmplitude: 0.2 + Math.random() * 0.5,
        period: 5 + Math.random() * 20, // seconds
        color: this.getVariableColor(),
        size: 2 + Math.random() * 3,
        twinklePhase: Math.random() * Math.PI * 2,
        type: 'variable'
      });
    }

    return catalog;
  }

  /**
   * Create the main starfield with realistic distribution
   */
  createMainStarField() {
    const starGeometry = new THREE.BufferGeometry();
    const positions = [];
    const sizes = [];
    const brightnesses = [];
    const twinklePhases = [];
    const starTypes = [];
    const starColors = [];

    // Combine all star types into single geometry
    const allStars = [
      ...this.starCatalog.mainSequence,
      ...this.starCatalog.giants,
      ...this.starCatalog.dwarfs,
      ...this.starCatalog.binaries,
      ...this.starCatalog.variables
    ];

    allStars.forEach(star => {
      positions.push(star.position.x, star.position.y, star.position.z);
      sizes.push(star.size);
      brightnesses.push(star.brightness);
      twinklePhases.push(star.twinklePhase);

      // Encode star type as number for shader
      const typeMap = { main: 0.2, dwarf: 0.4, giant: 0.9, binary: 0.7, variable: 0.8 };
      starTypes.push(typeMap[star.type] || 0.2);

      starColors.push(star.color.r, star.color.g, star.color.b);

      // Add second star for binaries
      if (star.type === 'binary' && star.position2) {
        positions.push(star.position2.x, star.position2.y, star.position2.z);
        sizes.push(star.size * 0.8);
        brightnesses.push(star.brightness * 0.7);
        twinklePhases.push(star.twinklePhase + Math.PI);
        starTypes.push(0.7);
        starColors.push(star.color.r * 0.9, star.color.g * 0.9, star.color.b);
      }
    });

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    starGeometry.setAttribute('brightness', new THREE.Float32BufferAttribute(brightnesses, 1));
    starGeometry.setAttribute('twinklePhase', new THREE.Float32BufferAttribute(twinklePhases, 1));
    starGeometry.setAttribute('starType', new THREE.Float32BufferAttribute(starTypes, 1));
    starGeometry.setAttribute('starColor', new THREE.Float32BufferAttribute(starColors, 3));

    // Create shader material
    const starMaterial = new THREE.ShaderMaterial({
      uniforms: { ...StarfieldShader.uniforms },
      vertexShader: StarfieldShader.vertexShader,
      fragmentShader: StarfieldShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    // Update shader uniforms
    starMaterial.uniforms.twinkleSpeed.value = this.settings.starTwinkleSpeed;
    starMaterial.uniforms.twinkleIntensity.value = this.settings.starTwinkleIntensity;

    this.starField = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.starField);
  }

  /**
   * Create galaxy background
   */
  createGalaxyBackground() {
    if (!this.settings.galaxyVisible) {
      return;
    }

    const galaxyGeometry = new THREE.SphereGeometry(450, 64, 32);
    const galaxyMaterial = new THREE.ShaderMaterial({
      uniforms: { ...GalaxyShader.uniforms },
      vertexShader: GalaxyShader.vertexShader,
      fragmentShader: GalaxyShader.fragmentShader,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    // Update galaxy settings
    galaxyMaterial.uniforms.galaxyOpacity.value = this.settings.galaxyOpacity;
    galaxyMaterial.uniforms.nebulaOpacity.value = this.settings.nebulaOpacity;

    this.galaxyBackground = new THREE.Mesh(galaxyGeometry, galaxyMaterial);
    this.scene.add(this.galaxyBackground);
  }

  /**
   * Setup shooting star system
   */
  setupShootingStarSystem() {
    // Pre-create shooting star geometries
    for (let i = 0; i < this.settings.maxShootingStars; i++) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));

      const material = new THREE.ShaderMaterial({
        uniforms: { ...ShootingStarShader.uniforms },
        vertexShader: ShootingStarShader.vertexShader,
        fragmentShader: ShootingStarShader.fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const shootingStar = new THREE.Points(geometry, material);
      shootingStar.visible = false;
      this.scene.add(shootingStar);
      this.shootingStars.push(shootingStar);
    }
  }

  /**
   * Create a shooting star effect
   */
  createShootingStar() {
    const availableStar = this.shootingStars.find(star => !star.visible);
    if (!availableStar) {
      return;
    }

    // Random start position at edge of view
    const angle = Math.random() * Math.PI * 2;
    const startRadius = 350;
    const startPosition = new THREE.Vector3(
      Math.cos(angle) * startRadius,
      (Math.random() - 0.5) * 200,
      Math.sin(angle) * startRadius
    );

    // End position across the sky
    const endAngle = angle + (Math.random() - 0.5) * Math.PI * 0.5;
    const endRadius = 300;
    const endPosition = new THREE.Vector3(
      Math.cos(endAngle) * endRadius,
      startPosition.y + (Math.random() - 0.5) * 100,
      Math.sin(endAngle) * endRadius
    );

    // Configure shooting star
    const material = availableStar.material;
    material.uniforms.startTime.value = this.time;
    material.uniforms.duration.value = 1.5 + Math.random() * 2;
    material.uniforms.startPosition.value.copy(startPosition);
    material.uniforms.endPosition.value.copy(endPosition);
    material.uniforms.intensity.value = 0.8 + Math.random() * 0.4;

    availableStar.visible = true;

    // Hide after duration
    setTimeout(() => {
      availableStar.visible = false;
    }, material.uniforms.duration.value * 1000);
  }

  /**
   * Update animations
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    this.time += deltaTime;

    // Update star twinkling
    if (this.starField) {
      this.starField.material.uniforms.time.value = this.time;

      // Update variable stars
      this.starCatalog.variables.forEach((star, index) => {
        const variation =
          Math.sin((this.time * 2 * Math.PI) / star.period) * star.variationAmplitude;
        const newBrightness = star.baseBrightness + variation;

        // Find the star in the geometry and update brightness
        const brightnesses = this.starField.geometry.attributes.brightness.array;
        const starIndex =
          this.starCatalog.mainSequence.length +
          this.starCatalog.giants.length +
          this.starCatalog.dwarfs.length +
          this.starCatalog.binaries.length +
          index;

        if (starIndex < brightnesses.length) {
          brightnesses[starIndex] = newBrightness;
        }
      });

      this.starField.geometry.attributes.brightness.needsUpdate = true;
    }

    // Update galaxy rotation
    if (this.galaxyBackground) {
      this.galaxyBackground.material.uniforms.time.value = this.time;
      this.galaxyBackground.material.uniforms.galaxyRotation.value = this.time * 0.005;
    }

    // Update shooting stars
    this.shootingStars.forEach(star => {
      if (star.visible) {
        star.material.uniforms.time.value = this.time;
      }
    });

    // Create new shooting stars occasionally
    if (
      this.time - this.lastShootingStarTime > 5 &&
      Math.random() < this.settings.shootingStarFrequency
    ) {
      this.createShootingStar();
      this.lastShootingStarTime = this.time;
    }
  }

  /**
   * Utility methods for star generation
   */
  randomSpherePosition(radius) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    );
  }

  addRandomOffset(position, maxOffset) {
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * maxOffset,
      (Math.random() - 0.5) * maxOffset,
      (Math.random() - 0.5) * maxOffset
    );
    return position.clone().add(offset);
  }

  getMainSequenceColor() {
    const colors = [
      new THREE.Color(1.0, 1.0, 1.0), // White
      new THREE.Color(1.0, 0.9, 0.8), // Warm white
      new THREE.Color(0.9, 0.9, 1.0), // Cool white
      new THREE.Color(1.0, 0.8, 0.6) // Orange
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getGiantColor() {
    const colors = [
      new THREE.Color(1.0, 0.6, 0.4), // Red giant
      new THREE.Color(1.0, 0.8, 0.4), // Orange giant
      new THREE.Color(0.8, 0.8, 1.0) // Blue giant
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getDwarfColor() {
    const colors = [
      new THREE.Color(1.0, 0.4, 0.2), // Red dwarf
      new THREE.Color(0.8, 0.6, 0.4), // Brown dwarf
      new THREE.Color(0.9, 0.9, 0.9) // White dwarf
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getVariableColor() {
    const colors = [
      new THREE.Color(1.0, 0.7, 0.3), // Cepheid
      new THREE.Color(0.8, 0.8, 1.0), // RR Lyrae
      new THREE.Color(1.0, 0.5, 0.5) // Irregular variable
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Update settings
   * @param {object} newSettings - New settings to apply
   */
  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);

    if (this.starField) {
      this.starField.material.uniforms.twinkleSpeed.value = this.settings.starTwinkleSpeed;
      this.starField.material.uniforms.twinkleIntensity.value = this.settings.starTwinkleIntensity;
    }

    if (this.galaxyBackground) {
      this.galaxyBackground.material.uniforms.galaxyOpacity.value = this.settings.galaxyOpacity;
      this.galaxyBackground.material.uniforms.nebulaOpacity.value = this.settings.nebulaOpacity;
    }
  }

  /**
   * Set visibility of starfield components
   * @param {boolean} visible - Whether starfield should be visible
   */
  setVisible(visible) {
    if (this.starField) {
      this.starField.visible = visible;
    }
    if (this.galaxyBackground) {
      this.galaxyBackground.visible = visible;
    }
    this.shootingStars.forEach(star => {
      if (!visible) {
        star.visible = false;
      }
    });
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.starField) {
      this.scene.remove(this.starField);
      this.starField.geometry.dispose();
      this.starField.material.dispose();
    }

    if (this.galaxyBackground) {
      this.scene.remove(this.galaxyBackground);
      this.galaxyBackground.geometry.dispose();
      this.galaxyBackground.material.dispose();
    }

    this.shootingStars.forEach(star => {
      this.scene.remove(star);
      star.geometry.dispose();
      star.material.dispose();
    });

    this.shootingStars = [];
  }
}
