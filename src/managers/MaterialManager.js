import * as THREE from 'three';

/**
 * MaterialManager - Manages textures and materials for the game
 * Provides centralized material creation with PBR support and texture caching
 */
export class MaterialManager {
  constructor() {
    // Texture loader with caching
    this.textureLoader = new THREE.TextureLoader();

    // Cache for loaded textures
    this.textureCache = new Map();

    // Cache for created materials
    this.materialCache = new Map();

    // Quality settings
    this.textureQuality = 'high'; // 'low', 'medium', 'high'

    // Base texture path
    this.basePath = './assets/textures/';

    // Renderer capabilities
    this.maxAnisotropy = null;

    // Initialize default textures
    this.initializeDefaultTextures();

    // Environment map for reflections
    this.envMap = null;
  }

  /**
   * Get maximum anisotropy supported by the renderer
   * @returns {number} Maximum anisotropy level
   */
  getMaxAnisotropy() {
    if (this.maxAnisotropy === null) {
      // Try to get renderer from global context or default to 1
      try {
        const renderer = window.THREE_RENDERER || null;
        if (renderer) {
          this.maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
        } else {
          this.maxAnisotropy = 4; // Conservative default
        }
      } catch (error) {
        this.maxAnisotropy = 4; // Fallback
      }
    }
    return this.maxAnisotropy;
  }

  /**
   * Set renderer reference for capability detection
   * @param {THREE.WebGLRenderer} renderer
   */
  setRenderer(renderer) {
    if (renderer && renderer.capabilities) {
      this.maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    }
  }

  /**
   * Initialize default textures that can be used as fallbacks
   */
  initializeDefaultTextures() {
    // Create a default normal map (flat normal)
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size * 4; i += 4) {
      data[i] = 128; // R (X normal)
      data[i + 1] = 128; // G (Y normal)
      data[i + 2] = 255; // B (Z normal)
      data[i + 3] = 255; // A
    }

    const defaultNormalTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    defaultNormalTexture.needsUpdate = true;
    this.textureCache.set('default_normal', defaultNormalTexture);

    // Create default roughness texture (medium roughness)
    const roughnessData = new Uint8Array(size * size);
    roughnessData.fill(128); // 0.5 roughness

