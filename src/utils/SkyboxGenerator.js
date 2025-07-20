import * as THREE from 'three';

/**
 * SkyboxGenerator - Creates procedural space skyboxes and environment maps
 * Generates HDR-like environment textures for realistic PBR reflections
 */
export class SkyboxGenerator {
  constructor() {
    this.textureSize = 1024;
    this.cubeSize = 512;
  }

  /**
   * Generate a deep space skybox with stars and nebulae
   * @param {object} options - Generation options
   * @returns {THREE.CubeTexture} Generated skybox
   */
  generateDeepSpaceSkybox(options = {}) {
    const {
      starCount = 3000,
      nebulaIntensity = 0.3,
      colorVariation = 0.8,
      brightStars = 50
    } = options;

    const cubeTexture = new THREE.CubeTexture();
    const faces = [];

    // Generate each cube face
    for (let i = 0; i < 6; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = this.cubeSize;
      canvas.height = this.cubeSize;
      const context = canvas.getContext('2d');

      // Create gradient background (deep space)
      const gradient = context.createRadialGradient(
        this.cubeSize / 2,
        this.cubeSize / 2,
        0,
        this.cubeSize / 2,
        this.cubeSize / 2,
        this.cubeSize / 2
      );

      gradient.addColorStop(0, 'rgba(25, 25, 60, 1)');
      gradient.addColorStop(0.5, 'rgba(15, 15, 40, 1)');
      gradient.addColorStop(1, 'rgba(5, 5, 20, 1)');

      context.fillStyle = gradient;
      context.fillRect(0, 0, this.cubeSize, this.cubeSize);

      // Add nebula clouds
      this.addNebulaClouds(context, nebulaIntensity, i);

      // Add stars
      this.addStars(context, starCount / 6, brightStars / 6, colorVariation);

      faces.push(canvas);
    }

    cubeTexture.images = faces;
    cubeTexture.format = THREE.RGBAFormat;
    cubeTexture.mapping = THREE.CubeReflectionMapping;
    cubeTexture.generateMipmaps = true;
    cubeTexture.needsUpdate = true;

    return cubeTexture;
  }

  /**
   * Generate a space station interior skybox
   * @param {object} options - Generation options
   * @returns {THREE.CubeTexture} Generated skybox
   */
  generateStationSkybox(options = {}) {
    const { panelIntensity = 0.6, lightStrips = true, windows = true } = options;

    const cubeTexture = new THREE.CubeTexture();
    const faces = [];

    for (let i = 0; i < 6; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = this.cubeSize;
      canvas.height = this.cubeSize;
      const context = canvas.getContext('2d');

      // Base metallic background
      const gradient = context.createLinearGradient(0, 0, this.cubeSize, this.cubeSize);
      gradient.addColorStop(0, 'rgba(60, 70, 80, 1)');
      gradient.addColorStop(0.5, 'rgba(80, 90, 100, 1)');
      gradient.addColorStop(1, 'rgba(50, 60, 70, 1)');

      context.fillStyle = gradient;
      context.fillRect(0, 0, this.cubeSize, this.cubeSize);

      // Add tech panels
      this.addTechPanels(context, panelIntensity, i);

      // Add light strips
      if (lightStrips) {
        this.addLightStrips(context, i);
      }

      // Add windows to space (only on some faces)
      if (windows && i < 2) {
        this.addStationWindows(context, i);
      }

      faces.push(canvas);
    }

    cubeTexture.images = faces;
    cubeTexture.format = THREE.RGBAFormat;
    cubeTexture.mapping = THREE.CubeReflectionMapping;
    cubeTexture.generateMipmaps = true;
    cubeTexture.needsUpdate = true;

    return cubeTexture;
  }

  /**
   * Generate an HDR-like environment map
   * @param {string} type - 'deep-space' or 'station'
   * @returns {THREE.CubeTexture} HDR environment map
   */
  generateHDREnvironment(type = 'deep-space') {
    let skybox;

    if (type === 'station') {
      skybox = this.generateStationSkybox({
        panelIntensity: 0.8,
        lightStrips: true,
        windows: true
      });
    } else {
      skybox = this.generateDeepSpaceSkybox({
        starCount: 5000,
        nebulaIntensity: 0.4,
        brightStars: 100
      });
    }

    // Enhance for HDR-like properties
    skybox.encoding = THREE.sRGBEncoding;
    skybox.flipY = false;

    return skybox;
  }

