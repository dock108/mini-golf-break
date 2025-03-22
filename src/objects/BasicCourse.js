import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Course } from './Course';

/**
 * BasicCourse - A 3-hole mini golf course for testing core gameplay mechanics
 * 
 * Holes:
 * 1. Simple straight path (validates basic putting mechanics)
 * 2. Includes basic stationary obstacles (sand traps, barriers)
 * 3. Features slight elevation/slope (validates realistic physics behaviors)
 */
export class BasicCourse extends Course {
    constructor(scene, physicsWorld) {
        super(scene, physicsWorld);
        this.length = 3; // Total number of holes in this course
        this.currentHoleObjects = []; // Track meshes for current hole
        this.currentHolePhysicsBodies = []; // Track physics bodies for current hole
    }
    
    /**
     * Override createCourse to build only the shared elements
     */
    createCourse() {
        // Create base ground
        this.createGround();
        
        // Create global elements
        this.createBoundaries();
        
        // Initialize hole start positions
        this.initializeHolePositions();
    }
    
    /**
     * Initialize all hole start positions without creating the geometry
     */
    initializeHolePositions() {
        // Store start positions for all holes - using consistent coordinates
        // Place each starting position 15 units away from hole along Z axis
        this.startPositions[0] = new THREE.Vector3(0, 0.2, 15); // Hole 1
        this.startPositions[1] = new THREE.Vector3(0, 0.2, 15); // Hole 2
        this.startPositions[2] = new THREE.Vector3(0, 0.2, 15); // Hole 3
        
        console.log("Initialized hole starting positions");
    }
    
    /**
     * Load a specific hole by number
     */
    loadHole(holeNumber) {
        // Clear any existing hole
        this.clearHole();
        
        console.log(`Loading hole ${holeNumber}`);
        
        // Check if valid hole
        if (holeNumber < 1 || holeNumber > 3) {
            console.error(`Invalid hole number: ${holeNumber}`);
            return false;
        }
        
        // Set current hole number
        this.currentHole = holeNumber;
        
        // For now, we only fully implement hole 1
        // Future holes will be added later
        this.createHole1();
        
        // If using GolfBall implementation, update the ball's target hole position
        if (this.game && this.game.ball) {
            const holePosition = this.getHolePosition(holeNumber);
            if (this.game.ball.currentHolePosition !== undefined) {
                this.game.ball.currentHolePosition = holePosition;
                this.game.ball.currentHoleIndex = holeNumber - 1; // Convert to 0-indexed
                console.log(`Set ball target hole position: (${holePosition.x.toFixed(2)}, ${holePosition.y.toFixed(2)}, ${holePosition.z.toFixed(2)})`);
            }
        }
        
        return true;
    }
    
    /**
     * Clear all objects and physics bodies for the current hole
     */
    clearHole() {
        // Remove meshes from scene
        this.currentHoleObjects.forEach(object => {
            if (object && this.scene) {
                this.scene.remove(object);
            }
        });
        
        // Remove physics bodies
        this.currentHolePhysicsBodies.forEach(body => {
            if (body && this.physicsWorld) {
                this.physicsWorld.removeBody(body);
            }
        });
        
        // Clear tracking arrays
        this.currentHoleObjects = [];
        this.currentHolePhysicsBodies = [];
        
        // Clear hole-specific collections from base class
        this.holes = [];
        this.holeBodies = [];
    }
    
    /**
     * Helper method to track objects and bodies for the current hole
     * @param {THREE.Object3D} object - Three.js object to track
     * @param {CANNON.Body} body - Cannon.js physics body to track (optional)
     */
    trackHoleObject(object, body = null) {
        if (object) {
            this.currentHoleObjects.push(object);
        }
        if (body) {
            this.currentHolePhysicsBodies.push(body);
        }
    }
    
