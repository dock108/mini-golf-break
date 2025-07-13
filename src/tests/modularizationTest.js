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
    // Test continuous stroke counting
    console.log('Testing continuous stroke counting...');
    console.assert(scoringSystem.getTotalStrokes() === 0, 'Initial stroke count should be 0');

    scoringSystem.addStroke();
    console.assert(
      scoringSystem.getTotalStrokes() === 1,
      'Stroke count should be 1 after adding stroke'
    );

    scoringSystem.addStroke();
    scoringSystem.addStroke();
    console.assert(
      scoringSystem.getTotalStrokes() === 3,
      'Stroke count should be 3 after adding 3 strokes'
    );

    // Test hole completion without reset
    console.log('Testing hole completion...');
    scoringSystem.completeHole();
    console.assert(
      scoringSystem.getTotalStrokes() === 3,
      'Total strokes should remain 3 after completing hole'
    );

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
  console.log(
    `Camera Controller: ${cameraResults.initialized && cameraResults.methodsComplete ? 'PASS' : 'FAIL'}`
  );
  console.log(
    `Scoring System: ${scoringResults.initialized && scoringResults.scoreTracking && scoringResults.methodsComplete ? 'PASS' : 'FAIL'}`
  );

  return {
    cameraControllerPassed: cameraResults.initialized && cameraResults.methodsComplete,
    scoringSystemPassed:
      scoringResults.initialized && scoringResults.scoreTracking && scoringResults.methodsComplete,
    allPassed:
      cameraResults.initialized &&
      cameraResults.methodsComplete &&
      scoringResults.initialized &&
      scoringResults.scoreTracking &&
      scoringResults.methodsComplete
  };
}
