/**
 * EventManagerErrorHandlingTest.js
 * 
 * Tests for validating the enhanced error handling in EventManager
 */

import { EventManager } from '../managers/EventManager.js';
import { EventTypes } from '../events/EventTypes.js';

/**
 * Create a mock game object with a debugManager for testing
 * @returns {Object} Mock game object
 */
function createMockGame() {
    const debugLogs = [];
    const errorLogs = [];
    const warningLogs = [];
    
    return {
        debugManager: {
            enabled: true,
            log: (message, data) => {
                debugLogs.push({ message, data });
            },
            error: (source, message, data, showInUI) => {
                errorLogs.push({ source, message, data, showInUI });
            },
            warn: (source, message, data) => {
                warningLogs.push({ source, message, data });
            },
            // For testing access
            _getLogs: () => debugLogs,
            _getErrors: () => errorLogs,
            _getWarnings: () => warningLogs,
            _clearLogs: () => {
                debugLogs.length = 0;
                errorLogs.length = 0;
                warningLogs.length = 0;
            }
        }
    };
}

/**
 * Test the error handling in the EventManager
 */
export function testEventManagerErrorHandling() {
    console.log("=== EventManager Error Handling Test ===");
    let testsPassed = true;
    
    // Create test instances
    const mockGame = createMockGame();
    const eventManager = new EventManager(mockGame);
    eventManager.init();
    
    console.log("\nTest 1: Basic Error Handling");
    // Clear any previous logs
    mockGame.debugManager._clearLogs();
    
    // Create a subscriber that will throw an error
    const errorSubscriber = () => {
        throw new Error("Test error in subscriber");
    };
    
    // Subscribe to a test event
    eventManager.subscribe(EventTypes.BALL_HIT, errorSubscriber);
    
    // Publish the event, which should trigger the error
    eventManager.publish(EventTypes.BALL_HIT, { power: 0.5 });
    
    // Check that the error was properly logged
    const errors = mockGame.debugManager._getErrors();
    
    if (errors.length === 1) {
        console.log("✅ Error was logged through DebugManager");
    } else {
        console.log(`❌ Error not logged correctly, got ${errors.length} error logs`);
        testsPassed = false;
    }
    
    // Check error details
    const errorDetails = errors[0];
    if (errorDetails.source === 'EventManager.publish') {
        console.log("✅ Error has correct source identifier");
    } else {
        console.log(`❌ Incorrect error source: ${errorDetails.source}`);
        testsPassed = false;
    }
    
    if (errorDetails.message.includes(EventTypes.BALL_HIT)) {
        console.log("✅ Error message includes event type");
    } else {
        console.log(`❌ Error message missing event type: ${errorDetails.message}`);
        testsPassed = false;
    }
    
    if (errorDetails.data && errorDetails.data.eventData && errorDetails.data.eventData.power === 0.5) {
        console.log("✅ Error includes relevant event data");
    } else {
        console.log(`❌ Error missing event data: ${JSON.stringify(errorDetails.data)}`);
        testsPassed = false;
    }
    
    if (errorDetails.showInUI === true) {
        console.log("✅ Critical error properly flagged for UI display");
    } else {
        console.log("❌ Critical error not flagged for UI display");
        testsPassed = false;
    }
    
    console.log("\nTest 2: Error Event Publication");
    // Check that an ERROR_OCCURRED event was published
    let errorEventReceived = false;
    
    // Clear previous events
    eventManager.clear();
    mockGame.debugManager._clearLogs();
    
    // Subscribe to the error event
    eventManager.subscribe(EventTypes.ERROR_OCCURRED, () => {
        errorEventReceived = true;
    });
    
    // Subscribe to an event that will throw an error
    eventManager.subscribe(EventTypes.BALL_MOVED, () => {
        throw new Error("Another test error");
    });
    
    // Publish the event to trigger the error
    eventManager.publish(EventTypes.BALL_MOVED, { position: { x: 1, y: 0, z: 2 } });
    
    if (errorEventReceived) {
        console.log("✅ ERROR_OCCURRED event was published");
    } else {
        console.log("❌ ERROR_OCCURRED event was not published");
        testsPassed = false;
    }
    
    console.log("\nTest 3: Complex Object Data Simplification");
    // Clear previous events
    eventManager.clear();
    mockGame.debugManager._clearLogs();
    
    // Create a complex object
    const complexObject = {
        mesh: { 
            position: { x: 1, y: 2, z: 3 },
            rotation: { x: 0, y: 0, z: 0 }
        },
        materials: [
            { color: 'red' },
            { color: 'blue' }
        ],
        active: true
    };
    
    // Subscribe to an event that will throw an error
    eventManager.subscribe(EventTypes.BALL_RESET, () => {
        throw new Error("Error with complex data");
    });
    
    // Publish the event with complex data
    eventManager.publish(EventTypes.BALL_RESET, complexObject);
    
    // Check that the complex data was simplified
    const complexErrors = mockGame.debugManager._getErrors();
    if (complexErrors.length === 1) {
        const data = complexErrors[0].data.eventData;
        
        if (data.mesh === 'Object<Object>' && data.materials === 'Array(2)' && data.active === true) {
            console.log("✅ Complex object was properly simplified for logging");
        } else {
            console.log(`❌ Complex object not simplified correctly: ${JSON.stringify(data)}`);
            testsPassed = false;
        }
    } else {
        console.log("❌ Error with complex data not logged");
        testsPassed = false;
    }
    
    console.log("\nTest 4: Source Identification");
    // Clear previous events
    eventManager.clear();
    mockGame.debugManager._clearLogs();
    
    class TestSource {
        constructor() {
            this.name = "TestSource";
        }
    }
    
    const testSourceObj = new TestSource();
    
    // Subscribe to an event that will throw an error
    eventManager.subscribe(EventTypes.HAZARD_DETECTED, () => {
        throw new Error("Error with source object");
    });
    
    // Publish the event with a source object
    eventManager.publish(EventTypes.HAZARD_DETECTED, { type: 'water' }, testSourceObj);
    
    // Check source identification
    const sourceErrors = mockGame.debugManager._getErrors();
    if (sourceErrors.length === 1) {
        const source = sourceErrors[0].data.source;
        
        if (source === 'TestSource') {
            console.log("✅ Source object properly identified");
        } else {
            console.log(`❌ Source identification failed: ${source}`);
            testsPassed = false;
        }
    } else {
        console.log("❌ Error with source object not logged");
        testsPassed = false;
    }
    
    // Clean up
    eventManager.cleanup();
    
    // Final result
    if (testsPassed) {
        console.log("\n✅ All EventManager error handling tests passed!");
    } else {
        console.error("\n❌ Some EventManager error handling tests failed. See errors above.");
    }
    
    return testsPassed;
}

// Auto-run if this is the main module
if (typeof process !== 'undefined' && process.argv.includes('EventManagerErrorHandlingTest.js')) {
    testEventManagerErrorHandling();
} 