    /**
     * Create the overall ground plane
     */
    createGround() {
        // Create a smaller ground that's still large enough for a hole with surroundings
        // Reducing from 100x100 to 50x50
        const groundGeometry = new THREE.PlaneGeometry(50, 50, 25, 25);
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
    
    /**
     * Create boundaries around the entire course
     */
    createBoundaries() {
        // Create boundary dimensions - reduced from 100 to match smaller ground
        const width = 50;
        const height = 1;
        const depth = 50;
        const thickness = 1;
        
        // Create boundary materials
        const boundaryMaterial = new THREE.MeshStandardMaterial({
            color: 0x6a381f, // Dark brown
            roughness: 0.9,
            metalness: 0.1
        });
        
        // Create boundaries
        const boundaries = [
            // North boundary
            { size: [width, height, thickness], position: [0, height/2, -depth/2], rotation: [0, 0, 0] },
            // South boundary
            { size: [width, height, thickness], position: [0, height/2, depth/2], rotation: [0, 0, 0] },
            // East boundary
            { size: [thickness, height, depth], position: [width/2, height/2, 0], rotation: [0, 0, 0] },
            // West boundary
            { size: [thickness, height, depth], position: [-width/2, height/2, 0], rotation: [0, 0, 0] }
        ];
        
        // Create each boundary
        boundaries.forEach(boundary => {
            // Create mesh
            const geometry = new THREE.BoxGeometry(...boundary.size);
            const mesh = new THREE.Mesh(geometry, boundaryMaterial);
            mesh.position.set(...boundary.position);
            mesh.rotation.set(...boundary.rotation);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.obstacles.push(mesh);
            
            // Create physics body
            if (this.physicsWorld) {
                const body = new CANNON.Body({
                    mass: 0,
                    position: new CANNON.Vec3(...boundary.position),
                    shape: new CANNON.Box(new CANNON.Vec3(boundary.size[0]/2, boundary.size[1]/2, boundary.size[2]/2)),
                    material: this.physicsWorld.bumperMaterial
                });
                
                // Apply rotation if needed
                if (boundary.rotation[0] !== 0 || boundary.rotation[1] !== 0 || boundary.rotation[2] !== 0) {
                    body.quaternion.setFromEuler(
                        boundary.rotation[0],
                        boundary.rotation[1],
                        boundary.rotation[2]
                    );
                }
                
                this.physicsWorld.addBody(body);
                this.obstacleBodies.push(body);
            }
        });
    }
    
    /**
     * Create Hole 1: Simple straight path to validate basic putting mechanics
     */
    createHole1() {
        // Position for hole 1 - centered at origin
        const holePosition = new THREE.Vector3(0, 0, 0);
        const startPosition = this.startPositions[0];
        
        // Create a visual path to the hole - use smaller width for better mini-golf feel
        const fairwayWidth = 3.5;
        const fairwayLength = 20; // Shorter length for a proper mini-golf hole
        const fairway = this.createFairway(startPosition, holePosition, fairwayWidth, fairwayLength);
        this.trackHoleObject(fairway);
        
        // Create a hole
        const hole = this.createHoleAt(holePosition.x, holePosition.y, holePosition.z);
        
        // Create a simple, clean and minimal enclosure around the hole
        this.createMinimalHoleEnclosure(holePosition, fairwayWidth, fairwayLength);
        
        // Create start marker
        const marker = this.createStartMarker(startPosition);
        this.trackHoleObject(marker);
    }
    
    /**
     * Create a minimal hole enclosure without unnecessary decorative elements
     */
    createMinimalHoleEnclosure(holePosition, width, length) {
        const wallHeight = 0.6;
        const wallThickness = 0.4;
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Saddle brown
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Calculate positions for walls
        const halfWidth = width / 2 + wallThickness / 2;
        const halfLength = length / 2;
        
        // Create only the essential boundary walls
        const walls = [
            // Left wall
            { 
                size: [wallThickness, wallHeight, length], 
                position: [holePosition.x - halfWidth, wallHeight/2, holePosition.z + halfLength] 
            },
            // Right wall
            { 
                size: [wallThickness, wallHeight, length], 
                position: [holePosition.x + halfWidth, wallHeight/2, holePosition.z + halfLength] 
            },
            // Back wall - behind the hole
            { 
                size: [width + wallThickness*2, wallHeight, wallThickness], 
                position: [holePosition.x, wallHeight/2, holePosition.z - 0.5] 
            }
            // No front wall to keep it clean and allow clear access to the tee area
        ];
        
        // Create each wall
        walls.forEach(wall => {
            // Create mesh
            const geometry = new THREE.BoxGeometry(...wall.size);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(...wall.position);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.obstacles.push(mesh);
            this.trackHoleObject(mesh);
            
            // Create physics body
            if (this.physicsWorld) {
                const body = new CANNON.Body({
                    mass: 0,
                    position: new CANNON.Vec3(...wall.position),
                    shape: new CANNON.Box(new CANNON.Vec3(wall.size[0]/2, wall.size[1]/2, wall.size[2]/2)),
                    material: this.physicsWorld.bumperMaterial
                });
                
                this.physicsWorld.addBody(body);
                this.obstacleBodies.push(body);
                this.trackHoleObject(null, body);
            }
        });
    }
    
    /**
     * Create Hole 2: Includes basic stationary obstacles (sand traps, barriers)
     */
    createHole2() {
        // Position for hole 2 - centered at origin
        const holePosition = new THREE.Vector3(0, 0, 0);
        const startPosition = this.startPositions[1];
        
        // Create a visual path to the hole
        const fairwayWidth = 4;
        const fairwayLength = 20;
        const fairway = this.createFairway(startPosition, holePosition, fairwayWidth, fairwayLength);
        this.trackHoleObject(fairway);
        
        // Create a hole
        const hole = this.createHoleAt(holePosition.x, holePosition.y, holePosition.z);
        
        // Sand trap before the hole
        const sandTrap = this.createSandTrap(0, 0, 5, 3, 1.5);
        this.trackHoleObject(sandTrap.mesh, sandTrap.body);
        
        // Barriers on the sides
        const barrier1 = this.createBarrier(-1.5, 0.4, 3, 0.6, 0.6, 1);
        const barrier2 = this.createBarrier(1.5, 0.4, 3, 0.6, 0.6, 1);
        this.trackHoleObject(barrier1.mesh, barrier1.body);
        this.trackHoleObject(barrier2.mesh, barrier2.body);
        
        // Decorative walls
        const walls = this.createDecorativeWalls(holePosition, fairwayWidth, fairwayLength);
        walls.forEach(wall => this.trackHoleObject(wall));
        
        // Create start marker
        const marker = this.createStartMarker(startPosition);
        this.trackHoleObject(marker);
    }
    
    /**
     * Create Hole 3: Features slight elevation/slope (validates realistic physics behaviors)
     */
    createHole3() {
        // Position for hole 3 - centered at origin
        const holePosition = new THREE.Vector3(0, 0, 0);
        const startPosition = this.startPositions[2];
        
        // Create a visual path to the hole
        const fairwayWidth = 3.5;
        const fairwayLength = 20;
        const fairway = this.createFairway(startPosition, holePosition, fairwayWidth, fairwayLength);
        this.trackHoleObject(fairway);
        
        // Create a hole
        const hole = this.createHoleAt(holePosition.x, holePosition.y, holePosition.z);
        
        // Create a sloped area leading to the hole
        const slope = this.createSlope(0, 3.5, 5, 5, 0.4);
        if (slope.mesh) this.trackHoleObject(slope.mesh, slope.body);
        
        // Decorative walls
        const walls = this.createDecorativeWalls(holePosition, fairwayWidth, fairwayLength);
        walls.forEach(wall => this.trackHoleObject(wall));
        
        // Create start marker
        const marker = this.createStartMarker(startPosition);
        this.trackHoleObject(marker);
    }
    
    /**
     * Create a hole at the specified position
     * Modified to track created objects and return the hole object
     */
    createHoleAt(x, y, z) {
        // Ball radius is 0.2, so hole radius should be about 0.35 (1.75 × ball size)
        const holeRadius = 0.35;
        const holeDepth = 0.3;
        const position = new THREE.Vector3(x, y, z);
        
        // Create a visible rim around the hole for better visibility
        const rimGeometry = new THREE.RingGeometry(holeRadius - 0.02, holeRadius + 0.05, 32);
        const rimMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222, // Darker for better visibility
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.x = -Math.PI / 2; // Lay flat
        rim.position.set(position.x, 0.005, position.z); // Slightly above ground
        this.scene.add(rim);
        this.trackHoleObject(rim);
        
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
        this.trackHoleObject(holeTop);
        
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
        this.trackHoleObject(hole);
        
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
            this.trackHoleObject(null, holeBody);
            
            // Add a flag in the center of the hole
            const flag = this.createHoleFlag(position);
            if (flag) this.trackHoleObject(flag);
        }
        
        return hole;
    }
    
