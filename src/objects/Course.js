import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Course {
    constructor(scene, physicsWorld) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        
        // Course properties
        this.courseDimensions = {
            width: 40,
            length: 40
        };
        
        // Store course objects
        this.ground = null;
        this.groundBody = null;
        
        this.holes = [];
        this.holeBodies = [];
        
        this.obstacles = [];
        this.obstacleBodies = [];
        
        this.sandTraps = [];
        this.sandTrapBodies = [];
        
        this.waterHazards = [];
        this.waterHazardBodies = [];
        
        this.startPositions = [];
        
        // Generate the course
        this.createCourse();
    }
    
    createCourse() {
        this.createGround();
        this.createHoles();
        this.createObstacles();
        this.createSandTraps();
        this.createWaterHazards();
        this.createStartPositions();
    }
    
    createGround() {
        // Create the base ground mesh
        const groundGeometry = new THREE.PlaneGeometry(
            this.courseDimensions.width, 
            this.courseDimensions.length,
            32, 32
        );
        
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2e8b57, // Sea green
            roughness: 0.8,
            metalness: 0.0,
            flatShading: false
        });
        
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2; // Rotate to be flat on the ground
        this.ground.receiveShadow = true;
        
        if (this.scene) {
            this.scene.add(this.ground);
        }
        
        // Create ground physics body
        if (this.physicsWorld) {
            this.groundBody = this.physicsWorld.createGroundBody(this.physicsWorld.groundMaterial);
            this.physicsWorld.addBody(this.groundBody);
        }
    }
    
    createHoles() {
        // Create 4 holes on the course
        const holePositions = [
            new THREE.Vector3(-12, 0, -12),
            new THREE.Vector3(12, 0, -12),
            new THREE.Vector3(-12, 0, 12),
            new THREE.Vector3(12, 0, 12)
        ];
        
        // Ball radius is 0.2, so hole radius should be about 0.35 (1.75 × ball size)
        const holeRadius = 0.35;
        const holeDepth = 0.3;
        
        holePositions.forEach(position => {
            // Create a visible rim around the hole for better visibility
            const rimGeometry = new THREE.RingGeometry(holeRadius - 0.02, holeRadius + 0.05, 32);
            const rimMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x111111,
                roughness: 0.8,
                metalness: 0.2,
                side: THREE.DoubleSide
            });
            const rim = new THREE.Mesh(rimGeometry, rimMaterial);
            rim.rotation.x = -Math.PI / 2; // Lay flat
            rim.position.set(position.x, 0.005, position.z); // Slightly above ground
            this.scene.add(rim);
            
            // Create a dark circular area to represent the hole opening
            const holeTopGeometry = new THREE.CircleGeometry(holeRadius - 0.02, 32);
            const holeTopMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x000000,
                roughness: 1.0,
                metalness: 0.0,
                side: THREE.DoubleSide
            });
            const holeTop = new THREE.Mesh(holeTopGeometry, holeTopMaterial);
            holeTop.rotation.x = -Math.PI / 2; // Lay flat
            holeTop.position.set(position.x, 0.003, position.z); // Just above ground to prevent z-fighting
            this.scene.add(holeTop);
            
            // Create hole mesh - make it darker and deeper
            const holeGeometry = new THREE.CylinderGeometry(holeRadius, holeRadius, holeDepth, 32);
            const holeMaterial = new THREE.MeshStandardMaterial({
                color: 0x000000,
                roughness: 1.0,
                metalness: 0.0,
                side: THREE.DoubleSide,
                depthWrite: true
            });
            
            const hole = new THREE.Mesh(holeGeometry, holeMaterial);
            
            // Position hole
            hole.position.set(position.x, -holeDepth/2, position.z);
            
            this.holes.push(hole);
            
            if (this.scene) {
                this.scene.add(hole);
            }
            
            // Create hole physics body for collision detection
            if (this.physicsWorld) {
                const holeBody = new CANNON.Body({
                    mass: 0,
                    position: new CANNON.Vec3(position.x, 0.001, position.z), // At ground level to detect ball
                    collisionResponse: false, // Don't affect ball motion
                    isTrigger: true, // Acts as a trigger
                    material: this.physicsWorld.defaultMaterial
                });
                
                // Add a cylinder shape with slightly larger radius for better detection
                const holeShape = new CANNON.Cylinder(holeRadius * 1.1, holeRadius * 1.1, 0.1, 16);
                holeBody.addShape(holeShape);
                
                // Make holes only trigger the ball and not affect its motion
                holeBody.collisionFilterGroup = 2; // Assign to group 2
                holeBody.collisionFilterMask = 4;  // Only collide with the ball (group 4)
                
                // Tag the body as a hole for easy identification
                holeBody.userData = { type: 'hole' };
                
                this.holeBodies.push(holeBody);
                this.physicsWorld.addBody(holeBody);
                
                // Add a flag in the center of the hole
                this.createHoleFlag(position);
            }
        });
    }
    
    createHoleFlag(position) {
        // Create a nicer looking flag
        
        // Flag pole
        const poleGeometry = new THREE.CylinderGeometry(0.015, 0.015, 2, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xD3D3D3,  // Light gray
            roughness: 0.5,
            metalness: 0.5
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        
        // Position the pole at the center of the hole
        pole.position.set(position.x, position.y + 1, position.z);
        
        // Create a slightly more realistic flag with ripple effect
        const flagWidth = 0.6;
        const flagHeight = 0.4;
        const flagSegments = 10; // More segments for ripple effect
        
        const flagGeometry = new THREE.PlaneGeometry(flagWidth, flagHeight, flagSegments, 1);
        const flagMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFF0000, // Bright red
            side: THREE.DoubleSide,
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Add ripple effect to flag geometry vertices
        const vertices = flagGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            // Apply sine wave ripple effect along X axis
            vertices[i+2] = 0.05 * Math.sin(x * 5); // Z coordinate
        }
        
        const flag = new THREE.Mesh(flagGeometry, flagMaterial);
        
        // Position the flag at the top of the pole
        flag.position.set(flagWidth/2 - 0.05, 0.7, 0); // Centered on pole
        flag.rotation.y = Math.PI / 2;
        
        // Add pole to scene and add flag to pole
        this.scene.add(pole);
        pole.add(flag);
        
        // Store reference to animate later
        flag.userData = { 
            waveTime: 0,
            waveAmplitude: 0.05,
            waveFrequency: 2,
            flagSegments
        };
        
        // Store flag for animation updates
        if (!this.flags) this.flags = [];
        this.flags.push(flag);
    }
    
    createObstacles() {
        // Create some obstacles on the course
        const obstaclePositions = [
            { pos: new THREE.Vector3(0, 0.5, 0), size: new THREE.Vector3(1, 1, 1) },
            { pos: new THREE.Vector3(-6, 0.25, -6), size: new THREE.Vector3(2, 0.5, 0.5) },
            { pos: new THREE.Vector3(6, 0.25, 6), size: new THREE.Vector3(0.5, 0.5, 2) }
        ];
        
        obstaclePositions.forEach(({ pos, size }) => {
            // Create obstacle mesh
            const obstacleGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
            const obstacleMaterial = new THREE.MeshStandardMaterial({
                color: 0x8B4513, // Saddle brown
                roughness: 0.8,
                metalness: 0.1
            });
            
            const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
            obstacle.position.copy(pos);
            obstacle.castShadow = true;
            obstacle.receiveShadow = true;
            
            this.obstacles.push(obstacle);
            
            if (this.scene) {
                this.scene.add(obstacle);
            }
            
            // Create obstacle physics body
            if (this.physicsWorld) {
                const obstacleBody = this.physicsWorld.createBoxBody(
                    size,
                    pos,
                    this.physicsWorld.bumperMaterial, // Use the bumper material
                    0 // Static mass
                );
                
                // Add to physics world
                this.obstacleBodies.push(obstacleBody);
                this.physicsWorld.addBody(obstacleBody);
            }
        });
    }
    
    createSandTraps() {
        // Create sand traps (tan areas)
        const sandPositions = [
            { x: -12, z: 0, width: 5, depth: 5 },
            { x: 0, z: 12, width: 8, depth: 4 }
        ];
        
        const sandHeight = 0.01; // Very thin height to be nearly flush with the ground
        
        sandPositions.forEach(pos => {
            // Visual representation
            const sandGeometry = new THREE.BoxGeometry(pos.width, sandHeight, pos.depth);
            const sandMaterial = new THREE.MeshStandardMaterial({
                color: 0xE6C388, // Warmer sand color
                roughness: 1.0,
                metalness: 0.0
            });
            
            const sand = new THREE.Mesh(sandGeometry, sandMaterial);
            sand.position.set(pos.x, 0.001, pos.z); // Just above ground level to be visible
            
            this.sandTraps.push(sand);
            
            if (this.scene) {
                this.scene.add(sand);
            }
            
            // Physics body with extremely high friction
            if (this.physicsWorld) {
                const sandBody = this.physicsWorld.createBoxBody(
                    { x: pos.width, y: sandHeight, z: pos.depth },
                    { x: pos.x, y: 0.001, z: pos.z }, // Just above ground
                    this.physicsWorld.sandMaterial
                );
                
                // Add to physics world
                this.sandTrapBodies.push(sandBody);
                this.physicsWorld.addBody(sandBody);
            }
        });
    }
    
    createWaterHazards() {
        // Create water hazards (blue areas)
        const waterPositions = [
            { x: 0, z: -8, width: 5, depth: 3 },
            { x: 12, z: 0, width: 3, depth: 5 }
        ];
        
        const waterHeight = 0.01; // Very thin height to be nearly flush with the ground
        
        waterPositions.forEach(pos => {
            // Visual representation - slightly below ground level to avoid z-fighting
            const waterGeometry = new THREE.BoxGeometry(pos.width, waterHeight, pos.depth);
            const waterMaterial = new THREE.MeshStandardMaterial({
                color: 0x0077be,
                roughness: 0.1,
                metalness: 0.8,
                transparent: true,
                opacity: 0.8
            });
            
            const water = new THREE.Mesh(waterGeometry, waterMaterial);
            water.position.set(pos.x, -0.001, pos.z); // Just below ground level
            
            this.waterHazards.push(water);
            
            if (this.scene) {
                this.scene.add(water);
            }
            
            // Physics body as a trigger
            if (this.physicsWorld) {
                const waterBody = this.physicsWorld.createBoxBody(
                    { x: pos.width, y: waterHeight, z: pos.depth },
                    { x: pos.x, y: -0.001, z: pos.z }, // Just below ground
                    this.physicsWorld.waterMaterial
                );
                
                // Set as trigger (detects but doesn't block)
                waterBody.collisionResponse = false;
                waterBody.userData = { type: 'water' }; // Tag for identification
                
                // Add to physics world
                this.waterHazardBodies.push(waterBody);
                this.physicsWorld.addBody(waterBody);
            }
        });
    }
    
    createStartPositions() {
        // Create several possible starting positions for the ball
        this.startPositions = [
            new THREE.Vector3(-15, 0.2, 0),
            new THREE.Vector3(15, 0.2, 0),
            new THREE.Vector3(0, 0.2, -15),
            new THREE.Vector3(0, 0.2, 15),
            new THREE.Vector3(-10, 0.2, -10),
            new THREE.Vector3(10, 0.2, 10)
        ];
    }
    
    getRandomStartPosition() {
        if (this.startPositions.length === 0) {
            return new THREE.Vector3(0, 0.2, 0);
        }
        
        const randomIndex = Math.floor(Math.random() * this.startPositions.length);
        return this.startPositions[randomIndex].clone();
    }
    
    isInHole(position, ball) {
        // First, check using physics triggers (most reliable method)
        if (ball && ball.body) {
            for (let i = 0; i < this.holeBodies.length; i++) {
                const holeBody = this.holeBodies[i];
                
                // Check all active contacts for the ball
                const contacts = this.physicsWorld.world.contacts;
                for (let j = 0; j < contacts.length; j++) {
                    const contact = contacts[j];
                    
                    // Check if this contact involves the ball and a hole
                    const isBallAndHole = 
                        (contact.bi === ball.body && contact.bj === holeBody) ||
                        (contact.bi === holeBody && contact.bj === ball.body);
                    
                    if (isBallAndHole) {
                        // Get ball velocity
                        const speed = ball.body.velocity.length();
                        
                        // Only count if ball is slow enough
                        if (speed < 3) {
                            return true;
                        }
                    }
                }
            }
        }
        
        // Fallback to position-based detection if no physics contact found
        return this.isInHoleByPosition(position, ball);
    }
    
    // Position and speed-based detection as a fallback
    isInHoleByPosition(position, ball) {
        // Get speed if ball is provided
        let speed = 0;
        if (ball && ball.body) {
            speed = ball.body.velocity.length();
        }
        
        // Check each hole
        for (let i = 0; i < this.holes.length; i++) {
            const hole = this.holes[i];
            const holePos = hole.position;
            
            // Calculate distance (ignoring Y)
            const dx = position.x - holePos.x;
            const dz = position.z - holePos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Base hole radius - slightly smaller than visual radius
            const holeRadius = 0.3; // Adjusted for smaller hole
            
            // Check if the ball is near the hole
            if (distance < holeRadius && position.y < 0.2) {
                // If no ball provided or very slow, accept the hole
                if (!ball || speed < 0.5) {
                    return true;
                } 
                // For moderate speeds, use adjusted radius
                else if (speed < 3) {
                    const adjustedRadius = holeRadius * (1 - (speed - 0.5) / 2.5);
                    return distance < adjustedRadius;
                }
                // Too fast - would roll over the hole
                else {
                    return false;
                }
            }
        }
        
        return false;
    }
    
    isInWater(position) {
        // Check if the ball is in water hazard
        for (let i = 0; i < this.waterHazards.length; i++) {
            const water = this.waterHazards[i];
            const waterPos = water.position;
            const waterSize = new THREE.Vector3(
                water.geometry.parameters.width,
                water.geometry.parameters.height,
                water.geometry.parameters.depth
            );
            
            // Check if the ball is within the water hazard bounds
            if (
                position.x >= waterPos.x - waterSize.x / 2 &&
                position.x <= waterPos.x + waterSize.x / 2 &&
                position.z >= waterPos.z - waterSize.z / 2 &&
                position.z <= waterPos.z + waterSize.z / 2 &&
                Math.abs(position.y - waterPos.y) < 0.5 // Allow some vertical tolerance
            ) {
                return true;
            }
        }
        
        // Also check if the ball fell off the course
        if (
            position.x < -this.courseDimensions.width / 2 ||
            position.x > this.courseDimensions.width / 2 ||
            position.z < -this.courseDimensions.length / 2 ||
            position.z > this.courseDimensions.length / 2 ||
            position.y < -10 // Ball fell far below the course
        ) {
            return true;
        }
        
        return false;
    }
    
    update() {
        // Animate flags waving
        if (this.flags) {
            this.flags.forEach(flag => {
                if (flag && flag.userData) {
                    // Update wave time
                    flag.userData.waveTime += 0.01;
                    
                    // Apply more complex wave pattern
                    if (flag.geometry && flag.geometry.attributes && flag.geometry.attributes.position) {
                        const vertices = flag.geometry.attributes.position.array;
                        const amplitude = flag.userData.waveAmplitude;
                        const frequency = flag.userData.waveFrequency;
                        const time = flag.userData.waveTime;
                        
                        for (let i = 0; i < vertices.length; i += 3) {
                            const x = vertices[i];
                            
                            // Apply sine wave that moves through time
                            vertices[i+2] = amplitude * Math.sin(x * frequency + time);
                        }
                        
                        // Mark for update
                        flag.geometry.attributes.position.needsUpdate = true;
                    }
                    
                    // Apply slight rotation as well
                    const waveOffset = Math.sin(flag.userData.waveTime * 0.5) * 0.03;
                    flag.rotation.z = waveOffset;
                }
            });
        }
    }
    
    dispose() {
        // Dispose of all meshes and geometries
        if (this.ground) {
            if (this.ground.parent) {
                this.ground.parent.remove(this.ground);
            }
            if (this.ground.geometry) {
                this.ground.geometry.dispose();
            }
            if (this.ground.material) {
                this.ground.material.dispose();
            }
        }
        
        // Dispose of hole meshes
        this.holes.forEach(hole => {
            if (hole.parent) {
                hole.parent.remove(hole);
            }
            if (hole.geometry) {
                hole.geometry.dispose();
            }
            if (hole.material) {
                hole.material.dispose();
            }
        });
        
        // Dispose of obstacle meshes
        this.obstacles.forEach(obstacle => {
            if (obstacle.parent) {
                obstacle.parent.remove(obstacle);
            }
            if (obstacle.geometry) {
                obstacle.geometry.dispose();
            }
            if (obstacle.material) {
                obstacle.material.dispose();
            }
        });
        
        // Dispose of sand trap meshes
        this.sandTraps.forEach(sandTrap => {
            if (sandTrap.parent) {
                sandTrap.parent.remove(sandTrap);
            }
            if (sandTrap.geometry) {
                sandTrap.geometry.dispose();
            }
            if (sandTrap.material) {
                sandTrap.material.dispose();
            }
        });
        
        // Dispose of water hazard meshes
        this.waterHazards.forEach(waterHazard => {
            if (waterHazard.parent) {
                waterHazard.parent.remove(waterHazard);
            }
            if (waterHazard.geometry) {
                waterHazard.geometry.dispose();
            }
            if (waterHazard.material) {
                waterHazard.material.dispose();
            }
        });
        
        // Remove physics bodies
        if (this.physicsWorld) {
            if (this.groundBody) {
                this.physicsWorld.removeBody(this.groundBody);
            }
            
            this.holeBodies.forEach(body => {
                this.physicsWorld.removeBody(body);
            });
            
            this.obstacleBodies.forEach(body => {
                this.physicsWorld.removeBody(body);
            });
            
            this.sandTrapBodies.forEach(body => {
                this.physicsWorld.removeBody(body);
            });
            
            this.waterHazardBodies.forEach(body => {
                this.physicsWorld.removeBody(body);
            });
        }
    }
} 