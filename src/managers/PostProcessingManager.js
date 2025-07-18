import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader';

/**
 * PostProcessingManager - Handles post-processing effects for enhanced visuals
 * Includes bloom, anti-aliasing, color grading, and more
 */
export class PostProcessingManager {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Effect composer
    this.composer = null;

    // Individual passes
    this.renderPass = null;
    this.bloomPass = null;
    this.fxaaPass = null;
    this.smaaPass = null;
    this.colorGradingPass = null;
    this.gammaCorrectionPass = null;

    // Settings
    this.enabled = true;
    this.quality = 'high'; // 'low', 'medium', 'high'

    // Initialize
    this.init();
  }

  /**
   * Initialize post-processing pipeline
   */
  init() {
    // Create composer
    const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      encoding: THREE.sRGBEncoding,
      stencilBuffer: false
    });

    this.composer = new EffectComposer(this.renderer, renderTarget);

    // Add render pass
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // Add bloom pass
    this.setupBloom();

    // Add anti-aliasing
    this.setupAntiAliasing();

    // Add color grading
    this.setupColorGrading();

    // Add gamma correction (should be last)
    this.setupGammaCorrection();

    // Handle resize
    this.handleResize();
  }

  /**
   * Setup bloom effect for glowing elements
   */
  setupBloom() {
    const bloomParams = {
      low: { strength: 0.5, radius: 0.4, threshold: 0.85 },
      medium: { strength: 1.0, radius: 0.6, threshold: 0.75 },
      high: { strength: 1.5, radius: 0.8, threshold: 0.65 }
    };

    const params = bloomParams[this.quality];

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      params.strength,
      params.radius,
      params.threshold
    );

    this.composer.addPass(this.bloomPass);
  }

  /**
   * Setup anti-aliasing based on quality setting
   */
  setupAntiAliasing() {
    if (this.quality === 'high') {
      // Use SMAA for high quality
      this.smaaPass = new SMAAPass(
        window.innerWidth * this.renderer.getPixelRatio(),
        window.innerHeight * this.renderer.getPixelRatio()
      );
      this.composer.addPass(this.smaaPass);
    } else {
      // Use FXAA for lower quality settings
      this.fxaaPass = new ShaderPass(FXAAShader);
      this.fxaaPass.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
      this.composer.addPass(this.fxaaPass);
    }
  }

  /**
   * Setup color grading for cinematic look
   */
  setupColorGrading() {
    const colorGradingShader = {
      uniforms: {
        tDiffuse: { value: null },
        contrast: { value: 1.1 },
        brightness: { value: 0.0 },
        saturation: { value: 1.1 },
        vibrance: { value: 0.3 },
        hue: { value: 0.0 },
        tint: { value: new THREE.Color(0.95, 0.95, 1.0) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float contrast;
        uniform float brightness;
        uniform float saturation;
        uniform float vibrance;
        uniform float hue;
        uniform vec3 tint;
        varying vec2 vUv;
        
        vec3 rgb2hsv(vec3 c) {
          vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
          vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
          vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }
        
        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          vec3 color = texel.rgb;
          
          // Apply brightness
          color += brightness;
          
          // Apply contrast
          color = (color - 0.5) * contrast + 0.5;
          
          // Apply tint
          color *= tint;
          
          // Convert to HSV for saturation and hue adjustments
          vec3 hsv = rgb2hsv(color);
          
          // Apply hue shift
          hsv.x = mod(hsv.x + hue, 1.0);
          
          // Apply saturation
          hsv.y *= saturation;
          
          // Apply vibrance (smart saturation)
          float average = (color.r + color.g + color.b) / 3.0;
          float mx = max(color.r, max(color.g, color.b));
          float amt = (mx - average) * (-vibrance * 3.0);
          color = mix(color, vec3(mx), amt);
          
          // Convert back to RGB
          color = hsv2rgb(hsv);
          
          // Clamp to valid range
          color = clamp(color, 0.0, 1.0);
          
          gl_FragColor = vec4(color, texel.a);
        }
      `
    };

    this.colorGradingPass = new ShaderPass(colorGradingShader);
    this.composer.addPass(this.colorGradingPass);
  }

  /**
   * Setup gamma correction
   */
  setupGammaCorrection() {
    this.gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
    this.composer.addPass(this.gammaCorrectionPass);
  }

  /**
   * Add vignette effect
   */
  addVignetteEffect() {
    const vignetteShader = {
      uniforms: {
        tDiffuse: { value: null },
        strength: { value: 0.4 },
        radius: { value: 0.7 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float strength;
        uniform float radius;
        varying vec2 vUv;
        
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          float vignette = smoothstep(radius, radius - 0.3, dist);
          vignette = 1.0 - (1.0 - vignette) * strength;
          gl_FragColor = vec4(texel.rgb * vignette, texel.a);
        }
      `
    };

    const vignettePass = new ShaderPass(vignetteShader);
    // Insert before gamma correction
    this.composer.insertPass(vignettePass, this.composer.passes.length - 1);
  }

  /**
   * Update bloom parameters
   * @param {object} params - Bloom parameters
   */
  updateBloom(params) {
    if (this.bloomPass) {
      if (params.strength !== undefined) {
        this.bloomPass.strength = params.strength;
      }
      if (params.radius !== undefined) {
        this.bloomPass.radius = params.radius;
      }
      if (params.threshold !== undefined) {
        this.bloomPass.threshold = params.threshold;
      }
    }
  }

  /**
   * Update color grading parameters
   * @param {object} params - Color grading parameters
   */
  updateColorGrading(params) {
    if (this.colorGradingPass) {
      const uniforms = this.colorGradingPass.uniforms;
      if (params.contrast !== undefined) {
        uniforms.contrast.value = params.contrast;
      }
      if (params.brightness !== undefined) {
        uniforms.brightness.value = params.brightness;
      }
      if (params.saturation !== undefined) {
        uniforms.saturation.value = params.saturation;
      }
      if (params.vibrance !== undefined) {
        uniforms.vibrance.value = params.vibrance;
      }
      if (params.hue !== undefined) {
        uniforms.hue.value = params.hue;
      }
      if (params.tint !== undefined) {
        uniforms.tint.value.copy(params.tint);
      }
    }
  }

  /**
   * Set quality level
   * @param {string} quality - 'low', 'medium', 'high'
   */
  setQuality(quality) {
    this.quality = quality;

    // Rebuild post-processing pipeline with new quality
    this.dispose();
    this.init();
  }

  /**
   * Enable/disable post-processing
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Render the scene with post-processing
   * @param {number} deltaTime - Time since last frame
   */
  render(deltaTime) {
    if (this.enabled && this.composer) {
      this.composer.render(deltaTime);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (this.composer) {
      this.composer.setSize(width, height);
    }

    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }

    if (this.fxaaPass) {
      this.fxaaPass.uniforms['resolution'].value.set(1 / width, 1 / height);
    }

    if (this.smaaPass) {
      this.smaaPass.setSize(
        width * this.renderer.getPixelRatio(),
        height * this.renderer.getPixelRatio()
      );
    }
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
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }

    // Dispose individual passes
    this.renderPass = null;
    this.bloomPass = null;
    this.fxaaPass = null;
    this.smaaPass = null;
    this.colorGradingPass = null;
    this.gammaCorrectionPass = null;
  }
}