    /**
     * Create a fairway (visual path between start and hole)
     */
    createFairway(startPos, endPos, width, length) {
        // Calculate direction vector between start and end
        const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();
        
        // Create fairway path material - darker, richer green for the putting surface
        const fairwayMaterial = new THREE.MeshStandardMaterial({
            color: 0x2E8B57, // Sea green for a proper putting green
            roughness: 0.6,
            metalness: 0.0
        });
        
        // Create a plane that follows the direction
        const fairwayGeometry = new THREE.PlaneGeometry(width, length);
        const fairway = new THREE.Mesh(fairwayGeometry, fairwayMaterial);
        
        // Position centered on the hole instead of at midpoint for better gameplay
        // Extend from the hole toward the tee position
        const adjustedPosition = new THREE.Vector3(
            endPos.x, 
            0.002, // Slightly above ground to prevent z-fighting
            endPos.z + length/2 - 0.5 // Extend from hole toward tee, adjust for hole position
        );
        fairway.position.copy(adjustedPosition);
        
        // Rotate to point from start to end
        const angle = Math.atan2(direction.x, direction.z);
        fairway.rotation.set(-Math.PI/2, 0, angle);
        
        // Add a subtle texture to the fairway
        const textureSize = 100;
        fairway.receiveShadow = true;
        
        // Add to scene
        this.scene.add(fairway);
        
        return fairway;
    }
    
