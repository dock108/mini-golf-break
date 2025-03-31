import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CSG } from 'three-csg-ts';

/**
 * BaseElement - Base class for all course elements
 * Provides common functionality for creation, physics setup, and destruction
 */
export class BaseElement {
    constructor(world, config, scene) {
        this.world = world;        // CANNON.World instance
        this.config = config;      // Element configuration
        this.scene = scene;        // THREE.Scene instance
        
        this.meshes = [];         // Visual objects
        this.bodies = [];         // Physics bodies
        this.group = null;        // Main group container
        
        // Common properties
        this.id = config.id || `element_${Math.floor(Math.random() * 10000)}`;
        this.name = config.name || 'Unnamed Element';
        this.elementType = config.type || 'generic';
        this.position = config.position || new THREE.Vector3(0, 0, 0);
        
        console.log(`[BaseElement] Initializing ${this.elementType} (${this.name}):`, {
            id: this.id,
            position: this.position
        });
    }
    
    /**
     * Create the element - to be implemented by subclasses
     */
    create() {
        console.log(`[BaseElement] Creating ${this.elementType} (${this.name})`);
        
        // Create main element group
        this.group = new THREE.Group();
        this.group.position.copy(this.position);
        this.scene.add(this.group);
        this.meshes.push(this.group);
        
        // Subclasses should override this method to add specific components
        
        return true;
    }
    
    /**
     * Create visual components - to be implemented by subclasses
     */
    createVisuals() {
        // Subclasses should override this method
        console.log(`[BaseElement] Base createVisuals called for ${this.elementType}`);
        return true;
    }
    
    /**
     * Create physics components - to be implemented by subclasses
     */
    createPhysics() {
        // Subclasses should override this method
        console.log(`[BaseElement] Base createPhysics called for ${this.elementType}`);
        return true;
    }
    
    /**
     * Update the element - for any animations or state changes
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        // Default implementation does nothing
        // Subclasses can override to implement animations or state changes
    }
    
    /**
     * Clean up all resources
     */
    destroy() {
        console.log(`[BaseElement] Destroying ${this.elementType} (${this.name})`);
        
        // Remove meshes from scene
        this.meshes.forEach(mesh => {
            if (mesh.parent) {
                mesh.parent.remove(mesh);
            }
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(mat => mat.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        });
        
        // Remove physics bodies
        this.bodies.forEach(body => {
            if (body && body.shapes) {
                body.shapes.forEach(shape => body.removeShape(shape));
                this.world.removeBody(body);
            }
        });
        
        // Clear arrays
        this.meshes = [];
        this.bodies = [];
        
        console.log(`[BaseElement] Cleanup complete for ${this.elementType}`);
    }
} 

/**
 * HoleEntity - Encapsulates all resources and physics for a single hole
 * Now extends BaseElement
 */
export class HoleEntity extends BaseElement {
    constructor(world, config, scene) {
        // Add required defaults to config
        const holeConfig = {
            ...config,
            type: 'hole',
            name: config.name || `Hole ${config.index + 1}`,
            position: config.centerPosition || new THREE.Vector3(
                (config.startPosition.x + config.holePosition.x) / 2,
                0,
                (config.startPosition.z + config.holePosition.z) / 2
            )
        };
        
        // Call parent constructor
        super(world, holeConfig, scene);
        
        // Hole-specific properties
        this.holeTrigger = null;  // Hole trigger body
        this.width = Math.max(1, config.courseWidth || 4);
        this.length = Math.max(1, config.courseLength || 20);
        this.wallHeight = 1.0;
        this.wallThickness = 0.2;
        this.holeRadius = 0.35;
        this.surfaceHeight = 0.2;
        
        // Calculate center position if not provided
        this.centerPosition = this.position;
        
        console.log(`[HoleEntity] Initialized hole ${config.index + 1} with dimensions:`, {
            width: this.width,
            length: this.length,
            center: this.centerPosition,
            config: {
                start: config.startPosition,
                hole: config.holePosition,
                par: config.par
            }
        });
    }
    
