import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CSG } from 'three-csg-ts';
import { BaseElement } from './BaseElement';
import { createHazard } from './hazards/HazardFactory';

/**
 * HoleEntity - Encapsulates all resources and physics for a single hole
 * Now extends BaseElement
 * EXPECTS: All positions in config (startPosition, holePosition, hazards, bumpers) = WORLD coordinates relative to (0,0,0)
 */
export class HoleEntity extends BaseElement {
    constructor(world, config, scene) {
        // Scene can be a THREE.Group when used with NineHoleCourse
        const sceneIsGroup = scene instanceof THREE.Group;
        const actualScene = sceneIsGroup ? (scene.parent || scene) : scene;
        const targetGroup = sceneIsGroup ? scene : null; // The specific group for this hole if provided

        // BaseElement config: Use (0,0,0) as the position for the HoleEntity's group itself.
        // The actual geometry placement will use the WORLD coordinates from the config.
        const baseConfig = {
            ...config,
            position: new THREE.Vector3(0, 0, 0), // Force HoleEntity group to be at world origin
            type: 'hole',
            name: `Hole ${config.index + 1}`,
        };

        // BaseElement constructor creates this.group at baseConfig.position (0,0,0)
        super(world, baseConfig, actualScene);

        // Store the target group if one was provided (e.g., Hole_1_Group)
        // If targetGroup exists, add this.group (at 0,0,0) to it.
        // Otherwise, add this.group directly to the main scene.
        if (targetGroup) {
            if (this.group && !this.group.parent) targetGroup.add(this.group);
            this.parentGroup = targetGroup; // Store reference if needed
        } else {
             if (this.group && !this.group.parent) this.scene.add(this.group);
             this.parentGroup = null;
        }
        
        // Hole-specific properties
        this.width = Math.max(1, config.courseWidth || 4);
        this.length = Math.max(1, config.courseLength || 20);
        this.wallHeight = 1.0;
        this.wallThickness = 0.2;
        this.holeRadius = 0.35; // Physics radius
        this.surfaceHeight = 0.2; // Local Y height of the green surface relative to group (0,0,0)
        this.visualGreenY = this.surfaceHeight;

        // Store WORLD coordinates from config, ensuring they are Vector3
        this.worldStartPosition = config.startPosition instanceof THREE.Vector3
            ? config.startPosition.clone()
            : new THREE.Vector3(config.startPosition?.x || 0, config.startPosition?.y || 0, config.startPosition?.z || 0);
        this.worldHolePosition = config.holePosition instanceof THREE.Vector3
            ? config.holePosition.clone()
            : new THREE.Vector3(config.holePosition?.x || 0, config.holePosition?.y || 0, config.holePosition?.z || 0);
        
        console.log(`[HoleEntity] Created for hole index ${config.index}. Group at (0,0,0).`);
        console.log(`[HoleEntity] World Start: (${this.worldStartPosition.x}, ${this.worldStartPosition.z}), World Hole: (${this.worldHolePosition.x}, ${this.worldHolePosition.z})`);
    }

    init() {
        if (!this.world || !this.scene || !this.group) {
            console.error('[HoleEntity] Missing world, scene, or group reference during init');
            return Promise.reject('Missing references');
        }
        
        try {
            // Create elements using WORLD coordinates from config
            this.createGreenSurfaceAndPhysics();
            this.createWalls();
            this.createHoleRim();
            this.createHoleVisual();
            this.createHoleTrigger();
            this.createStartPosition();
            this.createHazards();
            this.createBumpers();
            console.log(`[HoleEntity] Initialization complete for hole index ${this.config.index}.`);
            return Promise.resolve();
        } catch (error) {
            console.error(`[HoleEntity] Error during initialization for hole ${this.config.index}:`, error);
            this.destroy();
            return Promise.reject(error);
        }
    }