    /**
     * Create decorative walls around a hole area
     */
    createDecorativeWalls(holePosition, width, length) {
        const wallHeight = 0.6; // Make walls slightly taller
        const wallThickness = 0.4; // Make walls slightly thicker
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Saddle brown
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Calculate positions for walls to properly enclose the fairway
        const halfWidth = width / 2 + wallThickness / 2;
        const halfLength = length / 2;
        
        // Create walls - fully enclosed with proper positioning
        const walls = [
            // Left wall - extend along entire length
            { 
                size: [wallThickness, wallHeight, length + wallThickness], 
                position: [holePosition.x - halfWidth, wallHeight/2, holePosition.z + halfLength/2] 
            },
            // Right wall - extend along entire length
            { 
                size: [wallThickness, wallHeight, length + wallThickness], 
                position: [holePosition.x + halfWidth, wallHeight/2, holePosition.z + halfLength/2] 
            },
            // Back wall - placed directly behind the hole
            { 
                size: [width + wallThickness*2, wallHeight, wallThickness], 
                position: [holePosition.x, wallHeight/2, holePosition.z - 0.5] 
            },
            // Front-left wall segment (with gap in middle for tee)
            { 
                size: [(width + wallThickness - 2) / 2, wallHeight, wallThickness], 
                position: [holePosition.x - (width + wallThickness) / 4 - 0.5, wallHeight/2, holePosition.z + length] 
            },
            // Front-right wall segment (with gap in middle for tee)
            { 
                size: [(width + wallThickness - 2) / 2, wallHeight, wallThickness], 
                position: [holePosition.x + (width + wallThickness) / 4 + 0.5, wallHeight/2, holePosition.z + length] 
            }
        ];
        
        // Create each wall
        const wallObjects = [];
        walls.forEach(wall => {
            // Create mesh
            const geometry = new THREE.BoxGeometry(...wall.size);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(...wall.position);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.obstacles.push(mesh);
            
            // Create physics body
            if (this.physicsWorld) {
                const body = new CANNON.Body({
                    mass: 0,
                    position: new CANNON.Vec3(...wall.position),
                    shape: new CANNON.Box(new CANNON.Vec3(wall.size[0]/2, wall.size[1]/2, wall.size[2]/2)),
                    material: this.physicsWorld.bumperMaterial
                });
                
                this.physicsWorld.addBody(body);
                this.obstacleBodies.push(body);
            }
            
            wallObjects.push(mesh);
        });
        
        return wallObjects;
    }
    
    /**
     * Create a sand trap obstacle
     */
    createSandTrap(x, y, z, width, depth) {
        // Create a sand trap material
        const sandMaterial = new THREE.MeshStandardMaterial({
            color: 0xE8C170, // Sand color
            roughness: 1.0,
            metalness: 0.0
        });
        
        // Create a slightly depressed area for the sand
        const sandGeometry = new THREE.BoxGeometry(width, 0.1, depth);
        const sand = new THREE.Mesh(sandGeometry, sandMaterial);
        sand.position.set(x, -0.05, z); // Slightly sunken
        this.scene.add(sand);
        
        // Create physics body with high friction
        if (this.physicsWorld) {
            const sandBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(x, -0.05, z),
                shape: new CANNON.Box(new CANNON.Vec3(width/2, 0.05, depth/2)),
                material: this.physicsWorld.sandMaterial
            });
            