    /**
     * Create all hole components
     * @override
     */
    create() {
        // Initialize the base class implementation
        super.create();
        
        console.log(`[HoleEntity] Creating hole components`);
        
        // --- Create Green using CSG --- 
        this.createCSGGreenSurface();
        
        // --- Create Metallic Rim around Hole --- 
        this.createHoleRim();
        
        // --- Create other components --- 
        this.createWalls();
        this.createHoleCup();
        this.createStartPosition();
        
        // --- Create Bunker Trigger Zones --- 
        this.createBunkerTriggers();
        
        // --- Create Bunker Visuals (Sand Texture) ---
        this.createBunkerVisuals();
        
        console.log(`[HoleEntity] Created hole with:`, {
            meshes: this.meshes.length,
            bodies: this.bodies.length,
        });
        
        return true;
    }
    
    /**
     * Create the green surface with cutouts using CSG
     */
    createCSGGreenSurface() {
        const greenMaterial = new THREE.MeshStandardMaterial({
            color: 0x2ecc71,
            roughness: 0.5,
            metalness: 0.1,
            side: THREE.DoubleSide // Important for CSG results
        });

        // 1. Create base green geometry using BoxGeometry (Reverted)
        const greenGeom = new THREE.BoxGeometry(
            this.width, 
            this.surfaceHeight, // Use surface height for box depth 
            this.length,
            10, // widthSegments
            1,  // heightSegments
            10  // depthSegments
            );
        // BoxGeometry is centered at origin, no rotation/translation needed here.

        let greenCSG = CSG.fromGeometry(greenGeom);

        // --- 2. Subtract Bunkers (using CSG shapes similar to Course.js) ---
        const bunkerConfigs = this.config.hazards?.filter(h => h.type === 'sand') || [];
        console.log(`[HoleEntity] Found ${bunkerConfigs.length} sand hazard configs for hole ${this.config.index}`);

        bunkerConfigs.forEach(bunkerConfig => {
            // Define the shape to subtract (e.g., shallow cylinder)
            // Use dimensions from bunkerConfig if available, otherwise default
            const radius = bunkerConfig.size?.x / 2 || 2; // Example default radius
            const depth = bunkerConfig.size?.y || 0.5;    // Example default depth

            console.log(`[HoleEntity] Creating bunker subtraction shape: radius=${radius}, depth=${depth}`);

            const bunkerGeometry = new THREE.CylinderGeometry(
                radius,         // radiusTop
                radius * 0.8,   // radiusBottom (tapered)
                depth,          // height (bunker depth)
                32              // radialSegments
            );

            // Calculate position relative to the green's center (origin for the CSG operation)
            const localBunkerPos = bunkerConfig.position.clone().sub(this.centerPosition);

            // Position the *center* of the subtraction cylinder
            // Top should be slightly above green surface (0 relative to BoxGeometry center)
            const bunkerMatrix = new THREE.Matrix4().makeTranslation(
                localBunkerPos.x,
                depth / 2 - 0.01 + (this.surfaceHeight / 2), // Adjust Y based on BoxGeometry center and surfaceHeight
                localBunkerPos.z
            );
            bunkerGeometry.applyMatrix4(bunkerMatrix);

            const bunkerCSG = CSG.fromGeometry(bunkerGeometry);

            // Subtract
            try {
                greenCSG = greenCSG.subtract(bunkerCSG);
                console.log(`[HoleEntity] Subtracted bunker shape at local pos: ${localBunkerPos.toArray().map(n => n.toFixed(2)).join(',')}`);
            } catch (error) {
                console.error("[HoleEntity] CSG Subtraction failed for bunker:", error);
                // Potentially log geometry details for debugging
            }
        });

        // 3. Subtract Hole
        const visualHoleRadius = 0.40;
        const holeSubtractorGeom = new THREE.CylinderGeometry(
            visualHoleRadius, 
            visualHoleRadius, 
            this.surfaceHeight * 1.1, // Adjust height relative to box height
            16
            );
        // No translation needed for subtractor if base box is centered at origin

        // Calculate position relative to the green's center (which is origin for the geometry)
        const localHolePos = this.config.holePosition.clone().sub(this.centerPosition);
        // Create transformation matrix
        const holeMatrix = new THREE.Matrix4().makeTranslation(localHolePos.x, 0, localHolePos.z);
        // Apply matrix to the geometry *before* creating CSG object
        holeSubtractorGeom.applyMatrix4(holeMatrix);
        // Create CSG object from transformed geometry
        const holeCSG = CSG.fromGeometry(holeSubtractorGeom);
        
        // Subtract
        greenCSG = greenCSG.subtract(holeCSG);
        console.log('[HoleEntity] Subtracted hole shape from green CSG');

        // 4. Convert final CSG back to Mesh
        const finalGreenMesh = CSG.toMesh(greenCSG, new THREE.Matrix4(), greenMaterial);
        // Position the final mesh correctly vertically (since BoxGeometry was centered at 0)
        finalGreenMesh.position.y = this.surfaceHeight / 2; 
        
        // --- Recalculate Normals --- 
        finalGreenMesh.geometry.computeVertexNormals(); 
        console.log('[HoleEntity] Recalculated vertex normals for final green mesh');
        // --- End Recalculate Normals ---

        // --- Log Geometry Details POST-CSG ---
        finalGreenMesh.geometry.computeBoundingBox(); // Ensure bounding box is up-to-date
        const postCsgVertexCount = finalGreenMesh.geometry.attributes.position.count;
        const postCsgIndexCount = finalGreenMesh.geometry.index?.count;
        const postCsgBBox = finalGreenMesh.geometry.boundingBox;
        console.log(`[HoleEntity] Post-CSG Geometry: Vertices=${postCsgVertexCount}, Indices=${postCsgIndexCount}`);
        if (postCsgBBox) {
            console.log(`[HoleEntity] Post-CSG BBox: Min=(${postCsgBBox.min.x.toFixed(2)}, ${postCsgBBox.min.y.toFixed(2)}, ${postCsgBBox.min.z.toFixed(2)}), Max=(${postCsgBBox.max.x.toFixed(2)}, ${postCsgBBox.max.y.toFixed(2)}, ${postCsgBBox.max.z.toFixed(2)})`);
        }
        // --- End Log Geometry Details ---

        finalGreenMesh.castShadow = true;
        finalGreenMesh.receiveShadow = true;
        this.group.add(finalGreenMesh);
        this.meshes.push(finalGreenMesh);
        console.log('[HoleEntity] Created final green mesh from CSG');

        // --- Physics Body using Trimesh from CSG result --- 
        const greenBody = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.STATIC,
            material: this.world.groundMaterial // Use ground material
        });