    createGreenSurfaceAndPhysics() {
        const greenMaterial = new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.8, metalness: 0.1 });
        const greenDepth = 0.01;
        const baseGreenGeometry = new THREE.BoxGeometry(this.width, greenDepth, this.length);
        const baseGreenMesh = new THREE.Mesh(baseGreenGeometry);
        // Position mesh LOCALLY relative to group (0,0,0)
        baseGreenMesh.position.y = this.surfaceHeight;
        baseGreenMesh.updateMatrix();

        // --- Cutters (use WORLD coords from config) ---
        const cutters = [];
        // Hole Cutter
        const visualHoleRadius = 0.40;
        const mainHoleCutterHeight = greenDepth + 0.1;
        const mainHoleCutterGeometry = new THREE.CylinderGeometry(visualHoleRadius, visualHoleRadius, mainHoleCutterHeight, 32);
        const mainHoleCutterMesh = new THREE.Mesh(mainHoleCutterGeometry);
        // Position cutter at WORLD hole position, adjusted for local surface height
        mainHoleCutterMesh.position.set(this.worldHolePosition.x, this.surfaceHeight, this.worldHolePosition.z);
        mainHoleCutterMesh.updateMatrix();
        cutters.push(mainHoleCutterMesh);

        // Hazard Cutters
        (this.config.hazards || []).forEach(hazardConfig => {
            if (hazardConfig.type === 'sand' || hazardConfig.type === 'water') {
                const hazardCutterHeight = greenDepth + 0.1;
                // Ensure hazard position is WORLD Vector3
                const hazardWorldPos = hazardConfig.position instanceof THREE.Vector3
                    ? hazardConfig.position.clone()
                    : new THREE.Vector3(hazardConfig.position?.x || 0, 0, hazardConfig.position?.z || 0);

                if (hazardConfig.shape === 'circle' && hazardConfig.size?.radius) {
                    const cutterGeom = new THREE.CylinderGeometry(hazardConfig.size.radius, hazardConfig.size.radius, hazardCutterHeight, 32);
                    const cutterMesh = new THREE.Mesh(cutterGeom);
                    cutterMesh.position.set(hazardWorldPos.x, this.surfaceHeight, hazardWorldPos.z);
                    cutterMesh.updateMatrix();
                    cutters.push(cutterMesh);
                } else if (hazardConfig.shape === 'rectangle' && hazardConfig.size?.width && hazardConfig.size?.length) {
                    const cutterGeom = new THREE.BoxGeometry(hazardConfig.size.width, hazardCutterHeight, hazardConfig.size.length);
                    const cutterMesh = new THREE.Mesh(cutterGeom);
                    cutterMesh.position.set(hazardWorldPos.x, this.surfaceHeight, hazardWorldPos.z);
                    if (hazardConfig.rotation) cutterMesh.rotation.copy(hazardConfig.rotation);
                    cutterMesh.updateMatrix();
                    cutters.push(cutterMesh);
                }
            }
        });

        // Perform CSG
        let currentGreenMesh = baseGreenMesh;
        cutters.forEach((cutter) => { currentGreenMesh = CSG.subtract(currentGreenMesh, cutter); });
        const finalVisualGreenMesh = currentGreenMesh;
        finalVisualGreenMesh.material = greenMaterial;
        finalVisualGreenMesh.castShadow = false;
        finalVisualGreenMesh.receiveShadow = true;
        // Add final mesh to the group (at 0,0,0), its internal geometry is correctly positioned relative to the group center
        this.group.add(finalVisualGreenMesh);
        this.meshes.push(finalVisualGreenMesh);

        // --- Physics Body (Trimesh at WORLD origin 0,0,0) ---
        const physicsPlaneGeom = new THREE.PlaneGeometry(this.width, this.length, 1, 1);
        const physicsGroundMaterial = this.world.groundMaterial;
        const vertices = physicsPlaneGeom.attributes.position.array;
        const indices = physicsPlaneGeom.index.array;
        const groundShape = new CANNON.Trimesh(vertices, indices);
        const groundBody = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, material: physicsGroundMaterial });
        
        // Plane needs local rotation to lie flat
        const planeLocalRotation = new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        groundBody.addShape(groundShape, new CANNON.Vec3(0,0,0), planeLocalRotation);
        
        // Position body at WORLD origin (0,0,0) + surfaceHeight offset
        // Since the group is at (0,0,0), worldPos is effectively (0,0,0)
        groundBody.position.set(0, this.surfaceHeight, 0);
        groundBody.quaternion.set(0, 0, 0, 1); // No world rotation for the body itself

        groundBody.userData = { type: 'green', holeIndex: this.config.index };
        this.world.addBody(groundBody);
        this.bodies.push(groundBody);
        physicsPlaneGeom.dispose();
    }

    createHoleRim() {
        // Use WORLD hole position
        const visualHoleRadius = 0.40;
        const rimGeometry = new THREE.RingGeometry(visualHoleRadius, visualHoleRadius + 0.04, 32);
        const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.3, metalness: 0.9 });
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.x = -Math.PI / 2;
        const rimY = this.visualGreenY + 0.002; // Local Y offset from green surface
        // Position mesh at WORLD hole position, adjusted for local Y offset
        rim.position.set(this.worldHolePosition.x, rimY, this.worldHolePosition.z);
        rim.receiveShadow = true;
        this.group.add(rim); // Add to group at (0,0,0)
        this.meshes.push(rim);
    }

    createHoleVisual() {
        // Use WORLD hole position
        const holeInteriorRadius = 0.40;
        const holeInteriorDepth = 0.25;
        const interiorGeometry = new THREE.CylinderGeometry(holeInteriorRadius, holeInteriorRadius, holeInteriorDepth, 32, 1, true);
        const interiorMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.1, side: THREE.DoubleSide });
        const holeInteriorMesh = new THREE.Mesh(interiorGeometry, interiorMaterial);
        const topEdgeY = this.visualGreenY + 0.01; // Local Y target for top edge
        const cylinderCenterY = topEdgeY - (holeInteriorDepth / 2); // Local Y for cylinder center
        // Position mesh at WORLD hole position, adjusted for local Y center
        holeInteriorMesh.position.set(this.worldHolePosition.x, cylinderCenterY, this.worldHolePosition.z);
        holeInteriorMesh.castShadow = false;
        holeInteriorMesh.receiveShadow = true;
        this.group.add(holeInteriorMesh); // Add to group at (0,0,0)
        this.meshes.push(holeInteriorMesh);
    }

    createWalls() {
        // Wall definitions use LOCAL offsets from the edges (relative to 0,0,0 group center)
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xA0522D, roughness: 0.7, metalness: 0.3 });
        const walls = [
            // Note: Y position is adjusted by surfaceHeight
            { size: [this.wallThickness, this.wallHeight, this.length], position: [-this.width/2, this.wallHeight/2 + this.surfaceHeight, 0], type: 'wall_left' },
            { size: [this.wallThickness, this.wallHeight, this.length], position: [this.width/2, this.wallHeight/2 + this.surfaceHeight, 0], type: 'wall_right' },
            { size: [this.width, this.wallHeight, this.wallThickness], position: [0, this.wallHeight/2 + this.surfaceHeight, -this.length/2], type: 'wall_back' },
            { size: [this.width, this.wallHeight, this.wallThickness], position: [0, this.wallHeight/2 + this.surfaceHeight, this.length/2], type: 'wall_front' }
        ];
        
        walls.forEach(wall => {
            // Create visual mesh (position is local relative to group 0,0,0)
            const geometry = new THREE.BoxGeometry(...wall.size);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(...wall.position); // Set LOCAL position within group
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.group.add(mesh);
            this.meshes.push(mesh);
            
            // Create physics body (position is ABSOLUTE WORLD)
            const body = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, material: this.world.bumperMaterial });
            body.addShape(new CANNON.Box(new CANNON.Vec3(wall.size[0] / 2, wall.size[1] / 2, wall.size[2] / 2)));
            
            // Position body directly at WORLD coordinates (local offset from 0,0,0)
            body.position.set(...wall.position); 
            body.quaternion.set(0,0,0,1); // No rotation needed as walls are axis-aligned relative to world
            
            body.userData = { type: wall.type, holeIndex: this.config.index };
            this.world.addBody(body);
            this.bodies.push(body);
        });
    }
    
    createHoleTrigger() {
        // Trigger body needs WORLD position.
        const triggerRadius = this.holeRadius + 0.05;
        const triggerHeight = 0.1;
        const holeTriggerBody = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, isTrigger: true, material: null });
        const triggerShape = new CANNON.Cylinder(triggerRadius, triggerRadius, triggerHeight, 16);
        holeTriggerBody.addShape(triggerShape);

        // Position trigger at WORLD hole position, adjusted for green surface height (which is relative to 0)
        holeTriggerBody.position.set(this.worldHolePosition.x, this.visualGreenY, this.worldHolePosition.z);
        // No body rotation needed for Y-up cylinder

        holeTriggerBody.userData = { type: 'holeTrigger', holeIndex: this.config.index };
        this.world.addBody(holeTriggerBody);
        this.bodies.push(holeTriggerBody);
    }

    createStartPosition() {
        // Use WORLD start position for the visual mesh
        const teeGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.05, 24);
        const teeMaterial = new THREE.MeshStandardMaterial({ color: 0x0077cc, roughness: 0.5, metalness: 0.2 });
        const teeMesh = new THREE.Mesh(teeGeometry, teeMaterial);
        // Position mesh at WORLD start position, adjusted for local Y offset
        teeMesh.position.copy(this.worldStartPosition);
        teeMesh.position.y = this.visualGreenY + 0.03; // Y offset relative to surface
        this.group.add(teeMesh); // Add to group at (0,0,0)
        this.meshes.push(teeMesh);
    }
    
    createHazards() {
        // Assumes HazardFactory positions elements LOCALLY within the provided group
        // We pass this.group (at 0,0,0) and hazard configs with WORLD positions
        // HazardFactory needs to handle this correctly or be updated.
        // FOR NOW: Assuming HazardFactory adds meshes/bodies directly to world using config coords.
        const hazardConfigs = this.config.hazards || [];
        if (hazardConfigs.length === 0) return;
        const courseBounds = { width: this.width, length: this.length }; // Still useful for potential clipping
        
        hazardConfigs.forEach(hazardConfig => {
            try {
                // Ensure position is WORLD Vector3
                 const worldHazardPos = hazardConfig.position instanceof THREE.Vector3
                     ? hazardConfig.position.clone()
                     : new THREE.Vector3(hazardConfig.position?.x || 0, hazardConfig.position?.y || 0, hazardConfig.position?.z || 0);
                
                // Create config to pass, ensuring WORLD position is used
                const factoryConfig = { 
                    ...hazardConfig, 
                    position: worldHazardPos // Pass WORLD position
                };

                // Call factory - EXPECTS it to place things using WORLD coords now
                const { meshes, bodies } = createHazard(
                    this.world, 
                    this.group, // Pass group (at 0,0,0) - Factory might ignore this for positioning now
                    factoryConfig, 
                    this.visualGreenY, // Pass surface height relative to 0
                    courseBounds
                );
                this.meshes.push(...meshes); // Track meshes created by factory
                this.bodies.push(...bodies); // Track bodies created by factory
            } catch (error) {
                console.error('[HoleEntity] Failed to create hazard:', error, hazardConfig);
            }
        });
    }

    createBumpers() {
        // Bumpers defined with WORLD coordinates relative to origin (0,0,0)
        const bumperConfigs = this.config.bumpers || [];
        if (bumperConfigs.length === 0) return;
        
        bumperConfigs.forEach((bumperConfig, index) => {
            try {
                // Ensure bumper position is WORLD Vector3
                const worldBumperPos = bumperConfig.position instanceof THREE.Vector3
                    ? bumperConfig.position.clone()
                    : new THREE.Vector3(bumperConfig.position?.x || 0, bumperConfig.position?.y || 0, bumperConfig.position?.z || 0);
                
                // Ensure bumper rotation is Euler
                const worldBumperRot = bumperConfig.rotation instanceof THREE.Euler
                    ? bumperConfig.rotation.clone()
                    : new THREE.Euler(bumperConfig.rotation?.x || 0, bumperConfig.rotation?.y || 0, bumperConfig.rotation?.z || 0);

                // Create visual mesh
                const bumperMaterial = new THREE.MeshStandardMaterial({ color: bumperConfig.color || 0xFF8C00, roughness: 0.7, metalness: 0.3 });
                const bumperGeom = new THREE.BoxGeometry(bumperConfig.size.x, bumperConfig.size.y, bumperConfig.size.z);
                const bumperMesh = new THREE.Mesh(bumperGeom, bumperMaterial);
                // Position mesh at WORLD coordinates
                bumperMesh.position.copy(worldBumperPos);
                bumperMesh.rotation.copy(worldBumperRot);
                bumperMesh.castShadow = true;
                bumperMesh.receiveShadow = true;
                this.group.add(bumperMesh); // Add to group at (0,0,0)
                this.meshes.push(bumperMesh);
                
                // --- Physics Body --- (Also uses WORLD transform)
                const bumperBody = new CANNON.Body({ type: CANNON.Body.STATIC, mass: 0, material: this.world.bumperMaterial });
                const halfExtents = new CANNON.Vec3(bumperConfig.size.x / 2, bumperConfig.size.y / 2, bumperConfig.size.z / 2);
                const bumperShape = new CANNON.Box(halfExtents);
                bumperBody.addShape(bumperShape);

                // Position body at WORLD coordinates
                bumperBody.position.copy(worldBumperPos);
                // Convert world Euler rotation to Cannon Quaternion
                const worldBumperQuatCANNON = new CANNON.Quaternion();
                worldBumperQuatCANNON.setFromEuler(worldBumperRot.x, worldBumperRot.y, worldBumperRot.z, worldBumperRot.order);
                bumperBody.quaternion.copy(worldBumperQuatCANNON);

                bumperBody.userData = { type: 'bumper', holeIndex: this.config.index };
                this.world.addBody(bumperBody);
                this.bodies.push(bumperBody);
                
            } catch (error) {
                console.error(`[HoleEntity] Failed to create bumper ${index}:`, error, bumperConfig);
            }
        });
    }

    destroy() {
        console.log(`[HoleEntity] Destroying Hole ${this.config.index + 1}`);
        super.destroy(); // BaseElement handles removing bodies/meshes/group
    }
} 