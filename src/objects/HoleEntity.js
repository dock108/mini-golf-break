import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CSG } from 'three-csg-ts';
import { BaseElement } from './BaseElement';
import { createHazard } from './hazards/HazardFactory';

/**
 * HoleEntity - Encapsulates all resources and physics for a single hole
 * Now extends BaseElement
 */
export class HoleEntity extends BaseElement {
    constructor(world, config, scene) {
        // Check if the provided scene is actually a THREE.Group (common when used with NineHoleCourse)
        const sceneIsGroup = scene instanceof THREE.Group;
        
        // Get the scene parent, but handle the case where it might be null
        let actualScene;
        if (sceneIsGroup) {
            // If scene is a Group, try to get its parent, but fall back to the Group itself
            actualScene = scene.parent || scene;
        } else {
            // If not a Group, just use the provided scene
            actualScene = scene;
        }
        
        const targetGroup = sceneIsGroup ? scene : null;
        
        console.log(`[HoleEntity] Constructor: scene is ${sceneIsGroup ? 'a THREE.Group' : 'a THREE.Scene'}, actualScene is ${actualScene === scene ? 'same as input' : 'parent'}`);
        
        // Pass necessary arguments to BaseElement constructor
        // Determine the central position for the HoleEntity group if not explicitly in config
        const centerPos = config.position || new THREE.Vector3(
            (config.startPosition?.x + config.holePosition?.x) / 2 || 0,
            config.position?.y || 0,
            (config.startPosition?.z + config.holePosition?.z) / 2 || 0
        );
        const baseConfig = {
            ...config, // Pass original config
            type: 'hole', // Explicitly set type for BaseElement
            name: `Hole ${config.index + 1}`, // Explicitly set name
            position: centerPos // Ensure position is set for BaseElement
        };
        
        try {
            super(world, baseConfig, actualScene); // Call parent constructor with actual scene
        } catch (error) {
            console.error(`[HoleEntity] Error in BaseElement constructor: ${error.message}`);
            throw new Error(`Failed to initialize BaseElement: ${error.message}`);
        }
        
        // Store the target group if one was provided
        this.targetGroup = targetGroup;
        
        // Hole-specific properties need to be initialized *after* super()
        this.width = Math.max(1, config.courseWidth || 4);
        this.length = Math.max(1, config.courseLength || 20);
        this.wallHeight = 1.0;
        this.wallThickness = 0.2;
        this.holeRadius = 0.35;
        this.surfaceHeight = 0.2; // Define surface height for this hole
        this.visualGreenY = this.surfaceHeight; // Set initial visual Y reference
        
        // Create a group to hold all meshes, positioned by BaseElement
        // Group creation might be handled in BaseElement, verify this assumption
        if (!this.group) { // If BaseElement didn't create it
            this.group = new THREE.Group();
            this.group.position.copy(this.position); // Use position from BaseElement
            
            // Add to appropriate parent (target group or scene)
            if (this.targetGroup) {
                this.targetGroup.add(this.group);
                console.log(`[HoleEntity] Added group to target parent group: ${this.targetGroup.name || 'unnamed'}`);
            } else {
                this.scene.add(this.group);
                console.log(`[HoleEntity] Added group to scene`);
            }
            
            this.meshes.push(this.group); // Track the group if created here
        }
        
        console.log(`[HoleEntity] Created for hole index ${config.index} with config:`, this.config);
        console.log(`[HoleEntity] Dimensions: W=${this.width}, L=${this.length}, Center=${this.position.toArray().join(',')}`);
    }

    // Override create or use an init method if BaseElement expects it
    // Let's assume an init method is better suited here after constructor setup
    init() {
        if (!this.world || !this.scene || !this.group) {
            console.error('[HoleEntity] Missing world, scene, or group reference');
            return;
        }
        
        // Create the visual elements and physics bodies, adding them to this.group
        this.createGreenSurfaceAndPhysics();
        this.createWalls();
        this.createHoleRim();
        this.createHoleVisual();
        this.createHoleTrigger();
        this.createStartPosition();
        
        // Create hazards using the new factory
        this.createHazards();

        // Create bumpers if defined in config
        this.createBumpers();
        
        console.log(`[HoleEntity] Initialization complete for hole index ${this.config.index}. Meshes: ${this.meshes.length}, Bodies: ${this.bodies.length}`);
    }

