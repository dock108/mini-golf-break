import * as THREE from 'three';

/**
 * StarfieldShader - Advanced shader-based starfield with realistic effects
 * Provides twinkling stars, distance-based sizing, and color variation
 */
export const StarfieldShader = {
  uniforms: {
    time: { value: 0.0 },
    pointScale: { value: 1.0 },
    twinkleSpeed: { value: 1.0 },
    twinkleIntensity: { value: 0.5 },
    starDensity: { value: 1.0 },
    galaxyRotation: { value: 0.0 },
    brightStarThreshold: { value: 0.8 },
    nebulaInfluence: { value: 0.2 }
  },

  vertexShader: `
    attribute float size;
    attribute float brightness;
    attribute float twinklePhase;
    attribute float starType;
    attribute vec3 starColor;
    
    uniform float time;
    uniform float pointScale;
    uniform float twinkleSpeed;
    uniform float twinkleIntensity;
    uniform float galaxyRotation;
    
    varying float vBrightness;
    varying float vTwinkle;
    varying float vStarType;
    varying vec3 vStarColor;
    varying float vDistance;

    void main() {
      vStarColor = starColor;
      vStarType = starType;
      
      // Calculate distance from camera
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vDistance = length(mvPosition.xyz);
      
      // Twinkling effect based on phase and time
      float twinkle = sin(time * twinkleSpeed + twinklePhase * 6.28318) * 0.5 + 0.5;
      vTwinkle = mix(1.0, twinkle, twinkleIntensity);
      
      // Brightness with atmospheric scintillation for bright stars
      float atmosphericScintillation = 1.0;
      if (starType > 0.8) { // Bright stars
        atmosphericScintillation = 0.8 + 0.4 * sin(time * 3.0 + twinklePhase * 12.56637);
      }
      
      vBrightness = brightness * vTwinkle * atmosphericScintillation;
      
      // Size calculation with distance falloff
      float pointSize = size * pointScale;
      
      // Bright stars appear larger
      if (starType > 0.8) {
        pointSize *= (1.5 + 0.5 * vTwinkle);
      }
      
      // Distance-based size with realistic falloff
      pointSize *= (300.0 / vDistance);
      
      gl_PointSize = max(pointSize, 1.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: `
    uniform float time;
    uniform float brightStarThreshold;
    uniform float nebulaInfluence;
    
    varying float vBrightness;
    varying float vTwinkle;
    varying float vStarType;
    varying vec3 vStarColor;
    varying float vDistance;

    void main() {
      // Calculate distance from center of point
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);
      
      if (dist > 0.5) discard; // Circular points
      
      // Star core intensity
      float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
      
      // Different star rendering based on type
      float alpha = intensity * vBrightness;
      vec3 color = vStarColor;
      
      if (vStarType > brightStarThreshold) {
        // Bright stars with diffraction spikes and glow
        
        // Core glow
        float coreGlow = 1.0 - smoothstep(0.0, 0.2, dist);
        alpha = max(alpha, coreGlow * vBrightness * 0.8);
        
        // Diffraction spikes (simplified)
        vec2 spikeCoord = center * 2.0; // Scale for spike calculation
        float spikeMask = 0.0;
        
        // Horizontal spike
        if (abs(spikeCoord.y) < 0.05) {
          spikeMask = max(spikeMask, 1.0 - smoothstep(0.0, 0.4, abs(spikeCoord.x)));
        }
        
        // Vertical spike  
        if (abs(spikeCoord.x) < 0.05) {
          spikeMask = max(spikeMask, 1.0 - smoothstep(0.0, 0.4, abs(spikeCoord.y)));
        }
        
        // Add spike contribution
        alpha = max(alpha, spikeMask * vBrightness * 0.4 * vTwinkle);
        
        // Color temperature variation for bright stars
        float tempVariation = sin(time * 0.5 + vDistance * 0.01) * 0.1;
        color = mix(color, vec3(1.0, 0.9, 0.8), tempVariation);
      }
      
      // Atmospheric color scattering (subtle)
      vec3 atmosphericTint = mix(vec3(1.0), vec3(0.8, 0.9, 1.2), nebulaInfluence);
      color *= atmosphericTint;
      
      // Distance-based dimming for realism
      float distanceDimming = 1.0 - smoothstep(200.0, 400.0, vDistance);
      alpha *= distanceDimming;
      
      gl_FragColor = vec4(color, alpha);
    }
  `
};

/**
 * GalaxyShader - Background galaxy and nebula effects
 */
export const GalaxyShader = {
  uniforms: {
    time: { value: 0.0 },
    galaxyTexture: { value: null },
    nebulaTexture: { value: null },
    galaxyOpacity: { value: 0.3 },
    nebulaOpacity: { value: 0.4 },
    galaxyRotation: { value: 0.0 },
    colorShift: { value: new THREE.Vector3(1.0, 0.8, 1.2) }
  },

  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform float time;
    uniform float galaxyOpacity;
    uniform float nebulaOpacity;
    uniform float galaxyRotation;
    uniform vec3 colorShift;
    
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    // Noise function for procedural galaxies
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    float smoothNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      
      float a = noise(i);
      float b = noise(i + vec2(1.0, 0.0));
      float c = noise(i + vec2(0.0, 1.0));
      float d = noise(i + vec2(1.0, 1.0));
      
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    float fractalNoise(vec2 p, int octaves) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      
      for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * smoothNoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      
      return value;
    }
    
    void main() {
      // Convert world position to spherical coordinates for galaxy mapping
      vec3 normalized = normalize(vWorldPosition);
      float theta = atan(normalized.z, normalized.x) + galaxyRotation;
      float phi = acos(normalized.y);
      
      vec2 galaxyUV = vec2(theta / (2.0 * 3.14159), phi / 3.14159);
      
      // Procedural galaxy
      vec2 spiralCoord = galaxyUV * 8.0 + time * 0.02;
      float spiral = fractalNoise(spiralCoord, 6);
      
      // Galaxy arms
      float armPattern = sin(theta * 2.0 + spiral * 2.0) * 0.5 + 0.5;
      armPattern = pow(armPattern, 3.0);
      
      // Galactic center
      float centerDistance = length(galaxyUV - vec2(0.5, 0.5));
      float centerGlow = 1.0 - smoothstep(0.0, 0.3, centerDistance);
      
      // Combine galaxy elements
      float galaxyIntensity = (spiral * 0.6 + armPattern * 0.4 + centerGlow * 0.8) * galaxyOpacity;
      
      // Nebula effects
      vec2 nebulaCoord = galaxyUV * 4.0 + time * 0.01;
      float nebula = fractalNoise(nebulaCoord, 4);
      nebula = smoothstep(0.3, 0.8, nebula);
      
      // Nebula colors (purple, blue, orange)
      vec3 nebulaColor = mix(
        vec3(0.8, 0.4, 1.0),  // Purple
        vec3(0.4, 0.8, 1.0),  // Blue  
        sin(nebula * 3.14159 + time * 0.5) * 0.5 + 0.5
      );
      
      // Add orange highlights
      nebulaColor = mix(nebulaColor, vec3(1.0, 0.6, 0.2), 
                       smoothstep(0.7, 1.0, nebula) * 0.5);
      
      // Final galaxy color
      vec3 galaxyColor = vec3(0.9, 0.9, 1.0) * galaxyIntensity;
      galaxyColor += nebulaColor * nebula * nebulaOpacity;
      
      // Apply color shift for variety
      galaxyColor *= colorShift;
      
      // Distance fade for realism
      float fade = 1.0 - smoothstep(300.0, 500.0, length(vWorldPosition));
      
      gl_FragColor = vec4(galaxyColor * fade, 
                         max(galaxyIntensity, nebula * nebulaOpacity) * fade);
    }
  `
};

