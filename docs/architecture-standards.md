# Mini Golf Break Architecture Standards

This document outlines the standard architectural patterns and best practices for the Mini Golf Break game. Following these standards will ensure consistency, maintainability, and reliability across the codebase.

## 1. Initialization Patterns

All components should follow a consistent initialization pattern:

### Standard Component Initialization

```javascript
init() {
    try {
        // Guard against multiple initialization
        if (this.isInitialized) {
            if (this.game.debugManager) {
                this.game.debugManager.warn('ComponentName.init', 'Already initialized');
            }
            return this;
        }
        
        // Initialization logic here...
        
        // Mark as initialized
        this.isInitialized = true;
        
        // Log successful initialization
        if (this.game.debugManager) {
            this.game.debugManager.log('ComponentName initialized');
        }
    } catch (error) {
        // Log initialization errors
        if (this.game.debugManager) {
            this.game.debugManager.error('ComponentName.init', 'Failed to initialize component', error);
        } else {
            console.error('Failed to initialize component:', error);
        }
    }
    
    // Return this for chaining
    return this;
}
```

### Initialization Order

Components should be initialized in the following order:

1. Core systems (DebugManager, EventManager)
2. State and performance systems (StateManager, PerformanceManager)
3. UI systems (UIManager)
4. Rendering systems (VisualEffectsManager)
5. Physics systems (PhysicsManager)
6. Audio systems (AudioManager)
7. Game object managers (HazardManager, HoleManager, BallManager)
8. Input systems (InputController)
9. Game loop (GameLoopManager)

## 2. Event-Based Communication

Components should communicate through events rather than direct method calls where possible.

### Event Publication

```javascript
// Publish an event when state changes
if (this.game.eventManager) {
    this.game.eventManager.publish(
        EventTypes.EVENT_NAME,
        { 
            // Event-specific data
            property: value 
        },
        this // Source of the event
    );
}
```

### Event Subscription

```javascript
// Store subscription functions for cleanup
this.eventSubscriptions = [
    this.game.eventManager.subscribe(
        EventTypes.EVENT_NAME,
        this.handleEventName,
        this
    ),
    // Additional subscriptions...
];
```

### Common Events

These standard events should be used for common operations:

- **Lifecycle Events**: `GAME_STARTED`, `GAME_COMPLETED`, `HOLE_STARTED`, `HOLE_COMPLETED`
- **Ball Events**: `BALL_CREATED`, `BALL_HIT`, `BALL_MOVED`, `BALL_STOPPED`, `BALL_RESET`, `BALL_IN_HOLE`
- **Input Events**: `INPUT_ENABLED`, `INPUT_DISABLED`
- **System Events**: `ERROR_OCCURRED`, `WINDOW_RESIZED`

## 3. Error Handling

All components should use consistent error handling patterns.

### Using DebugManager

```javascript
// For errors
if (this.game.debugManager) {
    this.game.debugManager.error(
        'ComponentName.methodName', 
        'Clear error message', 
        errorObject,
        showInUI // Boolean, true for critical gameplay-affecting errors
    );
} else {
    console.error('Clear error message:', errorObject);
}

// For warnings
if (this.game.debugManager) {
    this.game.debugManager.warn(
        'ComponentName.methodName', 
        'Warning message'
    );
}

// For general logging
if (this.game.debugManager) {
    this.game.debugManager.log('Informational message');
}
```

### Error Severity Levels

Follow these guidelines for error severity:

- **ERROR**: Critical issues that prevent functionality, should be fixed immediately
- **WARNING**: Non-critical issues that might affect gameplay, should be investigated
- **INFO/LOG**: General information about component operation

### Error Context

All error messages should include:

1. The component and method name (`ComponentName.methodName`)
2. A clear description of the error
3. Additional context data when relevant
4. Whether the error should be shown in the UI for critical gameplay issues

## 4. Cleanup Patterns

All components should implement proper cleanup to prevent memory leaks.

### Standard Cleanup Pattern

```javascript
cleanup() {
    try {
        // Remove event listeners
        if (this.eventSubscriptions) {
            this.eventSubscriptions.forEach(unsubscribe => unsubscribe());
            this.eventSubscriptions = [];
        }
        
        // Clean up DOM events
        // ...
        
        // Clean up THREE.js objects
        if (this.someObject) {
            if (this.someObject.geometry) this.someObject.geometry.dispose();
            if (this.someObject.material) {
                if (Array.isArray(this.someObject.material)) {
                    this.someObject.material.forEach(material => material.dispose());
                } else {
                    this.someObject.material.dispose();
                }
            }
            
            if (this.scene && this.someObject.parent === this.scene) {
                this.scene.remove(this.someObject);
            }
            
            this.someObject = null;
        }
        
        // Reset state
        this.isInitialized = false;
        
        // Log successful cleanup
        if (this.game.debugManager) {
            this.game.debugManager.log('ComponentName cleaned up');
        }
    } catch (error) {
        // Log cleanup errors
        if (this.game.debugManager) {
            this.game.debugManager.error('ComponentName.cleanup', 'Error during cleanup', error);
        } else {
            console.error('Error during cleanup:', error);
        }
    }
}
```

### Cleanup Order

Components should be cleaned up in the reverse order of initialization:

1. Game loop (GameLoopManager)
2. Input systems (InputController)
3. Game object managers (BallManager, HoleManager, HazardManager)
4. Physics, Audio, and Visual systems
5. UI systems
6. State and performance systems
7. Core systems (EventManager, DebugManager)

## 5. Null Safety

All components should implement proper null checking:

```javascript
// Before using a potentially null object
if (this.game && this.game.someManager) {
    this.game.someManager.doSomething();
}

// For deep property access, use optional chaining when available:
this.game?.someManager?.doSomething();
```

## 6. Method Return Values

Methods should follow consistent return patterns:

- Initialization methods (`init()`) should return `this` for chaining
- Getter methods should return the requested value or a sensible default
- Methods that can fail should return `null` or `false` on failure, and log the error

## Implementation Examples

See the following files for reference implementations:

- `src/controls/CameraController.js` - Camera management with event handling
- `src/controls/InputController.js` - Input handling with proper error reporting
- `src/managers/BallManager.js` - Object management with event-based communication
- `src/scenes/Game.js` - Main game class with proper initialization sequencing 