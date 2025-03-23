import * as THREE from 'three';

/**
 * VisualEffectsManager - Handles special visual effects in the game
 * Extracts visual effects from game objects to improve modularity
 */
export class VisualEffectsManager {
    constructor(game) {
        // Reference to the main game
        this.game = game;
        
        // Track active effects
        this.activeEffects = {
            successParticles: null
        };
        
        // Effect parameters
        this.successEffectParams = {
            animationActive: false,
            startTime: 0,
            particleData: []
        };
    }
    
    /**
     * Initialize the visual effects manager
     */
    init() {
        // No specific initialization needed at this time,
        // but included for consistency with other managers
        return this;
    }
    
    /**
     * Play ball success effect when the ball goes in the hole
     * @param {THREE.Vector3} position - Position to play the effect
     * @param {Object} ball - Reference to the ball object for visual updates
     */
    playBallSuccessEffect(position, ball) {
        // Don't start another effect if one is already playing
        if (this.successEffectParams.animationActive) return;
        
        // Apply success material to ball if available
        if (ball && ball.mesh && ball.successMaterial) {
            ball.mesh.material = ball.successMaterial;
        }
        
        // Create success particle effect
        this.createSuccessParticles(position);
        
        // Mark animation as active
        this.successEffectParams.animationActive = true;
        this.successEffectParams.startTime = Date.now();
    }
    
    /**
     * Create particle effect when ball goes in hole
     * @param {THREE.Vector3} position - Position to create particles
     */
    createSuccessParticles(position) {
        // Number of particles
        const particleCount = 40;
        
        // Create particle geometry
        const particlesGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        // Set up particles with random positions
        for (let i = 0; i < particleCount; i++) {
            // Start all particles at ball position
            const i3 = i * 3;
            positions[i3] = position.x;
            positions[i3 + 1] = position.y;
            positions[i3 + 2] = position.z;
            
            // Random colors (green to yellow)
            colors[i3] = Math.random() * 0.5 + 0.5; // R (0.5-1.0)
            colors[i3 + 1] = 1.0;                  // G (1.0)
            colors[i3 + 2] = Math.random() * 0.3;   // B (0-0.3)
            
            // Random sizes
            sizes[i] = Math.random() * 0.03 + 0.02;
        }
        
        // Set attributes
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Create material
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.05,
            transparent: true,
            opacity: 0.8,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        // Create the particle system
        this.activeEffects.successParticles = new THREE.Points(particlesGeometry, particlesMaterial);
        
        // Store initial particle data for animation
        this.successEffectParams.particleData = [];
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.successEffectParams.particleData.push({
                velocity: new THREE.Vector3(
                    Math.cos(angle) * (Math.random() * 0.1 + 0.05),
                    Math.random() * 0.1 + 0.08, // Upward bias
                    Math.sin(angle) * (Math.random() * 0.1 + 0.05)
                ),
                life: 1.0 // Full life to start
            });
        }
        
        // Add to scene
        if (this.game && this.game.scene) {
            this.game.scene.add(this.activeEffects.successParticles);
        }
    }
    
    /**
     * Update all active visual effects
     * @param {Object} ball - Reference to the ball for visual updates
     */
    update(ball) {
        // Update success effect if active
        if (this.successEffectParams.animationActive) {
            this.updateSuccessEffects(ball);
        }
    }
    
    /**
     * Update success animations if active
     * @param {Object} ball - Reference to the ball for visual updates
     */
    updateSuccessEffects(ball) {
        if (!this.successEffectParams.animationActive) return;
        
        // Update pulsing effect on ball if available
        const elapsed = (Date.now() - this.successEffectParams.startTime) / 1000;
        const pulseFactor = 0.5 + Math.sin(elapsed * 5) * 0.5; // Oscillate between 0 and 1
        
        // Pulse the ball's emissive intensity if it's using success material
        if (ball && ball.mesh && ball.mesh.material === ball.successMaterial) {
            ball.mesh.material.emissiveIntensity = 0.8 + pulseFactor * 0.4; // Oscillate between 0.8 and 1.2
            ball.mesh.material.needsUpdate = true;
            
            // Pulse the ball size slightly
            const scale = 1.0 + pulseFactor * 0.15;
            ball.mesh.scale.set(scale, scale, scale);
        }
        
        // Update particle effects
        if (this.activeEffects.successParticles && this.successEffectParams.particleData) {
            const positions = this.activeEffects.successParticles.geometry.attributes.position.array;
            const colors = this.activeEffects.successParticles.geometry.attributes.color.array;
            const sizes = this.activeEffects.successParticles.geometry.attributes.size.array;
            
            let allParticlesDead = true;
            
            for (let i = 0; i < this.successEffectParams.particleData.length; i++) {
                const i3 = i * 3;
                const particle = this.successEffectParams.particleData[i];
                
                // Update position based on velocity
                positions[i3] += particle.velocity.x;
                positions[i3 + 1] += particle.velocity.y;
                positions[i3 + 2] += particle.velocity.z;
                
                // Apply gravity
                particle.velocity.y -= 0.01;
                
                // Update life
                particle.life -= 0.02;
                
                if (particle.life > 0) {
                    allParticlesDead = false;
                    
                    // Update color opacity based on life
                    colors[i3 + 0] = Math.min(1.0, colors[i3 + 0] + 0.01); // Gradually shift toward yellow
                    
                    // Update size based on life (fade out)
                    sizes[i] = particle.life * (Math.random() * 0.03 + 0.02);
                } else {
                    // Hide dead particles
                    positions[i3] = -1000;
                    positions[i3 + 1] = -1000;
                    positions[i3 + 2] = -1000;
                }
            }
            
            // Mark attributes for update
            this.activeEffects.successParticles.geometry.attributes.position.needsUpdate = true;
            this.activeEffects.successParticles.geometry.attributes.color.needsUpdate = true;
            this.activeEffects.successParticles.geometry.attributes.size.needsUpdate = true;
            
            // Remove particles if all are dead
            if (allParticlesDead && elapsed > 3) {
                this.successEffectParams.animationActive = false;
                if (this.activeEffects.successParticles.parent) {
                    this.activeEffects.successParticles.parent.remove(this.activeEffects.successParticles);
                }
                this.activeEffects.successParticles.geometry.dispose();
                this.activeEffects.successParticles.material.dispose();
                this.activeEffects.successParticles = null;
                this.successEffectParams.particleData = null;
            }
        }
    }
    
    /**
     * Reset ball visuals to default state
     * @param {Object} ball - The ball to reset
     */
    resetBallVisuals(ball) {
        if (ball && ball.mesh && ball.defaultMaterial) {
            ball.mesh.material = ball.defaultMaterial;
            ball.mesh.scale.set(1, 1, 1);
        }
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        // Clean up success particles
        if (this.activeEffects.successParticles) {
            if (this.activeEffects.successParticles.parent) {
                this.activeEffects.successParticles.parent.remove(this.activeEffects.successParticles);
            }
            this.activeEffects.successParticles.geometry.dispose();
            this.activeEffects.successParticles.material.dispose();
            this.activeEffects.successParticles = null;
        }
        
        this.successEffectParams.particleData = null;
        this.successEffectParams.animationActive = false;
    }
} 