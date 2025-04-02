import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CSG } from 'three-csg-ts';

/**
 * Creates a hazard (visuals and physics trigger) based on configuration.
 * @param {CANNON.World} world - The physics world
 * @param {THREE.Group} group - The parent THREE.Group to add visuals to
 * @param {object} hazardConfig - Configuration for the hazard
 * @param {number} visualGreenY - The Y-level of the visual green surface
 * @returns {{meshes: THREE.Mesh[], bodies: CANNON.Body[]}} Created meshes and bodies
 */
export function createHazard(world, group, hazardConfig, visualGreenY) {
    console.log(`[HazardFactory] Creating hazard:`, hazardConfig);
    switch(hazardConfig.type) {
        case 'sand':
            return createSandHazard(world, group, hazardConfig, visualGreenY);
        case 'water':
            return createWaterHazard(world, group, hazardConfig, visualGreenY);
        default:
            console.warn('[HazardFactory] Unknown hazard type:', hazardConfig.type);
            return { meshes: [], bodies: [] };
    }
}

/**
 * Creates visuals and physics trigger for a sand hazard.
 * Handles simple shapes ('circle', 'rectangle') and 'compound' shapes.
 */
function createSandHazard(world, group, config, visualGreenY) {
    const allMeshes = [];
    const allBodies = [];

    const sandMaterial = new THREE.MeshStandardMaterial({
        color: 0xE6C388, // Sandy color
        roughness: 0.9,
        metalness: 0.1,
    });

    const hazardDepth = config.depth || 0.2; // Default depth if not specified
    const visualY = visualGreenY - 0.01; // Place visuals slightly below green
    const triggerY = visualGreenY - hazardDepth / 2; // Center trigger vertically in depression

    if (config.shape === 'compound' && config.subShapes) {
        // Handle compound shapes (like snowman bunker)
        config.subShapes.forEach((subShape, index) => {
            const subPos = new THREE.Vector3(
                (config.position?.x || 0) + (subShape.position?.x || 0),
                0,
                (config.position?.z || 0) + (subShape.position?.z || 0)
            );

            const { meshes, bodies } = createSandHazardPart({
                ...config,
                shape: 'circle',
                position: subPos,
                size: { radius: subShape.radius }
            }, world, group, sandMaterial, visualY, triggerY);

            allMeshes.push(...meshes);
            allBodies.push(...bodies);
        });
    } else {
        // Handle single shape
        const { meshes, bodies } = createSandHazardPart(
            config,
            world,
            group,
            sandMaterial,
            visualY,
            triggerY
        );
        allMeshes.push(...meshes);
        allBodies.push(...bodies);
    }

    return { meshes: allMeshes, bodies: allBodies };
}

/**
 * Creates a single part of a sand hazard (one circle/rectangle).
 */
function createSandHazardPart(config, world, group, material, visualY, triggerY) {
    const meshes = [];
    const bodies = [];

    try {
        let visualGeometry;
        let triggerShape;
        const worldPos = new THREE.Vector3(
            config.position?.x || 0,
            0,
            config.position?.z || 0
        );
        const localPos = worldPos.clone().sub(group.position);

        if (config.shape === 'circle') {
            const radius = config.size?.radius || 1;
            visualGeometry = new THREE.CircleGeometry(radius, 32);
            visualGeometry.rotateX(-Math.PI / 2); // Lay flat
            triggerShape = new CANNON.Cylinder(radius, radius, config.depth || 0.2, 16);
        } else if (config.shape === 'rectangle') {
            const width = config.size?.width || 2;
            const length = config.size?.length || 2;
            visualGeometry = new THREE.PlaneGeometry(width, length);
            visualGeometry.rotateX(-Math.PI / 2);
            triggerShape = new CANNON.Box(new CANNON.Vec3(width/2, (config.depth || 0.2)/2, length/2));
        } else {
            console.warn(`[HazardFactory] Unsupported shape: ${config.shape}`);
            return { meshes: [], bodies: [] };
        }

        // Create visual mesh
        const visualMesh = new THREE.Mesh(visualGeometry, material);
        visualMesh.position.set(localPos.x, visualY, localPos.z);
        visualMesh.receiveShadow = true;
        group.add(visualMesh);
        meshes.push(visualMesh);

        // Create physics trigger
        const triggerBody = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.STATIC,
            isTrigger: true,
            collisionFilterGroup: 8,
            collisionFilterMask: 4
        });
        triggerBody.addShape(triggerShape);
        triggerBody.position.set(worldPos.x, triggerY, worldPos.z);
        
        triggerBody.userData = { isBunkerZone: true };
        world.addBody(triggerBody);
        bodies.push(triggerBody);

    } catch (error) {
        console.error('[HazardFactory] Error creating hazard part:', error);
        return { meshes: [], bodies: [] };
    }

    return { meshes, bodies };
}

