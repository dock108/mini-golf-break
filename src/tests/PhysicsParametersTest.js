/**
 * PhysicsParametersTest.js
 * 
 * Tests the consistency of physics parameters across components to ensure
 * they match the documented values in physics-parameters.md.
 */

import { PhysicsWorld } from '../physics/PhysicsWorld.js';

// Mock browser globals needed by Ball.js
if (typeof window === 'undefined') {
    global.window = {
        performance: {
            now: () => Date.now()
        }
    };
}

if (typeof document === 'undefined') {
    global.document = {
        createElement: () => ({
            getContext: () => ({
                fillStyle: '',
                fillRect: () => {},
                beginPath: () => {},
                arc: () => {},
                fill: () => {}
            }),
            width: 512,
            height: 512
        })
    };
}

// Mock THREE.js to avoid browser dependencies
const mockTHREE = {
    Vector3: class Vector3 {
        constructor(x = 0, y = 0, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        copy() { return this; }
        set() { return this; }
    },
    CanvasTexture: class CanvasTexture { },
    Mesh: class Mesh { },
    SphereGeometry: class SphereGeometry { },
    MeshStandardMaterial: class MeshStandardMaterial { },
    PointLight: class PointLight { }
};

// Import Ball after mocking globals
let Ball;
import('../objects/Ball.js').then(module => {
    Ball = module.Ball;
}).catch(err => {
    console.error("Error importing Ball.js:", err);
});

/**
 * Expected parameter values based on physics-parameters.md
 */
const EXPECTED_PARAMETERS = {
    // World settings
    gravity: 9.81,
    timestep: 1/60,
    maxSubSteps: 3,
    solverIterations: 10,
    
    // Sleep parameters
    sleepSpeedLimit: 0.15,
    sleepTimeLimit: 0.2,
    
    // Damping parameters
    linearDamping: 0.6,
    angularDamping: 0.6,
    
    // Material interactions
    groundFriction: 0.8,
    groundRestitution: 0.1
};

/**
 * Test for verifying physics world parameter consistency
 */
export function testPhysicsParameters() {
    console.log("=== Physics Parameters Consistency Test ===");

    // Create test instances
    const physicsWorld = new PhysicsWorld();
    
    // Test world parameters
    let allTestsPassed = true;
    
    console.log("\nTesting World Parameters:");
    allTestsPassed &= testParameter("Gravity", Math.abs(physicsWorld.world.gravity.y), EXPECTED_PARAMETERS.gravity, 0.1);
    allTestsPassed &= testParameter("Timestep", physicsWorld.fixedTimeStep, EXPECTED_PARAMETERS.timestep, 0.001);
    allTestsPassed &= testParameter("Max Sub-Steps", physicsWorld.maxSubSteps, EXPECTED_PARAMETERS.maxSubSteps);
    allTestsPassed &= testParameter("Solver Iterations", physicsWorld.world.solver.iterations, EXPECTED_PARAMETERS.solverIterations);
    
    // Test default sleep parameters
    console.log("\nTesting Default Sleep Parameters:");
    allTestsPassed &= testParameter("Default Sleep Speed Limit", physicsWorld.world.defaultSleepSpeedLimit, EXPECTED_PARAMETERS.sleepSpeedLimit, 0.001);
    allTestsPassed &= testParameter("Default Sleep Time Limit", physicsWorld.world.defaultSleepTimeLimit, EXPECTED_PARAMETERS.sleepTimeLimit, 0.001);
    
    // Test createSphereBody parameters
    console.log("\nTesting createSphereBody Parameters:");
    const testSphereBody = physicsWorld.createSphereBody(1, { x: 0, y: 0, z: 0 });
    allTestsPassed &= testParameter("Sphere Linear Damping", testSphereBody.linearDamping, EXPECTED_PARAMETERS.linearDamping, 0.001);
    allTestsPassed &= testParameter("Sphere Angular Damping", testSphereBody.angularDamping, EXPECTED_PARAMETERS.angularDamping, 0.001);
    allTestsPassed &= testParameter("Sphere Sleep Speed Limit", testSphereBody.sleepSpeedLimit, EXPECTED_PARAMETERS.sleepSpeedLimit, 0.001);
    allTestsPassed &= testParameter("Sphere Sleep Time Limit", testSphereBody.sleepTimeLimit, EXPECTED_PARAMETERS.sleepTimeLimit, 0.001);
    
    // Final result
    if (allTestsPassed) {
        console.log("\n✅ All physics parameters match expected values!");
    } else {
        console.error("\n❌ Some physics parameters do not match expected values. See errors above.");
    }
    
    return allTestsPassed;
}

/**
 * Test helper for parameter validation
 */
function testParameter(name, actual, expected, tolerance = 0) {
    let result = true;
    const pass = tolerance > 0 
        ? Math.abs(actual - expected) <= tolerance
        : actual === expected;
    
    if (pass) {
        console.log(`✅ ${name}: ${actual} (expected: ${expected})`);
    } else {
        console.error(`❌ ${name}: ${actual} (expected: ${expected})`);
        result = false;
    }
    
    return result;
}

// Auto-run if this is the main module
if (typeof process !== 'undefined' && process.argv.includes('PhysicsParametersTest.js')) {
    testPhysicsParameters();
} 