    const defaultRoughnessTexture = new THREE.DataTexture(
      roughnessData,
      size,
      size,
      THREE.RedFormat,
      THREE.UnsignedByteType
    );
    defaultRoughnessTexture.needsUpdate = true;
    this.textureCache.set('default_roughness', defaultRoughnessTexture);
  }

  /**
   * Load a texture with caching and quality settings
   * @param {string} path - Relative path to the texture
   * @param {object} options - Loading options
   * @returns {Promise<THREE.Texture>}
   */
  async loadTexture(path, options = {}) {
    // Adjust path based on quality setting
    const qualityPath = this.getQualityPath(path);

    // Check cache first
    if (this.textureCache.has(qualityPath)) {
      return this.textureCache.get(qualityPath);
    }

    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        qualityPath,
        texture => {
          // Configure texture settings
          if (options.wrapS !== undefined) {
            texture.wrapS = options.wrapS;
          }
          if (options.wrapT !== undefined) {
            texture.wrapT = options.wrapT;
          }
          if (options.repeat) {
            texture.repeat.set(options.repeat.x, options.repeat.y);
          }

          // Enhanced texture quality settings
          if (options.anisotropy !== undefined) {
            texture.anisotropy = options.anisotropy;
          } else {
            // Default to max anisotropy for better quality
            texture.anisotropy = Math.min(16, this.getMaxAnisotropy());
          }

          // Improve texture filtering
          texture.magFilter = THREE.LinearFilter;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.generateMipmaps = true;

          // Set color space for diffuse textures
          if (options.encoding) {
            texture.encoding = options.encoding;
          } else if (path.includes('diffuse') || path.includes('albedo')) {
            texture.encoding = THREE.sRGBEncoding;
          }

          // Cache the texture
          this.textureCache.set(qualityPath, texture);
          resolve(texture);
        },
        undefined,
        error => {
          console.error(`Failed to load texture: ${qualityPath}`, error);
          // Return a default texture based on type
          if (path.includes('normal')) {
            resolve(this.textureCache.get('default_normal'));
          } else if (path.includes('roughness')) {
            resolve(this.textureCache.get('default_roughness'));
          } else {
            reject(error);
          }
        }
      );
    });
  }

  /**
   * Get quality-adjusted texture path
   * @param {string} path - Original texture path
   * @returns {string} Quality-adjusted path
   */
  getQualityPath(path) {
    if (this.textureQuality === 'high') {
      return path;
    }

    // Replace extension with quality suffix
    const ext = path.substring(path.lastIndexOf('.'));
    const base = path.substring(0, path.lastIndexOf('.'));

    if (this.textureQuality === 'medium') {
      return `${base}_medium${ext}`;
    } else {
      return `${base}_low${ext}`;
    }
  }

  /**
   * Create a PBR material for course surfaces
   * @param {object} options - Material options
   * @returns {Promise<THREE.MeshStandardMaterial>}
   */
  async createCourseMaterial(options = {}) {
    const {
      type = 'grass', // 'grass', 'metal', 'concrete'
      color = 0x2ecc71,
      repeat = { x: 4, y: 4 }
    } = options;

    // Check cache
    const cacheKey = `course_${type}_${color}`;
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey);
    }

    // Load textures based on type
    const textures = {};

    if (type === 'grass') {
      textures.map = await this.loadTexture(`${this.basePath}grass/diffuse.jpg`, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        repeat,
        encoding: THREE.sRGBEncoding
      });

      textures.normalMap = await this.loadTexture(`${this.basePath}grass/normal.jpg`, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        repeat
      });

      textures.roughnessMap = await this.loadTexture(`${this.basePath}grass/roughness.jpg`, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        repeat
      });
    } else if (type === 'metal') {
      textures.map = await this.loadTexture(`${this.basePath}metal/diffuse.jpg`, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        repeat,
        encoding: THREE.sRGBEncoding
      });

      textures.normalMap = await this.loadTexture(`${this.basePath}metal/normal.jpg`, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        repeat
      });

      textures.roughnessMap = await this.loadTexture(`${this.basePath}metal/roughness.jpg`, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        repeat
      });

      textures.metalnessMap = await this.loadTexture(`${this.basePath}metal/metalness.jpg`, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        repeat
      });
    }

    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      ...textures,
      roughness: type === 'grass' ? 0.8 : 0.4,
      metalness: type === 'metal' ? 0.8 : 0.1,
      normalScale: new THREE.Vector2(1, 1),
      envMapIntensity: type === 'metal' ? 1.5 : 0.5
    });

    // Cache the material
    this.materialCache.set(cacheKey, material);

    return material;
  }

  /**
   * Create a material for walls with sci-fi styling
   * @param {object} options - Material options
   * @returns {Promise<THREE.MeshStandardMaterial>}
   */
  async createWallMaterial(options = {}) {
    const {
      type = 'tech', // 'tech', 'hazard', 'glass'
      color = 0x444444,
      emissive = 0x000000,
      emissiveIntensity = 0.2
    } = options;

    // Check cache
    const cacheKey = `wall_${type}_${color}`;
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey);
    }

    let material;

    if (type === 'tech') {
      const diffuse = await this.loadTexture(`${this.basePath}tech_wall/diffuse.jpg`, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        encoding: THREE.sRGBEncoding
      });

      const normal = await this.loadTexture(`${this.basePath}tech_wall/normal.jpg`, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
      });

      material = new THREE.MeshStandardMaterial({
        map: diffuse,
        normalMap: normal,
        color: new THREE.Color(color),
        emissive: new THREE.Color(emissive),
        emissiveIntensity,
        roughness: 0.3,
        metalness: 0.7
      });
    } else if (type === 'hazard') {
      // Create procedural hazard stripes
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Draw diagonal stripes
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#ffcc00';

      for (let i = -256; i < 512; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 256, 256);
        ctx.lineTo(i + 256 - 32, 256);
        ctx.lineTo(i - 32, 0);
        ctx.closePath();
        ctx.fill();
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.6,
        metalness: 0.2
      });
    } else if (type === 'glass') {
      material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color),
        metalness: 0.0,
        roughness: 0.0,
        transmission: 0.9,
        thickness: 0.5,
        envMapIntensity: 1.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.0
      });
    }

    // Cache the material
    this.materialCache.set(cacheKey, material);

    return material;
  }

  /**
   * Create an enhanced ball material
   * @param {object} options - Material options
   * @returns {THREE.MeshStandardMaterial}
   */
  createBallMaterial(options = {}) {
    const {
      type = 'classic', // 'classic', 'metal', 'plasma'
      color = 0xffffff
    } = options;

    let material;

    if (type === 'classic') {
      material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.3,
        metalness: 0.1,
        envMapIntensity: 0.5
      });
    } else if (type === 'metal') {
      material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.1,
        metalness: 1.0,
        envMapIntensity: 2.0
      });
    } else if (type === 'plasma') {
      material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.5,
        envMapIntensity: 1.5
      });
    }

    // Apply environment map if available
    if (this.envMap && material) {
      material.envMap = this.envMap;
      material.needsUpdate = true;
    }

    return material;
  }

  /**
   * Create a glowing material for special elements
   * @param {object} options - Material options
   * @returns {THREE.MeshStandardMaterial}
   */
  createGlowMaterial(options = {}) {
    const { color = 0x00ffff, intensity = 1.0 } = options;

    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      emissiveIntensity: intensity,
      roughness: 0.2,
      metalness: 0.5,
      side: THREE.DoubleSide
    });
  }

  /**
   * Set environment map for PBR reflections
   * @param {THREE.Texture} envMap - Environment map texture
   */
  setEnvironmentMap(envMap) {
    this.envMap = envMap;
    this.updateAllMaterialsEnvMap();
  }

  /**
   * Update all cached materials with current environment map
   */
  updateAllMaterialsEnvMap() {
    this.materialCache.forEach(material => {
      if (material && (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial)) {
        material.envMap = this.envMap;
        material.needsUpdate = true;
      }
    });
  }

  /**
   * Update material quality settings
   * @param {string} quality - 'low', 'medium', 'high'
   */
  setQuality(quality) {
    this.textureQuality = quality;
    // Clear caches to force reload with new quality
    this.clearCache();
  }

  /**
   * Clear all cached textures and materials
   */
  clearCache() {
    // Dispose of textures
    this.textureCache.forEach((texture, key) => {
      if (key !== 'default_normal' && key !== 'default_roughness') {
        texture.dispose();
      }
    });

    // Clear texture cache except defaults
    const defaultNormal = this.textureCache.get('default_normal');
    const defaultRoughness = this.textureCache.get('default_roughness');
    this.textureCache.clear();
    this.textureCache.set('default_normal', defaultNormal);
    this.textureCache.set('default_roughness', defaultRoughness);

    // Dispose of materials
    this.materialCache.forEach(material => {
      material.dispose();
    });
    this.materialCache.clear();
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
    this.clearCache();
    // Dispose default textures
    this.textureCache.forEach(texture => texture.dispose());
    this.textureCache.clear();
  }
}