  /**
   * Add nebula cloud effects
   * @param {CanvasRenderingContext2D} context
   * @param {number} intensity
   * @param {number} faceIndex
   */
  addNebulaClouds(context, intensity, faceIndex) {
    const cloudCount = 3 + Math.random() * 3;

    for (let i = 0; i < cloudCount; i++) {
      const x = Math.random() * this.cubeSize;
      const y = Math.random() * this.cubeSize;
      const radius = 50 + Math.random() * 150;

      // Random nebula colors
      const colors = [
        `rgba(120, 50, 200, ${intensity})`, // Purple
        `rgba(50, 120, 200, ${intensity})`, // Blue
        `rgba(200, 100, 50, ${intensity})`, // Orange
        `rgba(200, 50, 100, ${intensity})` // Pink
      ];

      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, colors[Math.floor(Math.random() * colors.length)]);
      gradient.addColorStop(0.5, `rgba(50, 50, 100, ${intensity * 0.5})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      context.fillStyle = gradient;
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }

  /**
   * Add stars to the skybox
   * @param {CanvasRenderingContext2D} context
   * @param {number} starCount
   * @param {number} brightStars
   * @param {number} colorVariation
   */
  addStars(context, starCount, brightStars, colorVariation) {
    // Regular stars
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * this.cubeSize;
      const y = Math.random() * this.cubeSize;
      const brightness = 0.3 + Math.random() * 0.7;
      const size = Math.random() * 1.5 + 0.5;

      // Star color variation
      let color = `rgba(255, 255, 255, ${brightness})`;
      if (Math.random() < colorVariation) {
        const r = 200 + Math.random() * 55;
        const g = 200 + Math.random() * 55;
        const b = 200 + Math.random() * 55;
        color = `rgba(${r}, ${g}, ${b}, ${brightness})`;
      }

      context.fillStyle = color;
      context.fillRect(x, y, size, size);
    }

    // Bright stars with glow
    for (let i = 0; i < brightStars; i++) {
      const x = Math.random() * this.cubeSize;
      const y = Math.random() * this.cubeSize;
      const glowRadius = 3 + Math.random() * 5;

      const gradient = context.createRadialGradient(x, y, 0, x, y, glowRadius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      context.fillStyle = gradient;
      context.fillRect(x - glowRadius, y - glowRadius, glowRadius * 2, glowRadius * 2);
    }
  }

  /**
   * Add tech panels to station interior
   * @param {CanvasRenderingContext2D} context
   * @param {number} intensity
   * @param {number} faceIndex
   */
  addTechPanels(context, intensity, faceIndex) {
    const panelCount = 8 + Math.random() * 12;

    for (let i = 0; i < panelCount; i++) {
      const width = 40 + Math.random() * 80;
      const height = 20 + Math.random() * 40;
      const x = Math.random() * (this.cubeSize - width);
      const y = Math.random() * (this.cubeSize - height);

      // Panel background
      context.fillStyle = `rgba(100, 110, 120, ${intensity})`;
      context.fillRect(x, y, width, height);

      // Panel border
      context.strokeStyle = `rgba(150, 160, 170, ${intensity * 1.2})`;
      context.lineWidth = 1;
      context.strokeRect(x, y, width, height);

      // Random panel details
      if (Math.random() < 0.3) {
        context.fillStyle = `rgba(0, 200, 100, ${intensity * 0.8})`;
        context.fillRect(x + 5, y + 5, 8, 8);
      }
    }
  }

  /**
   * Add glowing light strips
   * @param {CanvasRenderingContext2D} context
   * @param {number} faceIndex
   */
  addLightStrips(context, faceIndex) {
    const stripCount = 3 + Math.random() * 3;

    for (let i = 0; i < stripCount; i++) {
      const isHorizontal = Math.random() < 0.5;
      const stripWidth = isHorizontal ? this.cubeSize : 8 + Math.random() * 12;
      const stripHeight = isHorizontal ? 8 + Math.random() * 12 : this.cubeSize;
      const x = isHorizontal ? 0 : Math.random() * (this.cubeSize - stripWidth);
      const y = isHorizontal ? Math.random() * (this.cubeSize - stripHeight) : 0;

      const gradient = isHorizontal
        ? context.createLinearGradient(0, y, 0, y + stripHeight)
        : context.createLinearGradient(x, 0, x + stripWidth, 0);

      gradient.addColorStop(0, 'rgba(100, 200, 255, 0)');
      gradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');

      context.fillStyle = gradient;
      context.fillRect(x, y, stripWidth, stripHeight);
    }
  }

  /**
   * Add windows showing space views
   * @param {CanvasRenderingContext2D} context
   * @param {number} faceIndex
   */
  addStationWindows(context, faceIndex) {
    const windowCount = 2 + Math.random() * 3;

    for (let i = 0; i < windowCount; i++) {
      const width = 60 + Math.random() * 100;
      const height = 80 + Math.random() * 120;
      const x = Math.random() * (this.cubeSize - width);
      const y = Math.random() * (this.cubeSize - height);

      // Window frame
      context.fillStyle = 'rgba(40, 50, 60, 1)';
      context.fillRect(x - 5, y - 5, width + 10, height + 10);

      // Window view (space)
      const gradient = context.createRadialGradient(
        x + width / 2,
        y + height / 2,
        0,
        x + width / 2,
        y + height / 2,
        Math.max(width, height) / 2
      );
      gradient.addColorStop(0, 'rgba(15, 15, 40, 1)');
      gradient.addColorStop(1, 'rgba(5, 5, 20, 1)');

      context.fillStyle = gradient;
      context.fillRect(x, y, width, height);

      // Add some stars in the window
      for (let j = 0; j < 20; j++) {
        const starX = x + Math.random() * width;
        const starY = y + Math.random() * height;
        context.fillStyle = 'rgba(255, 255, 255, 0.8)';
        context.fillRect(starX, starY, 1, 1);
      }
    }
  }

  /**
   * Create and cache skybox textures
   * @param {string} type - Skybox type
   * @returns {THREE.CubeTexture} Cached skybox
   */
  getCachedSkybox(type) {
    if (!this.cache) {
      this.cache = new Map();
    }

    if (!this.cache.has(type)) {
      let skybox;
      switch (type) {
        case 'deep-space':
          skybox = this.generateDeepSpaceSkybox();
          break;
        case 'station':
          skybox = this.generateStationSkybox();
          break;
        case 'hdr-space':
          skybox = this.generateHDREnvironment('deep-space');
          break;
        case 'hdr-station':
          skybox = this.generateHDREnvironment('station');
          break;
        default:
          skybox = this.generateDeepSpaceSkybox();
      }
      this.cache.set(type, skybox);
    }

    return this.cache.get(type);
  }

  /**
   * Clean up cached textures
   */
  dispose() {
    if (this.cache) {
      this.cache.forEach(texture => {
        if (texture.dispose) {
          texture.dispose();
        }
      });
      this.cache.clear();
    }
  }
}
