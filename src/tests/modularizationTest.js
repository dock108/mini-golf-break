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
    
    // Create scoring system
    const scoringSystem = new ScoringSystem();
    
    // Test initialization
    try {
        scoringSystem.init('course', 3);
        console.log('✓ Scoring system initialized successfully in course mode');
        
        if (scoringSystem.holeScores.length === 3) {
            console.log('✓ Hole scores array properly initialized');
        } else {
            console.error('✗ Hole scores array not properly initialized');
        }
        
        // Reset and try practice mode
        scoringSystem.init('practice');
        console.log('✓ Scoring system initialized successfully in practice mode');
    } catch (e) {
        console.error('✗ Scoring system initialization failed:', e);
    }
    
    // Test score incrementation
    const initialScore = scoringSystem.score;
    scoringSystem.addStroke();
    
    if (scoringSystem.score === initialScore + 1) {
        console.log('✓ Score incrementation works correctly');
    } else {
        console.error('✗ Score incrementation failed');
    }
    
    // Test hole completion in course mode
    scoringSystem.init('course', 3);
    scoringSystem.addStroke();
    scoringSystem.addStroke();
    
    // Complete first hole
    const isLastHole = scoringSystem.completeHole();
    
    if (!isLastHole && scoringSystem.holeScores[0] === 2) {
        console.log('✓ Hole completion correctly recorded score');
    } else {
        console.error('✗ Hole completion did not record score correctly');
    }
    
    // Test advancing to next hole
    const advanced = scoringSystem.advanceToNextHole();
    
    if (advanced && scoringSystem.currentHole === 2 && scoringSystem.score === 0) {
        console.log('✓ Advancing to next hole works correctly');
    } else {
        console.error('✗ Advancing to next hole failed');
    }
    
    // Test method presence
    const methods = [
        'addStroke',
        'getCurrentHoleStrokes',
        'resetHoleScore',
        'getTotalScore',
        'completeHole',
        'advanceToNextHole',
        'updateHoleDisplay',
        'updateScoreDisplay'
    ];
    
    let allMethodsPresent = true;
    methods.forEach(method => {
        if (typeof scoringSystem[method] !== 'function') {
            console.error(`✗ Method ${method} is missing or not a function`);
            allMethodsPresent = false;
        }
    });
    
    if (allMethodsPresent) {
        console.log('✓ All required methods are present in ScoringSystem');
    }
    
    console.log('==== Scoring System Tests Complete ====');
    
    // Return test status
    return {
        initialized: Boolean(scoringSystem.score !== undefined && scoringSystem.holeScores),
        scoreTracking: scoringSystem.holeScores[0] === 2,
        methodsComplete: allMethodsPresent
    };
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