        // Convert THREE.BufferGeometry to Cannon-es format
        const geometry = finalGreenMesh.geometry; // Use geometry from Plane-based CSG
        if (!geometry.index) {
             console.error('[HoleEntity] FATAL: Green geometry is non-indexed. Cannot create Trimesh.');
             // We cannot proceed without indexed geometry for Trimesh
             // Optional: Add a fallback simple box physics here if needed for basic testing
             return; // Or throw an error
        }
        const vertices = geometry.attributes.position.array;
        const indices = geometry.index.array;
        console.log(`[HoleEntity] Geometry check: Vertices length=${vertices?.length}, Indices length=${indices?.length}`);

        // Create the Trimesh shape
        const trimeshShape = new CANNON.Trimesh(vertices, indices);
        greenBody.addShape(trimeshShape);
        console.log(`[HoleEntity] Added Trimesh shape to greenBody.`);
                
        // Position the physics body correctly to match the visual mesh world transform
        // The visual mesh origin is now likely at (0, 0, 0) relative to the group
        // The physics body origin should match this.
        const meshWorldPosition = new THREE.Vector3();
        finalGreenMesh.getWorldPosition(meshWorldPosition);
        // If the mesh position is (0,0,0) relative to group, body position should be group position
        // Let's use the mesh world position for safety
        greenBody.position.copy(meshWorldPosition); 
        greenBody.quaternion.copy(finalGreenMesh.getWorldQuaternion(new THREE.Quaternion())); 
        console.log(`[HoleEntity] Positioned Trimesh body at (${greenBody.position.x.toFixed(2)}, ${greenBody.position.y.toFixed(2)}, ${greenBody.position.z.toFixed(2)})`);

