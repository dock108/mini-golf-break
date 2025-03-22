import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Ball {
    constructor(scene, physicsWorld, game) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.game = game; // Store reference to game for debug mode access
        
        // Ball properties
        this.radius = 0.2;
        this.segments = 32;
        this.mass = 0.5; // Lighter ball (500g instead of 1kg)
        
        // Add position property to fix the error
        this.position = new THREE.Vector3(0, this.radius + 0.1, 0);
        
        this.body = null;
        this.mesh = null;
        this.isBallActive = true;
        
        // Store current hole information
        this.currentHolePosition = null;
        this.currentHoleIndex = null;
        this.shotCount = 0;
        this.scoreForCurrentHole = 0;
        this.isMoving = false;
        this.hasBeenHit = false;
        
        // Create success material
        this.defaultMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFFFFF, // Pure white golf ball
            roughness: 0.3,
            metalness: 0.2,
            emissive: 0x333333, // Slight glow to be visible in space
            emissiveIntensity: 0.3
        });
        
        this.successMaterial = new THREE.MeshStandardMaterial({
            color: 0x00FF00, // Green for success
            roughness: 0.2,
            metalness: 0.3,
            emissive: 0x00FF00, // Strong green glow
            emissiveIntensity: 0.8 // Brighter glow for success
        });
        
        // Success animation properties
        this.successAnimationStartTime = 0;
        this.isSuccessAnimationActive = false;
        this.successParticles = null;
        this.particleVelocities = [];
        this.particleLife = [];
        
        // Sound effects
        this.sounds = {
            hit: null,
            roll: null,
            success: null
        };
        
        // Load sound effects
        this.loadSounds();
        
        // Create the visual mesh with dimples
        this.createMesh();
        
        // Create the physics body
        this.createBody();
        
        console.log("Ball created");
    }
    
    createMesh() {
        // Create golf ball with dimples
        this.createGolfBallWithDimples();
        
        // Set initial position
        this.mesh.position.copy(this.position);
        
        // Enable shadows
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add to scene
        if (this.scene) {
            this.scene.add(this.mesh);
        }
        
        // Add a small light to the ball to make it stand out
        this.ballLight = new THREE.PointLight(0xFFFFFF, 0.4, 3);
        this.ballLight.position.copy(this.position);
        if (this.scene) {
            this.scene.add(this.ballLight);
        }
        
        return this.mesh;
    }
    
    /**
     * Create a golf ball mesh with dimples
     */
    createGolfBallWithDimples() {
        // Create base sphere for the golf ball
        const baseGeometry = new THREE.SphereGeometry(this.radius, this.segments, this.segments);
        
        // Create the ball mesh
        this.mesh = new THREE.Mesh(baseGeometry, this.defaultMaterial);
        
        // Create dimples using displacement map
        const textureLoader = new THREE.TextureLoader();
        const createDimpleTexture = () => {
            // Create a canvas for the dimple texture
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const context = canvas.getContext('2d');
            
            // Fill with white
            context.fillStyle = 'white';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw dimples
            context.fillStyle = 'black';
            
            // Number of dimples and their size
            const numDimples = 120;
            const dimpleRadius = 8;
            
            // Draw randomly positioned dimples
            for (let i = 0; i < numDimples; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                
                context.beginPath();
                context.arc(x, y, dimpleRadius, 0, Math.PI * 2);
                context.fill();
            }
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
        };
        
        // Create and apply the dimple texture as a bump map
        const dimpleTexture = createDimpleTexture();
        this.defaultMaterial.bumpMap = dimpleTexture;
        this.defaultMaterial.bumpScale = 0.005; // Adjust dimple depth
        this.defaultMaterial.needsUpdate = true;
        
        // Apply the same texture to success material
        this.successMaterial.bumpMap = dimpleTexture;
        this.successMaterial.bumpScale = 0.005;
        this.successMaterial.needsUpdate = true;
    }
    
    createBody() {
        // Create physics body for the ball
        this.body = new CANNON.Body({
            mass: 0.45,
            position: new CANNON.Vec3(0, 0.5, 0),
            shape: new CANNON.Sphere(this.radius),
            material: this.physicsWorld.ballMaterial,
            sleepSpeedLimit: 0.15, // Increased further for even quicker stopping
            sleepTimeLimit: 0.2    // Reduced further to sleep sooner
        });
        
        // Set body damping (air resistance and friction)
        this.body.linearDamping = 0.6;  // Increased damping for final roll
        this.body.angularDamping = 0.6; // Matched with linear damping
        
        // Set collision groups for the ball
        this.body.collisionFilterGroup = 4;
        this.body.collisionFilterMask = 1 | 2;
        
        // Add body to physics world
        this.physicsWorld.addBody(this.body);
        
        // Explicitly set velocity to zero and put the body to sleep initially
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.body.sleep();
        
        if (this.game && this.game.debugMode) {
            console.log("Ball physics body created");
        }
    }
    
    onCollide(event) {
        // Handle collision events
        if (!event.body) return;
        
        // Check if we collided with a bumper obstacle
        if (event.body.material && event.body.material.name === 'bumper') {
            // Play sound or visual effect for bumper hit
            if (this.game && this.game.debugMode) {
                console.log("Ball hit obstacle bumper!");
            }
            
            // Ensure the ball stays awake after a collision
            this.body.wakeUp();
        }
        
        // Check if the ball collided with a hole
        if (event.body.userData && event.body.userData.type === 'hole') {
            // Log the collision for debugging
            if (this.game && this.game.debugMode) {
                console.log("Ball collided with hole!");
            }
            
            // The actual hole completion will be handled in the Game class by the isInHole method
        }
    }
    
    update() {
        // Update mesh position from physics body
        if (this.body && this.mesh) {
            const pos = this.body.position;
            this.mesh.position.set(pos.x, pos.y, pos.z);
            
            // Update ball light position to follow the ball
            if (this.ballLight) {
                this.ballLight.position.set(pos.x, pos.y, pos.z);
            }
            
            // Check if the ball is moving
            const velocity = this.body.velocity;
            const speed = velocity.length();
            this.isMoving = speed > 0.1;
            
            // Update position property to match
            this.position.set(pos.x, pos.y, pos.z);
            
            // Check if the body is falling too fast (failsafe)
            if (this.isMoving && velocity.y < -20) {
                console.log("Ball falling too fast, resetting velocity");
                this.body.velocity.set(velocity.x * 0.5, 0, velocity.z * 0.5);
            }
            
            // Debugging - log when ball moves very fast
            if (this.game && this.game.debugMode && speed > 5) {
                console.log(`Ball moving fast: ${speed.toFixed(2)} m/s, vel: (${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)}, ${velocity.z.toFixed(2)})`);
            }
        }
        
        // Update success animation if active
        if (this.isSuccessAnimationActive) {
            this.updateSuccessEffects();
        }
    }
    
    setPosition(x, y, z) {
        // Make sure y is at least ball radius + small buffer to avoid ground penetration
        const safeY = Math.max(y, this.radius + 0.05);
        
        // Set mesh position
        if (this.mesh) {
            this.mesh.position.set(x, safeY, z);
        }
        
        // Set body position
        if (this.body) {
            // Position the ball at the safe height
            this.body.position.set(x, safeY, z);
            
            // Reset velocity and forces when repositioning
            this.resetVelocity();
            
            // Make sure the body is awake after repositioning
            this.body.wakeUp();
            
            console.log(`Ball position set to (${x}, ${safeY}, ${z})`);
        }
    }
    
    resetVelocity() {
        if (this.body) {
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
            this.body.force.set(0, 0, 0);
            this.body.torque.set(0, 0, 0);
            
            // Explicitly wake up the body to ensure physics are applied
            this.body.wakeUp();
        }
    }
    
    isStopped() {
        if (!this.body) return true;
        
        // Get current linear and angular velocity
        const velocity = this.body.velocity;
        const angularVelocity = this.body.angularVelocity;
        
        // More aggressive thresholds for the final roll
        const speedThreshold = 0.15;    // Increased to match sleepSpeedLimit
        const rotationThreshold = 0.15;  // Increased to match
        
        // Add additional check for very slow movement
        const isVerySlowMovement = (
            Math.abs(velocity.x) < speedThreshold * 0.5 &&
            Math.abs(velocity.z) < speedThreshold * 0.5
        );
        
        const isStopped = (
            Math.abs(velocity.x) < speedThreshold &&
            Math.abs(velocity.y) < speedThreshold &&
            Math.abs(velocity.z) < speedThreshold &&
            Math.abs(angularVelocity.x) < rotationThreshold &&
            Math.abs(angularVelocity.y) < rotationThreshold &&
            Math.abs(angularVelocity.z) < rotationThreshold
        );
        
        // If very slow or stopped, actively kill motion
        if (isStopped || isVerySlowMovement) {
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
            
            // Apply additional damping for very slow movement
            if (isVerySlowMovement && !isStopped) {
                this.body.linearDamping = 0.9; // Temporary high damping
            } else {
                this.body.linearDamping = 0.6; // Reset to normal damping
                this.body.sleep();
            }
        }
        
        return isStopped;
    }
    
    applyForce(direction, power) {
        if (!this.body) return;
        
        // Scale power for reasonable force (reduced multiplier)
        const forceMagnitude = power * 15; // Reduced from 20 to 15 for better control
        
        // Apply horizontal force only
        const force = new CANNON.Vec3(
            direction.x * forceMagnitude,
            0,
            direction.z * forceMagnitude
        );
        
        // Apply force at the center of the ball
        this.body.applyImpulse(force);
        
        // Wake up the physics body
        this.body.wakeUp();
        
        console.log(`Applying force: Direction: (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)}), Power: ${power.toFixed(2)}`);
    }
    
    reset() {
        this.resetVelocity();
        this.setPosition(0, this.radius + 0.1, 0);
    }
    
    dispose() {
        if (this.mesh) {
            if (this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
            
            if (this.mesh.geometry) {
                this.mesh.geometry.dispose();
            }
            
            if (this.mesh.material) {
                this.mesh.material.dispose();
            }
        }
        
        if (this.body && this.physicsWorld) {
            this.physicsWorld.removeBody(this.body);
        }
    }
    
    /**
     * Check if the ball is in a hole
     */
    isInHole() {
        // Check distance to hole position
        if (!this.currentHolePosition) return false;
        
        const ballPosition = new THREE.Vector3();
        this.mesh.getWorldPosition(ballPosition);
        
        const distanceToHole = ballPosition.distanceTo(this.currentHolePosition);
        const isNearHole = distanceToHole < 0.25; // Slightly smaller than hole radius for better detection
        
        // Also check if ball is at rest or nearly at rest
        const isAtRest = this.isStopped();
        
        return isNearHole && isAtRest;
    }
    
    /**
     * Handle when ball goes in hole
     */
    handleHoleSuccess() {
        // Play success sound
        this.playSound('success');
        
        console.log('Ball in hole!');
        
        // Change ball material to show success
        if (this.mesh) {
            this.mesh.material = this.successMaterial;
            
            // Create a pulsing effect for the ball
            this.successAnimationStartTime = Date.now();
            this.isSuccessAnimationActive = true;
            
            // Create particle burst effect
            this.createSuccessParticles();
            
            // Make ball light green to match success
            if (this.ballLight) {
                this.ballLight.color.set(0x00FF00);
                this.ballLight.intensity = 1.2;
                this.ballLight.distance = 6;
            }
        }
        
        // Emit event for game logic to handle
        if (this.onHoleComplete) {
            this.onHoleComplete(this.currentHoleIndex, this.shotCount);
        }
        
        // Freeze the ball in place
        if (this.body) {
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
        }
    }
    
    /**
     * Create particle effect when ball goes in hole
     */
    createSuccessParticles() {
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
            positions[i3] = this.mesh.position.x;
            positions[i3 + 1] = this.mesh.position.y;
            positions[i3 + 2] = this.mesh.position.z;
            
            // Random initial velocity directions stored in userData
            const angle = Math.random() * Math.PI * 2;
            const height = Math.random() * 0.5 + 0.5; // Upward bias
            const speed = Math.random() * 0.1 + 0.05;
            
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
        this.successParticles = new THREE.Points(particlesGeometry, particlesMaterial);
        
        // Store initial particle data for animation
        this.particleData = [];
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.particleData.push({
                velocity: new THREE.Vector3(
                    Math.cos(angle) * (Math.random() * 0.1 + 0.05),
                    Math.random() * 0.1 + 0.08, // Upward bias
                    Math.sin(angle) * (Math.random() * 0.1 + 0.05)
                ),
                life: 1.0 // Full life to start
            });
        }
        
        // Add to scene
        if (this.scene) {
            this.scene.add(this.successParticles);
        }
    }
    
    /**
     * Update success animations if active
     */
    updateSuccessEffects() {
        if (!this.isSuccessAnimationActive) return;
        
        // Update pulsing effect on ball
        const elapsed = (Date.now() - this.successAnimationStartTime) / 1000;
        const pulseFactor = 0.5 + Math.sin(elapsed * 5) * 0.5; // Oscillate between 0 and 1
        
        // Pulse the ball's emissive intensity
        if (this.mesh && this.mesh.material === this.successMaterial) {
            this.mesh.material.emissiveIntensity = 0.8 + pulseFactor * 0.4; // Oscillate between 0.8 and 1.2
            this.mesh.material.needsUpdate = true;
            
            // Pulse the ball size slightly
            const scale = 1.0 + pulseFactor * 0.15;
            this.mesh.scale.set(scale, scale, scale);
        }
        
        // Update particle effects
        if (this.successParticles && this.particleData) {
            const positions = this.successParticles.geometry.attributes.position.array;
            const colors = this.successParticles.geometry.attributes.color.array;
            const sizes = this.successParticles.geometry.attributes.size.array;
            
            let allParticlesDead = true;
            
            for (let i = 0; i < this.particleData.length; i++) {
                const i3 = i * 3;
                const particle = this.particleData[i];
                
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
            this.successParticles.geometry.attributes.position.needsUpdate = true;
            this.successParticles.geometry.attributes.color.needsUpdate = true;
            this.successParticles.geometry.attributes.size.needsUpdate = true;
            
            // Remove particles if all are dead
            if (allParticlesDead && elapsed > 3) {
                this.isSuccessAnimationActive = false;
                if (this.successParticles.parent) {
                    this.successParticles.parent.remove(this.successParticles);
                }
                this.successParticles.geometry.dispose();
                this.successParticles.material.dispose();
                this.successParticles = null;
                this.particleData = null;
            }
        }
    }
    
    /**
     * Load sound effects
     */
    loadSounds() {
        // Create audio listener if it doesn't exist
        if (!this.scene.audioListener) {
            this.scene.audioListener = new THREE.AudioListener();
            // Add listener to camera if available
            if (this.game && this.game.camera) {
                this.game.camera.add(this.scene.audioListener);
            }
        }
        
        // Create hit sound
        this.sounds.hit = new THREE.Audio(this.scene.audioListener);
        this.sounds.hit.setVolume(0.5);
        
        // Create roll sound
        this.sounds.roll = new THREE.Audio(this.scene.audioListener);
        this.sounds.roll.setVolume(0.3);
        
        // Create success sound
        this.sounds.success = new THREE.Audio(this.scene.audioListener);
        this.sounds.success.setVolume(0.7);
        
        // Load sound files
        const audioLoader = new THREE.AudioLoader();
        
        // Use simple tones since we don't have actual audio files loaded
        this.createHitSound();
        this.createSuccessSound();
    }
    
    /**
     * Create a simple hit sound using oscillator
     */
    createHitSound() {
        if (!this.sounds.hit || !this.sounds.hit.context) return;
        
        // Create oscillator for hit sound
        const oscillator = this.sounds.hit.context.createOscillator();
        const gain = this.sounds.hit.context.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(220, this.sounds.hit.context.currentTime);
        
        gain.gain.setValueAtTime(0, this.sounds.hit.context.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, this.sounds.hit.context.currentTime + 0.01);
        gain.gain.linearRampToValueAtTime(0, this.sounds.hit.context.currentTime + 0.3);
        
        oscillator.connect(gain);
        
        // Store oscillator and gain for hit sound
        this.sounds.hit.oscillator = oscillator;
        this.sounds.hit.gain = gain;
    }
    
    /**
     * Create a simple success sound using oscillator
     */
    createSuccessSound() {
        if (!this.sounds.success || !this.sounds.success.context) return;
        
        // Create oscillator for success sound
        const oscillator = this.sounds.success.context.createOscillator();
        const gain = this.sounds.success.context.createGain();
        
        oscillator.type = 'sine';
        
        // Rising tone for success
        oscillator.frequency.setValueAtTime(440, this.sounds.success.context.currentTime);
        oscillator.frequency.linearRampToValueAtTime(880, this.sounds.success.context.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0, this.sounds.success.context.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, this.sounds.success.context.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, this.sounds.success.context.currentTime + 0.5);
        
        oscillator.connect(gain);
        
        // Store oscillator and gain for success sound
        this.sounds.success.oscillator = oscillator;
        this.sounds.success.gain = gain;
    }
    
    /**
     * Play a sound effect
     * @param {string} soundName - Name of the sound to play ('hit', 'roll', 'success')
     * @param {number} volume - Optional volume (0.0 to 1.0)
     */
    playSound(soundName, volume = 1.0) {
        if (!this.sounds || !this.sounds[soundName]) {
            console.warn(`Sound '${soundName}' not found`);
            return;
        }
        
        const sound = this.sounds[soundName];
        
        // Handle different sound types
        switch (soundName) {
            case 'hit':
                this.playHitSound(volume);
                break;
                
            case 'success':
                this.playSuccessSound(volume);
                break;
                
            default:
                // Just log a warning for unimplemented sounds
                console.warn(`Sound type '${soundName}' not implemented`);
        }
    }
    
    /**
     * Play the hit sound
     */
    playHitSound(volume = 1.0) {
        if (!this.sounds.hit || !this.sounds.hit.context) return;
        
        // Create new oscillator each time for hit sound
        const oscillator = this.sounds.hit.context.createOscillator();
        const gain = this.sounds.hit.context.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(220, this.sounds.hit.context.currentTime);
        
        gain.gain.setValueAtTime(0, this.sounds.hit.context.currentTime);
        gain.gain.linearRampToValueAtTime(0.3 * volume, this.sounds.hit.context.currentTime + 0.01);
        gain.gain.linearRampToValueAtTime(0, this.sounds.hit.context.currentTime + 0.3);
        
        oscillator.connect(gain);
        gain.connect(this.sounds.hit.context.destination);
        
        oscillator.start();
        oscillator.stop(this.sounds.hit.context.currentTime + 0.3);
    }
    
    /**
     * Play the success sound
     */
    playSuccessSound(volume = 1.0) {
        if (!this.sounds.success || !this.sounds.success.context) return;
        
        // Create new oscillator each time for success sound
        const oscillator = this.sounds.success.context.createOscillator();
        const gain = this.sounds.success.context.createGain();
        
        oscillator.type = 'sine';
        
        // Rising tone for success
        oscillator.frequency.setValueAtTime(440, this.sounds.success.context.currentTime);
        oscillator.frequency.linearRampToValueAtTime(880, this.sounds.success.context.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0, this.sounds.success.context.currentTime);
        gain.gain.linearRampToValueAtTime(0.4 * volume, this.sounds.success.context.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, this.sounds.success.context.currentTime + 0.5);
        
        oscillator.connect(gain);
        gain.connect(this.sounds.success.context.destination);
        
        oscillator.start();
        oscillator.stop(this.sounds.success.context.currentTime + 0.5);
    }
} 