            this.physicsWorld.addBody(sandBody);
            this.sandTrapBodies.push(sandBody);
            this.sandTraps.push(sand);
        }
        
        return { mesh: sand, body: sandBody };
    }
    
    /**
     * Create a barrier obstacle
     */
    createBarrier(x, y, z, width, height, depth) {
        // Create barrier material
        const barrierMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Saddle brown
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Create barrier mesh
        const barrierGeometry = new THREE.BoxGeometry(width, height, depth);
        const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
        barrier.position.set(x, y, z);
        barrier.castShadow = true;
        barrier.receiveShadow = true;
        this.scene.add(barrier);
        this.obstacles.push(barrier);
        
        // Create physics body
        if (this.physicsWorld) {
            const barrierBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(x, y, z),
                shape: new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2)),
                material: this.physicsWorld.bumperMaterial
            });
            
            this.physicsWorld.addBody(barrierBody);
            this.obstacleBodies.push(barrierBody);
        }
        
        return { mesh: barrier, body: barrierBody };
    }
    
    /**
     * Create a sloped section
     */
    createSlope(x, width, length, zStart, height) {
        // Create slope material
        const slopeMaterial = new THREE.MeshStandardMaterial({
            color: 0x3EB489, // Same as fairway
            roughness: 0.7,
            metalness: 0.0
        });
        
        // Create slope geometry
        const slopeGeometry = new THREE.PlaneGeometry(width, length, 20, 20);
        
        // Modify vertices to create slope
        const vertices = slopeGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const y = vertices[i+1]; // Y coordinate in the plane geometry
            
            // Linear gradient from 0 to height based on Y coordinate
            const normalizedY = (y + length/2) / length; // Normalize to 0-1
            vertices[i+2] = height * (1 - normalizedY); // Apply to Z coordinate
        }
        
        // Update normals for correct lighting
        slopeGeometry.computeVertexNormals();
        
        // Create slope mesh
        const slope = new THREE.Mesh(slopeGeometry, slopeMaterial);
        slope.rotation.x = -Math.PI / 2; // Rotate to horizontal
        slope.position.set(x, 0.01, zStart - length/2); // Position in front of hole
        this.scene.add(slope);
        
        // Create physics body for the slope
        if (this.physicsWorld) {
            // Use a heightfield shape for the slope
            const heightfieldData = [];
            const divisions = 20; // Match to geometry segments
            const sizeX = width;
            const sizeZ = length;
            
            // Create heightfield data from slope geometry
            for (let i = 0; i <= divisions; i++) {
                heightfieldData[i] = [];
                for (let j = 0; j <= divisions; j++) {
                    const normalizedJ = j / divisions;
                    heightfieldData[i][j] = height * (1 - normalizedJ);
                }
            }
            
            const heightfieldShape = new CANNON.Heightfield(heightfieldData, {
                elementSize: sizeX / divisions
            });
            
            const slopeBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(x - sizeX/2, 0, zStart - sizeZ),
                material: this.physicsWorld.groundMaterial
            });
            
            slopeBody.addShape(heightfieldShape, new CANNON.Vec3(sizeX/2, 0, sizeZ/2));
            slopeBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
            
            this.physicsWorld.addBody(slopeBody);
            this.obstacleBodies.push(slopeBody);
        }
        
        return { mesh: slope, body: slopeBody };
    }
    
    /**
     * Create a visual marker for the starting position
     */
    createStartMarker(position) {
        // Create a visible tee marker to show where to place the ball
        const teeBaseGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.05, 24);
        const teeBaseMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0077cc, // Blue color for visibility
            roughness: 0.5,
            metalness: 0.2
        });
        
        // Create the base (circular pad)
        const teeBase = new THREE.Mesh(teeBaseGeometry, teeBaseMaterial);
        teeBase.position.set(position.x, 0.03, position.z);
        teeBase.receiveShadow = true;
        teeBase.userData = { type: 'teeMarker', part: 'base' };
        this.scene.add(teeBase);
        
        // Create a white circle in the middle to indicate ball placement
        const teeDotGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 24);
        const teeDotMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, // White for ball placement
            roughness: 0.4,
            metalness: 0.3
        });
        
        const teeDot = new THREE.Mesh(teeDotGeometry, teeDotMaterial);
        teeDot.position.set(position.x, 0.04, position.z);
        teeDot.receiveShadow = true;
        teeDot.userData = { type: 'teeMarker', part: 'dot' };
        this.scene.add(teeDot);
        
        // Create a group to return both objects
        const teeGroup = new THREE.Group();
        teeGroup.add(teeBase);
        teeGroup.add(teeDot);
        teeGroup.userData = { type: 'teeMarker', part: 'group' };
        
        return teeGroup;
    }
    
    /**
     * Get the start position for a specific hole (1-indexed)
     */
    getHoleStartPosition(holeNumber) {
        // Convert 1-indexed hole number to 0-indexed array index
        const index = holeNumber - 1;
        if (index >= 0 && index < this.startPositions.length) {
            return this.startPositions[index];
        }
        
        // Default position if hole not found
        return new THREE.Vector3(0, 0.2, 15);
    }
    
    /**
     * Get the actual hole position for a specific hole (1-indexed)
     */
    getHolePosition(holeNumber) {
        // All holes are at the origin in our new layout
        return new THREE.Vector3(0, 0, 0);
    }
} 