        greenBody.userData = { type: 'green', holeIndex: this.config.index };
        this.world.addBody(greenBody);
        this.bodies.push(greenBody);
        console.log('[HoleEntity] Created Trimesh green physics body');
    }
    
    /**
     * Create the metallic rim around the hole opening.
     */
    createHoleRim() {
        // Calculate position relative to the group's center
        const localHolePos = this.config.holePosition.clone().sub(this.centerPosition);
        const visualHoleRadius = 0.40; // Reduced slightly for clearance

        const rimGeometry = new THREE.RingGeometry(
            visualHoleRadius,        // Inner radius matches the smaller visual cutout
            visualHoleRadius + 0.04, // Outer radius - keep same thickness
            32
        );

        // Metallic Material
        const rimMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xCCCCCC, // Light silver/grey color
            roughness: 0.3,  // Smoother for metallic look
            metalness: 0.9,  // Much more metallic
            side: THREE.DoubleSide
        });

        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.x = -Math.PI / 2; // Lay flat
        // Position just above the *top* surface of the green
        const rimY = this.surfaceHeight + 0.001;
        rim.position.set(localHolePos.x, rimY, localHolePos.z);

        rim.receiveShadow = true; // Rim can receive shadows

        this.group.add(rim); // Add to the main group for this hole
        this.meshes.push(rim); // Track the mesh
        console.log('[HoleEntity] Created metallic hole rim mesh');
    }
    
    /**
     * Create course walls with physics
     */
    createWalls() {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xA0522D,
            roughness: 0.7,
            metalness: 0.3
        });
        
        const walls = [
            {
                size: [this.wallThickness, this.wallHeight, this.length],
                position: [-this.width/2, this.wallHeight/2, 0],
                type: 'wall_left'
            },
            {
                size: [this.wallThickness, this.wallHeight, this.length],
                position: [this.width/2, this.wallHeight/2, 0],
                type: 'wall_right'
            },
            {
                size: [this.width, this.wallHeight, this.wallThickness],
                position: [0, this.wallHeight/2, -this.length/2],
                type: 'wall_back'
            },
            {
                size: [this.width, this.wallHeight, this.wallThickness],
                position: [0, this.wallHeight/2, this.length/2],
                type: 'wall_front'
            }
        ];
        
        walls.forEach(wall => {
            // Create visual mesh
            const geometry = new THREE.BoxGeometry(...wall.size);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(...wall.position);
            this.group.add(mesh);
            this.meshes.push(mesh);
            
            // Create physics body
            const body = new CANNON.Body({
                mass: 0,
                type: CANNON.Body.STATIC,
                material: this.world.bumperMaterial // Corrected material
            });
            
            body.addShape(new CANNON.Box(new CANNON.Vec3(
                wall.size[0] / 2,
                wall.size[1] / 2,
                wall.size[2] / 2
            )));
            
            // Convert local position to world position
            const worldPos = new THREE.Vector3(...wall.position).add(this.centerPosition);
            body.position.copy(worldPos);
            
            body.userData = { type: wall.type, holeIndex: this.config.index };
            
            this.world.addBody(body);
            this.bodies.push(body);
            
            console.log(`[PhysicsWorld] Added body of type: ${wall.type}`);
        });
        
        console.log('[HoleEntity] Created walls');
    }
    
    /**
     * Create the physical hole cup body.
     */
    createHoleCup() {
        const holeCupDepth = 0.5; // How deep the physical cup goes
        const holePosition = this.config.holePosition;
        const cupRadius = 0.44; // Wider radius

        const holeCupBody = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.STATIC,
            material: this.world.holeCupMaterial 
        });

        const cupShape = new CANNON.Cylinder(cupRadius, cupRadius, holeCupDepth, 16);
        const shapeOffset = new CANNON.Vec3(0, -holeCupDepth / 2, 0); 
        holeCupBody.addShape(cupShape, shapeOffset);

        // Position the body's center Y far BELOW the green surface level (COMICALLY LOW FOR DEBUG)
        const cupCenterY = -1.0; // Lowered drastically
        holeCupBody.position.set(holePosition.x, cupCenterY, holePosition.z); 

        holeCupBody.userData = { type: 'holeCup', holeIndex: this.config.index };
        this.world.addBody(holeCupBody);
        this.bodies.push(holeCupBody);
        console.log(`[HoleEntity] Created physical hole cup body`);
        console.log(`[HoleEntity] holeCupBody details: Pos=(${holeCupBody.position.x.toFixed(2)}, ${holeCupBody.position.y.toFixed(2)}, ${holeCupBody.position.z.toFixed(2)}), MaterialID=${holeCupBody.material?.id}, MaterialName=${holeCupBody.material?.name}`);
    }
    
    /**
     * Create start position marker
     */
    createStartPosition() {
        // Create visual marker (similar to existing code)
        const teeGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.05, 24);
        const teeMaterial = new THREE.MeshStandardMaterial({
            color: 0x0077cc,
            roughness: 0.5,
            metalness: 0.2
        });
        
        const teeMesh = new THREE.Mesh(teeGeometry, teeMaterial);
        const localStartPos = this.config.startPosition.clone().sub(this.centerPosition);
        teeMesh.position.copy(localStartPos);
        teeMesh.position.y = this.surfaceHeight + 0.03;
        
        this.group.add(teeMesh);
        this.meshes.push(teeMesh);
        
        console.log('[HoleEntity] Created start position marker');
    }
    
    /**
     * Create physics trigger bodies for bunker zones based on config.
     */
    createBunkerTriggers() {
        const bunkerConfigs = this.config.hazards?.filter(h => h.type === 'sand') || [];
        console.log(`[HoleEntity] Creating ${bunkerConfigs.length} bunker trigger zones.`);

        bunkerConfigs.forEach(bunkerConfig => {
            if (!this.world) return; // Safety check

            // Use dimensions from config, providing defaults
            const radius = bunkerConfig.size?.x / 2 || 2;
            const depth = bunkerConfig.size?.y || 0.5;

            // Use a simple Box shape for the trigger volume
            const triggerSize = new CANNON.Vec3(radius * 1.1, depth, radius * 1.1); // Slightly larger overlap
            const triggerShape = new CANNON.Box(triggerSize.scale(0.5)); // CANNON.Box takes half-extents

            const triggerBody = new CANNON.Body({
                mass: 0,
                type: CANNON.Body.STATIC,
                collisionResponse: false, // IMPORTANT: Makes it a trigger
                material: null, // No physical material interaction needed
                collisionFilterGroup: 8, // Assign to a specific group (e.g., 8 for triggers)
                collisionFilterMask: 4   // Only detect collisions with the ball (group 4)
            });

            triggerBody.addShape(triggerShape);

            // Position the trigger body using the WORLD position from the config
             // Adjust Y position to be centered within the depression depth
            const triggerY = bunkerConfig.position.y; 
            triggerBody.position.set(bunkerConfig.position.x, triggerY, bunkerConfig.position.z);

            triggerBody.userData = { isBunkerZone: true }; // Identify this body

            this.world.addBody(triggerBody);
            this.bodies.push(triggerBody); // Track the body
            console.log(`[HoleEntity] Added bunker trigger zone at world pos: (${triggerBody.position.x.toFixed(2)}, ${triggerBody.position.y.toFixed(2)}, ${triggerBody.position.z.toFixed(2)})`);
        });
    }
    
    /**
     * Creates visual sand meshes placed at the bottom of bunker depressions.
     */
    createBunkerVisuals() {
        const bunkerConfigs = this.config.hazards?.filter(h => h.type === 'sand') || [];
        if (bunkerConfigs.length === 0) return; // No sand hazards configured

        console.log(`[HoleEntity] Creating ${bunkerConfigs.length} bunker visual meshes.`);

        const sandMaterial = new THREE.MeshStandardMaterial({
            color: 0xE6C388, // Sandy color
            roughness: 0.9,
            metalness: 0.1,
            map: null, // TODO: Add a sand texture later if desired
        });
        // Ensure material is disposed later - maybe track separately or add to standard disposal

        bunkerConfigs.forEach(bunkerConfig => {
            const radius = bunkerConfig.size?.x / 2 || 2;
            const depth = bunkerConfig.size?.y || 0.5;

            // Create a plane slightly smaller than the radius to fit inside the depression
            const sandGeometry = new THREE.PlaneGeometry(radius * 2 * 0.95, radius * 2 * 0.95); // Width, Height for Plane

            const sandMesh = new THREE.Mesh(sandGeometry, sandMaterial);

            // Place just slightly below the green's top surface for visibility within the depression
            const sandY = (this.surfaceHeight / 2) - 0.02;

            // Use LOCAL position relative to the group center
            const localBunkerPos = bunkerConfig.position.clone().sub(this.centerPosition);
            sandMesh.position.set(localBunkerPos.x, sandY, localBunkerPos.z);

            sandMesh.rotation.x = -Math.PI / 2; // Rotate flat

            sandMesh.receiveShadow = true; // Allow sand to receive shadows

            this.group.add(sandMesh);
            this.meshes.push(sandMesh); // Track for disposal
            console.log(`[HoleEntity] Added sand visual mesh at local pos: (${sandMesh.position.x.toFixed(2)}, ${sandMesh.position.y.toFixed(2)}, ${sandMesh.position.z.toFixed(2)})`);
        });
    }
} 