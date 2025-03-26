# Error Handling Guidelines for Mini Golf Break

This document outlines the standard error handling patterns to be used throughout the Mini Golf Break codebase to ensure consistent, explicit, and helpful error reporting.

## Core Principles

1. **Explicit Over Silent** - Always make errors visible rather than silently failing
2. **Context-Rich Messages** - Include what failed, why it failed, and relevant parameter values
3. **Appropriate Error Levels** - Use the correct severity level for each issue
4. **Centralized Reporting** - Use the DebugManager for all error handling
5. **User-Facing Notifications** - Show critical errors in the UI when they affect gameplay

## Error Severity Levels

The DebugManager supports four error severity levels:

1. **ERROR** - Critical issues that prevent proper functionality
   - Always logged regardless of debug mode
   - May be shown in the UI for gameplay-affecting issues
   - Example: Missing physics world, null ball when trying to hit

2. **WARNING** - Non-critical issues that may affect gameplay
   - Only logged when debug mode is enabled
   - Never shown in UI
   - Example: Attempting an operation that will be ignored but doesn't break functionality

3. **INFO** - General information logs
   - Only logged when debug mode is enabled
   - Used for tracking normal operations
   - Example: Successful ball hit, object creation

4. **DEBUG** - Detailed debug information
   - Only logged when debug mode is enabled
   - For developer-focused debugging data
   - Example: Frame-by-frame ball velocity

## Standard Error Handling Pattern

```javascript
// Example of proper error handling
function doSomething(param) {
    // Parameter validation with explicit error
    if (!param) {
        if (this.game && this.game.debugManager) {
            this.game.debugManager.error(
                'ClassName.doSomething',  // Source - always include class and method
                'Invalid parameter',      // Concise message
                { received: param },      // Relevant data
                true                      // Show in UI if critical
            );
        } else {
            console.error("ERROR: ClassName.doSomething: Invalid parameter");
        }
        return;
    }
    
    // Try-catch for operations that might throw
    try {
        // Operation code
    } catch (error) {
        if (this.game && this.game.debugManager) {
            this.game.debugManager.error(
                'ClassName.doSomething',
                'Operation failed',
                error,
                true  // If critical
            );
        } else {
            console.error("ERROR: ClassName.doSomething: Operation failed", error);
        }
    }
}
```

## Error Tracking

The DebugManager automatically tracks error frequency to:
- Prevent excessive console spam from repeated identical errors
- Provide error statistics in the debug display
- Help identify recurring issues during development

## UI Error Display

Critical errors that affect gameplay are displayed in a red overlay at the bottom of the screen:
- They auto-dismiss after 10 seconds
- Users can manually dismiss them by clicking the X
- They provide immediate feedback about what went wrong

## Best Practices

1. **Early Returns with Errors** - Validate parameters at the start of methods
2. **Try-Catch in Critical Sections** - Wrap operations that might throw in try-catch blocks
3. **Clear Source Identification** - Always include the class and method name in error messages
4. **Precise Error Messages** - Be specific about what failed and why
5. **Forward Compatibility** - Always check if the DebugManager exists before using it
6. **Cleanup Protection** - Always protect cleanup methods with try-catch

## Migration Strategy

When updating existing code:
1. Replace direct `console.error()` calls with `debugManager.error()`
2. Replace direct `console.log()` error messages with appropriate severity level
3. Add try-catch blocks around critical operations
4. Enhance error messages with context
5. For critical errors, enable UI display

## Examples

### Good Error Handling:
```javascript
createBall() {
    if (!this.scene) {
        this.game.debugManager.error(
            'BallManager.createBall',
            'Cannot create ball without scene',
            null,
            true
        );
        return null;
    }
    
    try {
        return new Ball(this.scene, this.physicsWorld, this.game);
    } catch (error) {
        this.game.debugManager.error(
            'BallManager.createBall',
            'Failed to create ball instance',
            error,
            true
        );
        return null;
    }
}
```

### Poor Error Handling:
```javascript
createBall() {
    if (!this.scene) return null; // Silent failure
    
    return new Ball(this.scene, this.physicsWorld, this.game);
}
``` 