/**
 * ShootingStarShader - Occasional shooting star effects
 */
export const ShootingStarShader = {
  uniforms: {
    time: { value: 0.0 },
    startTime: { value: 0.0 },
    duration: { value: 2.0 },
    startPosition: { value: new THREE.Vector3() },
    endPosition: { value: new THREE.Vector3() },
    intensity: { value: 1.0 },
    tailLength: { value: 0.1 }
  },

  vertexShader: `
    uniform float time;
    uniform float startTime;
    uniform float duration;
    uniform vec3 startPosition;
    uniform vec3 endPosition;
    
    varying float vProgress;
    varying float vAlpha;
    
    void main() {
      float elapsed = time - startTime;
      vProgress = clamp(elapsed / duration, 0.0, 1.0);
      
      // Fade in and out
      vAlpha = sin(vProgress * 3.14159);
      
      // Interpolate position along path
      vec3 currentPosition = mix(startPosition, endPosition, vProgress);
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(currentPosition, 1.0);
      gl_PointSize = 8.0 * vAlpha;
    }
  `,

  fragmentShader: `
    uniform float intensity;
    
    varying float vProgress;
    varying float vAlpha;
    
    void main() {
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);
      
      if (dist > 0.5) discard;
      
      float alpha = (1.0 - dist * 2.0) * vAlpha * intensity;
      vec3 color = vec3(1.0, 0.9, 0.7); // Warm shooting star color
      
      gl_FragColor = vec4(color, alpha);
    }
  `
};