// ==================================
// Water Hazard Implementation
// ==================================

/**
 * Creates visuals and physics trigger for a water hazard.
 * Handles simple shapes ('circle', 'rectangle') and 'compound' shapes.
 */
function createWaterHazard(world, group, config, visualGreenY) {
    const allMeshes = [];
    const allBodies = [];

    // Define water material
    const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x3399FF, // Water blue
        transparent: true,
        opacity: 0.7,
        roughness: 0.2,
        metalness: 0.1,
    });

    const hazardDepth = config.depth || 0.15; // Default depth for trigger height
    const visualY = visualGreenY - 0.02; // Place visuals slightly below green
    // Center trigger vertically in shallow depth
    const triggerY = visualGreenY - hazardDepth / 2; 

    if (config.shape === 'compound' && config.subShapes) {
        // Handle compound shapes (like snowman)
        config.subShapes.forEach((subShape, index) => {
            const subPos = new THREE.Vector3(
                (config.position?.x || 0) + (subShape.position?.x || 0),
                0,
                (config.position?.z || 0) + (subShape.position?.z || 0)
            );

            const { meshes, bodies } = createSingleWaterHazardPart({
                ...config, // Inherit type, depth etc.
                shape: 'circle', // Assuming compound parts are circles
                position: subPos, // Calculated world position
                size: { radius: subShape.radius } // Size from subShape
            }, world, group, waterMaterial, visualY, triggerY);

            allMeshes.push(...meshes);
            allBodies.push(...bodies);
        });
    } else {
        // Handle single simple shape
        const { meshes, bodies } = createSingleWaterHazardPart(
            config,
            world,
            group,
            waterMaterial,
            visualY,
            triggerY
        );
        allMeshes.push(...meshes);
        allBodies.push(...bodies);
    }

    return { meshes: allMeshes, bodies: allBodies };
}

/**
 * Creates a single part of a water hazard (one circle/rectangle visual + trigger).
 */
function createSingleWaterHazardPart(config, world, group, material, visualY, triggerY) {
    const meshes = [];
    const bodies = [];

    try {
        let visualGeometry;
        let triggerShape;
        const hazardDepth = config.depth || 0.15;
        const worldPos = new THREE.Vector3(
            config.position?.x || 0,
            0,
            config.position?.z || 0
        );
        const localPos = worldPos.clone().sub(group.position);

        if (config.shape === 'circle') {
            const radius = config.size?.radius || 1;
            visualGeometry = new THREE.CircleGeometry(radius, 32);
            visualGeometry.rotateX(-Math.PI / 2); // Lay flat
            // Trigger shape - Use a thin cylinder
            triggerShape = new CANNON.Cylinder(radius, radius, hazardDepth, 16);
        } else if (config.shape === 'rectangle') {
            const width = config.size?.width || 2;
            const length = config.size?.length || 2;
            visualGeometry = new THREE.PlaneGeometry(width, length);
            visualGeometry.rotateX(-Math.PI / 2);
            // Trigger shape - Use a thin box
            triggerShape = new CANNON.Box(new CANNON.Vec3(width/2, hazardDepth/2, length/2));
        } else {
            console.warn(`[HazardFactory] Unsupported shape for water hazard: ${config.shape}`);
            return { meshes: [], bodies: [] };
        }

        // Create visual mesh
        const visualMesh = new THREE.Mesh(visualGeometry, material);
        visualMesh.position.set(localPos.x, visualY, localPos.z);
        visualMesh.receiveShadow = true; // Water can receive shadows
        group.add(visualMesh);
        meshes.push(visualMesh);

        // Create physics trigger
        const triggerBody = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.STATIC,
            isTrigger: true, // Mark as trigger
            // collisionFilterGroup: 8, // Use same group as bunkers for now?
            // collisionFilterMask: 4  // Detect ball only
        });
        triggerBody.addShape(triggerShape);
        triggerBody.position.set(worldPos.x, triggerY, worldPos.z); // Position center of trigger depth
        triggerBody.userData = { isWaterZone: true }; // Specific userData for water
        world.addBody(triggerBody);
        bodies.push(triggerBody);

        console.log(`[HazardFactory] Created water hazard part: Shape=${config.shape}`);

    } catch (error) {
        console.error('[HazardFactory] Error creating water hazard part:', error);
        // Cleanup partially created elements if necessary
        return { meshes: [], bodies: [] };
    }

    return { meshes, bodies };
} 