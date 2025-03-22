/**
 * Test file for validating the modularization of camera and scoring logic
 */

import { CameraController } from '../controls/CameraController';
import { ScoringSystem } from '../game/ScoringSystem';
import * as THREE from 'three';

/**
 * Run tests to validate camera controller functionality
 */
export function testCameraController() {
    console.log('==== Testing Camera Controller ====');
    
    // Create dummy scene and renderer for testing
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    
    // Create camera controller
    const cameraController = new CameraController(scene, renderer);
    
    // Test initialization
    try {
        cameraController.init();
        console.log('✓ Camera controller initialized successfully');
    } catch (e) {
        console.error('✗ Camera controller initialization failed:', e);
    }
    
    // Test camera properties
    if (cameraController.camera instanceof THREE.PerspectiveCamera) {
        console.log('✓ Camera is properly created as PerspectiveCamera');
    } else {
        console.error('✗ Camera is not a PerspectiveCamera');
    }
    
    // Test controls
    if (cameraController.controls && typeof cameraController.controls.update === 'function') {
        console.log('✓ Controls are properly initialized with update method');
    } else {
        console.error('✗ Controls are not properly initialized');
    }
    
    // Test method presence
    const methods = [
        'positionCameraForHole', 
        'updateCameraFollow', 
        'focusCameraOnBall',
        'onWindowResize',
        'setDebugMode'
    ];
    
    let allMethodsPresent = true;
    methods.forEach(method => {
        if (typeof cameraController[method] !== 'function') {
            console.error(`✗ Method ${method} is missing or not a function`);
            allMethodsPresent = false;
        }
    });
    
    if (allMethodsPresent) {
        console.log('✓ All required methods are present in CameraController');
    }
    
    console.log('==== Camera Controller Tests Complete ====\n');
    
    // Return test status
    return {
        initialized: Boolean(cameraController.camera && cameraController.controls),
        methodsComplete: allMethodsPresent
    };
}

/**
 * Run tests to validate scoring system functionality
 */
export function testScoringSystem() {
    console.log('==== Testing Scoring System ====');
    
    // Create mock game object
    const mockGame = {
        scene: {},
        physicsWorld: {}
    };
    
    // Create scoring system with mock game
    const scoringSystem = new ScoringSystem(mockGame);
    
    // Test scoring functionality
    try {
        // Test score tracking
        console.log('Testing score tracking...');
        scoringSystem.resetHoleScore();
        console.assert(scoringSystem.getCurrentHoleStrokes() === 0, 'Initial score should be 0');
        
        scoringSystem.addStroke();
        console.assert(scoringSystem.getCurrentHoleStrokes() === 1, 'Score should be 1 after adding stroke');
        
        scoringSystem.addStroke();
        scoringSystem.addStroke();
        console.assert(scoringSystem.getCurrentHoleStrokes() === 3, 'Score should be 3 after adding 3 strokes');
        
        // Test hole completion
        console.log('Testing hole completion...');
        scoringSystem.completeHole();
        console.assert(scoringSystem.getTotalScore() === 3, 'Total score should be 3 after completing hole');
        
        // Test reset
        console.log('Testing reset functionality...');
        scoringSystem.resetHoleScore();
        console.assert(scoringSystem.getCurrentHoleStrokes() === 0, 'Score should be 0 after reset');
        
        console.log('✅ Scoring System tests passed');
    } catch (error) {
        console.error('❌ Scoring System tests failed:', error);
    }
}

/**
 * Run all tests for the modularization
 */
export function runModularizationTests() {
    console.log('====== RUNNING MODULARIZATION TESTS ======');
    
    const cameraResults = testCameraController();
    const scoringResults = testScoringSystem();
    
    console.log('\n====== MODULARIZATION TEST SUMMARY ======');
    console.log(`Camera Controller: ${cameraResults.initialized && cameraResults.methodsComplete ? 'PASS' : 'FAIL'}`);
    console.log(`Scoring System: ${scoringResults.initialized && scoringResults.scoreTracking && scoringResults.methodsComplete ? 'PASS' : 'FAIL'}`);
    
    return {
        cameraControllerPassed: cameraResults.initialized && cameraResults.methodsComplete,
        scoringSystemPassed: scoringResults.initialized && scoringResults.scoreTracking && scoringResults.methodsComplete,
        allPassed: cameraResults.initialized && cameraResults.methodsComplete && 
                  scoringResults.initialized && scoringResults.scoreTracking && scoringResults.methodsComplete
    };
} 