    /**
     * Create the visual green surface (simple plane) and the physics body (complex Trimesh from CSG).
     */
    createGreenSurfaceAndPhysics() {
        console.log('[HoleEntity] Creating visual green plane (using CSG) and physics body...');

        // --- 1. Define Materials --- 
        const greenMaterial = new THREE.MeshStandardMaterial({
            color: 0x2ecc71,
            roughness: 0.8,
            metalness: 0.1,
        });

        // --- 2. Base Green Geometry (Thin Box for CSG) ---
        const greenDepth = 0.01; // Needs some thickness for CSG
        const baseGreenGeometry = new THREE.BoxGeometry(this.width, greenDepth, this.length);
        const baseGreenMesh = new THREE.Mesh(baseGreenGeometry);
        baseGreenMesh.position.y = this.surfaceHeight; // Center vertically
        baseGreenMesh.updateMatrix(); 
        console.log('[HoleEntity] CSG: Created base green box');

        // --- 3. Create Cutters --- 
        const cutters = [];

        // --- 3a. Main Hole Cutter ---
        const visualHoleRadius = 0.40; // Match rim inner radius
        const mainHoleCutterHeight = greenDepth + 0.1; // Taller than the green box
        const mainHoleCutterGeometry = new THREE.CylinderGeometry(visualHoleRadius, visualHoleRadius, mainHoleCutterHeight, 32);
        const mainHoleCutterMesh = new THREE.Mesh(mainHoleCutterGeometry);
        const worldHolePos = this.config.holePosition;
        const localHolePos = worldHolePos.clone().sub(this.position); // Convert world hole pos to local
        mainHoleCutterMesh.position.set(localHolePos.x, this.surfaceHeight, localHolePos.z); // Align center Y
        mainHoleCutterMesh.updateMatrix(); 
        cutters.push(mainHoleCutterMesh);
        console.log(`[HoleEntity] CSG: Created main hole cutter at local (${localHolePos.x.toFixed(2)}, ${this.surfaceHeight}, ${localHolePos.z.toFixed(2)})`);

        // --- 3b. Hazard Cutters ---
        const hazardConfigs = this.config.hazards || [];
        hazardConfigs.forEach(hazardConfig => {
            // Create cutters for hazards that need a visual depression (sand, water)
            if (hazardConfig.type === 'sand' || hazardConfig.type === 'water') { 
                 const hazardCutterHeight = greenDepth + 0.1; // Taller than green

                if (hazardConfig.shape === 'compound' && hazardConfig.subShapes) {
                    // Compound shape (like snowman)
                    hazardConfig.subShapes.forEach(subShape => {
                        if (subShape.radius) { // Assuming compound parts are circles for now
                            const subShapeWorldX = (hazardConfig.position?.x || 0) + (subShape.position?.x || 0);
                            const subShapeWorldZ = (hazardConfig.position?.z || 0) + (subShape.position?.z || 0);
                            const subShapeLocalPos = new THREE.Vector3(subShapeWorldX, 0, subShapeWorldZ).sub(this.position);

                            const cutterGeom = new THREE.CylinderGeometry(subShape.radius, subShape.radius, hazardCutterHeight, 32);
                            const cutterMesh = new THREE.Mesh(cutterGeom);
                            cutterMesh.position.set(subShapeLocalPos.x, this.surfaceHeight, subShapeLocalPos.z);
                            cutterMesh.updateMatrix();
                            cutters.push(cutterMesh);
                            console.log(`[HoleEntity] CSG: Added compound ${hazardConfig.type} hazard cutter (r=${subShape.radius})`);
                        }
                    });
                } else if (hazardConfig.shape === 'circle' && hazardConfig.size?.radius) {
                    // Simple circle hazard
                    const hazardWorldPos = hazardConfig.position instanceof THREE.Vector3 ? hazardConfig.position : new THREE.Vector3();
                    const hazardLocalPos = hazardWorldPos.clone().sub(this.position);
                    const cutterGeom = new THREE.CylinderGeometry(hazardConfig.size.radius, hazardConfig.size.radius, hazardCutterHeight, 32);
                    const cutterMesh = new THREE.Mesh(cutterGeom);
                    cutterMesh.position.set(hazardLocalPos.x, this.surfaceHeight, hazardLocalPos.z);
                    cutterMesh.updateMatrix();
                    cutters.push(cutterMesh);
                    console.log(`[HoleEntity] CSG: Added circle ${hazardConfig.type} hazard cutter (r=${hazardConfig.size.radius})`);
                } else if (hazardConfig.shape === 'rectangle' && hazardConfig.size?.width && hazardConfig.size?.length) {
                    // Simple rectangle hazard
                     const hazardWorldPos = hazardConfig.position instanceof THREE.Vector3 ? hazardConfig.position : new THREE.Vector3();
                    const hazardLocalPos = hazardWorldPos.clone().sub(this.position);
                    const cutterGeom = new THREE.BoxGeometry(hazardConfig.size.width, hazardCutterHeight, hazardConfig.size.length);
                    const cutterMesh = new THREE.Mesh(cutterGeom);
                    cutterMesh.position.set(hazardLocalPos.x, this.surfaceHeight, hazardLocalPos.z);
                    cutterMesh.updateMatrix();
                    cutters.push(cutterMesh);
                     console.log(`[HoleEntity] CSG: Added rectangle ${hazardConfig.type} hazard cutter (w=${hazardConfig.size.width}, l=${hazardConfig.size.length})`);
                }
                // Add other simple shapes (box?) here if needed
            }
        });

        // --- 4. Perform CSG Subtractions Sequentially ---
        console.log(`[HoleEntity] CSG: Performing ${cutters.length} subtractions...`);
        let currentGreenMesh = baseGreenMesh;
        cutters.forEach((cutter, index) => {
            console.log(`[HoleEntity] CSG: Subtracting cutter ${index + 1}...`);
            currentGreenMesh = CSG.subtract(currentGreenMesh, cutter);
            console.log(`[HoleEntity] CSG: Subtraction ${index + 1} complete.`);
        });
        const finalVisualGreenMesh = currentGreenMesh;
        finalVisualGreenMesh.material = greenMaterial; // Apply the material to the final result

        // --- 5. Add Final Mesh to Group ---
        finalVisualGreenMesh.castShadow = false;
        finalVisualGreenMesh.receiveShadow = true;
        this.group.add(finalVisualGreenMesh);
        this.meshes.push(finalVisualGreenMesh); 
        console.log(`[HoleEntity] Created final visual green plane using CSG with ${cutters.length} cutouts at y=${this.visualGreenY}`);

        // --- Physics Body (Uses ORIGINAL PlaneGeometry -UNCHANGED) ---
        console.log('[HoleEntity] Creating physics body (Trimesh from simple PlaneGeometry)...');
        const physicsPlaneGeom = new THREE.PlaneGeometry(this.width, this.length, 1, 1);
        const physicsGroundMaterial = this.world.groundMaterial;
        if (!physicsPlaneGeom.index) {
            console.error('[HoleEntity] Physics plane geometry is not indexed.');
            return;
        }
        const vertices = physicsPlaneGeom.attributes.position.array;
        const indices = physicsPlaneGeom.index.array;
        if (!vertices || !indices || vertices.length === 0 || indices.length === 0) {
            console.error('[HoleEntity] Invalid vertices or indices for physics Trimesh.');
            return;
        }
        const groundShape = new CANNON.Trimesh(vertices, indices);
        const groundBody = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.STATIC,
            material: physicsGroundMaterial,
        });
        groundBody.addShape(groundShape);
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        // Position/rotate physics body based on the GROUP's world transform and surface height
        this.group.getWorldPosition(worldPos);
        this.group.getWorldQuaternion(worldQuat);
        // Adjust position for surface height
        groundBody.position.copy(worldPos).y += this.surfaceHeight;
        groundBody.quaternion.copy(worldQuat);
        // The simple plane needs rotation to lie flat relative to the group's rotation
        const planeRotation = new CANNON.Quaternion();
        planeRotation.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        groundBody.quaternion = groundBody.quaternion.mult(planeRotation);

        console.log(`[HoleEntity] Positioned Trimesh physics body at world (${groundBody.position.x.toFixed(2)}, ${groundBody.position.y.toFixed(2)}, ${groundBody.position.z.toFixed(2)})`);
        groundBody.userData = { type: 'green', holeIndex: this.config.index };
        this.world.addBody(groundBody);
        this.bodies.push(groundBody);
        console.log('[HoleEntity] Created Trimesh physics body from simple PlaneGeometry');
        physicsPlaneGeom.dispose();
        // --- End Physics Body Creation ---
    }

    createHoleRim() {
        const worldHolePos = this.config.holePosition;
        const localHolePos = worldHolePos.clone().sub(this.position); // Use position from BaseElement
        const visualHoleRadius = 0.40; // Visual radius for the rim's inner edge

        const rimGeometry = new THREE.RingGeometry(
            visualHoleRadius,        
            visualHoleRadius + 0.04, 
            32
        );

        const rimMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xCCCCCC, 
            roughness: 0.3,  
            metalness: 0.9,  
            // side: THREE.DoubleSide // May not be needed if always viewed from above
        });

        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.x = -Math.PI / 2; // Lay flat
        
        // Position slightly ABOVE the visual green surface
        const rimY = this.visualGreenY + 0.002; // Use stored Y + small offset
        rim.position.set(localHolePos.x, rimY, localHolePos.z);

        rim.receiveShadow = true; 

        this.group.add(rim); 
        this.meshes.push(rim); 
        console.log('[HoleEntity] Created metallic hole rim mesh');
    }
    
    createHoleVisual() {
        const worldHolePos = this.config.holePosition;
        const localHolePos = worldHolePos.clone().sub(this.position); // Use position from BaseElement
        
        // Parameters for the interior cylinder
        const holeInteriorRadius = 0.40; // Match visual rim radius
        const holeInteriorDepth = 0.25;  // Realistic depth

        // Use CylinderGeometry for the interior
        // Note: We make it open-ended (last arg = true) so no top/bottom faces are rendered.
        const interiorGeometry = new THREE.CylinderGeometry(
            holeInteriorRadius, 
            holeInteriorRadius, 
            holeInteriorDepth, 
            32, // Segments for smoothness
            1,  // Height segments
            true // Open-ended
        );

        // Dark, non-reflective material for the interior walls
        const interiorMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a, // Slightly darker than example
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide // Render inner and outer surfaces (important for open cylinder)
        });

        const holeInteriorMesh = new THREE.Mesh(interiorGeometry, interiorMaterial);

        // Position the cylinder so its top opening is JUST slightly above the green surface level.
        // Explicitly calculate the target top edge Y, then find the center Y.
        const slightOffset = 0.01; // Increased offset further 
        const topEdgeY = this.visualGreenY + slightOffset;
        const cylinderCenterY = topEdgeY - (holeInteriorDepth / 2);
        holeInteriorMesh.position.set(localHolePos.x, cylinderCenterY, localHolePos.z);
        // Cylinder geometry is oriented along Y axis by default, no X rotation needed.

        // Allow the interior to receive shadows from the rim/ball, but don't cast shadows itself.
        holeInteriorMesh.castShadow = false;
        holeInteriorMesh.receiveShadow = true;

        this.group.add(holeInteriorMesh);
        this.meshes.push(holeInteriorMesh); // Track this mesh
        console.log('[HoleEntity] Created realistic interior visual for the hole.');
    }

    createWalls() {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xA0522D,
            roughness: 0.7,
            metalness: 0.3
        });
        
        // Wall positions are relative to the group's origin (centerPosition)
        const walls = [
            {
                size: [this.wallThickness, this.wallHeight, this.length],
                position: [-this.width/2, this.wallHeight/2 + this.surfaceHeight, 0],
                type: 'wall_left'
            },
            // ... other walls defined relative to group center ...
            {
                size: [this.wallThickness, this.wallHeight, this.length],
                position: [this.width/2, this.wallHeight/2 + this.surfaceHeight, 0],
                type: 'wall_right'
            },
            {
                size: [this.width, this.wallHeight, this.wallThickness],
                position: [0, this.wallHeight/2 + this.surfaceHeight, -this.length/2],
                type: 'wall_back'
            },
            {
                size: [this.width, this.wallHeight, this.wallThickness],
                position: [0, this.wallHeight/2 + this.surfaceHeight, this.length/2],
                type: 'wall_front'
            }
        ];
        
        walls.forEach(wall => {
            // Create visual mesh (position is local to group)
            const geometry = new THREE.BoxGeometry(...wall.size);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(...wall.position);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.group.add(mesh);
            this.meshes.push(mesh);
            
            // Create physics body (needs world position)
            const body = new CANNON.Body({
                mass: 0,
                type: CANNON.Body.STATIC,
                material: this.world.bumperMaterial
            });
            body.addShape(new CANNON.Box(new CANNON.Vec3(
                wall.size[0] / 2, wall.size[1] / 2, wall.size[2] / 2
            )));
            
            // Convert local wall position to world position using group's world matrix
            const worldPos = new THREE.Vector3(...wall.position);
            this.group.localToWorld(worldPos); // Convert local group position to world
            body.position.copy(worldPos);
            body.quaternion.copy(this.group.quaternion); // Align body rotation with group
            
            body.userData = { type: wall.type, holeIndex: this.config.index };
            this.world.addBody(body);
            this.bodies.push(body);
        });
        
        console.log('[HoleEntity] Created walls');
    }
    
    createHoleTrigger() {
        const worldHolePos = this.config.holePosition;
        // Trigger radius slightly larger than visual hole
        const triggerRadius = this.holeRadius + 0.05; 
        const triggerHeight = 0.1; // Thin cylinder trigger

        const holeTriggerBody = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.STATIC,
            isTrigger: true,
            material: null
        });

        const triggerShape = new CANNON.Cylinder(triggerRadius, triggerRadius, triggerHeight, 16);
        holeTriggerBody.addShape(triggerShape);

        // Position the trigger centered at the WORLD hole position, vertically AT the green surface
        holeTriggerBody.position.set(worldHolePos.x, this.visualGreenY, worldHolePos.z);
        // Cylinder needs rotation to stand upright if its default axis isn't Y - REMOVED, Cannon-es default is Y-up
        // const quat = new CANNON.Quaternion();
        // quat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); // Assume default is Z-up, rotate to Y-up
        // holeTriggerBody.quaternion.copy(quat);

        holeTriggerBody.userData = { type: 'holeTrigger', holeIndex: this.config.index };
        this.world.addBody(holeTriggerBody);
        this.bodies.push(holeTriggerBody);
        console.log(`[HoleEntity] Created hole trigger volume at Y=${this.visualGreenY.toFixed(2)}`);
    }

    createStartPosition() {
        const worldStartPos = this.config.startPosition;
        const localStartPos = worldStartPos.clone().sub(this.position); // Use position from BaseElement

        const teeGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.05, 24);
        const teeMaterial = new THREE.MeshStandardMaterial({
            color: 0x0077cc,
            roughness: 0.5,
            metalness: 0.2
        });
        
        const teeMesh = new THREE.Mesh(teeGeometry, teeMaterial);
        teeMesh.position.copy(localStartPos);
        // Position slightly above the visual green surface
        teeMesh.position.y = this.visualGreenY + 0.03; 
        
        this.group.add(teeMesh);
        this.meshes.push(teeMesh);
        
        console.log('[HoleEntity] Created start position marker');
    }
    
    /**
     * Create hazards using the Hazard Factory
     */
    createHazards() {
        const hazardConfigs = this.config.hazards || [];
        
        if (hazardConfigs.length === 0) {
            console.log('[HoleEntity] No hazards to create.');
            return;
        }
        
        console.log(`[HoleEntity] Creating ${hazardConfigs.length} hazards using factory...`);
        
        // Define course bounds for hazard clipping
        const courseBounds = {
            width: this.width,
            length: this.length
        };
        
        // For each hazard configuration, create visuals and physics
        hazardConfigs.forEach(hazardConfig => {
            try {
                // Create the hazard using the factory, passing the course dimensions for boundary clipping
                const { meshes, bodies } = createHazard(
                    this.world, 
                    this.group, 
                    hazardConfig, 
                    this.visualGreenY,
                    courseBounds
                );
                
                // Add meshes and bodies to tracking arrays
                this.meshes.push(...meshes);
                this.bodies.push(...bodies);
            } catch (error) {
                console.error('[HoleEntity] Failed to create hazard:', error);
            }
        });
    }

    /**
     * Create bumpers from configuration if any defined
     */
    createBumpers() {
        const bumperConfigs = this.config.bumpers || [];
        
        if (bumperConfigs.length === 0) {
            console.log('[HoleEntity] No bumpers defined in config.');
            return;
        }
        
        console.log(`[HoleEntity] Creating ${bumperConfigs.length} bumpers for hole ${this.config.index + 1}...`);
        
        // Create a box that represents the course boundary for CSG
        const boundaryGeom = new THREE.BoxGeometry(this.width, 2, this.length);
        const boundaryMesh = new THREE.Mesh(boundaryGeom);
        boundaryMesh.position.set(0, 0.5, 0); // Center of course, slightly raised
        boundaryMesh.updateMatrix();
        
        bumperConfigs.forEach((bumperConfig, index) => {
            try {
                // Create bumper material
                const bumperMaterial = new THREE.MeshStandardMaterial({
                    color: bumperConfig.color || 0xFF8C00, // Default to orange for bumpers
                    roughness: 0.7,
                    metalness: 0.3
                });
                
                // Create bumper geometry and mesh
                const bumperGeom = new THREE.BoxGeometry(
                    bumperConfig.size.x, 
                    bumperConfig.size.y, 
                    bumperConfig.size.z
                );
                
                const bumperMesh = new THREE.Mesh(bumperGeom);
                bumperMesh.position.copy(bumperConfig.position);
                
                // Apply rotation if specified
                if (bumperConfig.rotation) {
                    bumperMesh.rotation.copy(bumperConfig.rotation);
                }
                
                bumperMesh.updateMatrix();
                
                // Use CSG to constrain the bumper to the course boundaries
                const finalBumperMesh = CSG.intersect(bumperMesh, boundaryMesh);
                finalBumperMesh.material = bumperMaterial;
                
                // Enable shadows
                finalBumperMesh.castShadow = true;
                finalBumperMesh.receiveShadow = true;
                
                // Add mesh to hole group
                this.group.add(finalBumperMesh);
                this.meshes.push(finalBumperMesh);
                
                // Create physics body
                const bumperBody = new CANNON.Body({
                    type: CANNON.Body.STATIC,
                    mass: 0,
                    material: this.world.bumperMaterial
                });
                
                // Create physics shape matching the visual
                const halfExtents = new CANNON.Vec3(
                    bumperConfig.size.x / 2, 
                    bumperConfig.size.y / 2, 
                    bumperConfig.size.z / 2
                );
                
                const bumperShape = new CANNON.Box(halfExtents);
                bumperBody.addShape(bumperShape);
                
                // Match position of visual bumper
                bumperBody.position.copy(bumperConfig.position);
                
                // Match rotation if specified
                if (bumperConfig.rotation) {
                    // Convert euler rotation to quaternion
                    const quaternion = new CANNON.Quaternion();
                    quaternion.setFromEuler(
                        bumperConfig.rotation.x,
                        bumperConfig.rotation.y,
                        bumperConfig.rotation.z,
                        bumperConfig.rotation.order || 'XYZ'
                    );
                    bumperBody.quaternion.copy(quaternion);
                }
                
                // Set user data
                bumperBody.userData = {
                    type: 'bumper',
                    holeIndex: this.config.index
                };
                
                // Add to world and tracking
                this.world.addBody(bumperBody);
                this.bodies.push(bumperBody);
                
                console.log(`[HoleEntity] Created bumper ${index + 1} at local pos (${bumperConfig.position.x.toFixed(2)}, ${bumperConfig.position.y.toFixed(2)}, ${bumperConfig.position.z.toFixed(2)})`);
                
            } catch (error) {
                console.error(`[HoleEntity] Failed to create bumper ${index}:`, error);
            }
        });
        
        // Clean up the boundary geometry
        boundaryGeom.dispose();
    }

    // BaseElement destroy() will handle cleanup of meshes and bodies arrays.
} 