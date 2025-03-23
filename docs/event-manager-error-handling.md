# EventManager Error Handling

This document outlines the enhanced error handling system in the `EventManager` class for Mini Golf Break.

## Overview

The event system is a critical component for game communication, where failures can lead to unpredictable behavior. Our improved error handling system ensures that all event handler errors are:

1. Clearly reported with rich context
2. Properly logged through the `DebugManager`
3. Displayed to users when critical
4. Propagated appropriately to other systems
5. Never silently ignored

## Error Handling Features

### Context-Rich Error Reporting

When an event handler throws an error, the EventManager captures comprehensive context about the error:

- **Event Type**: The specific event that caused the error
- **Event Data**: A simplified representation of the data that was being processed
- **Source Information**: The source object or component that published the event
- **Error Details**: The full error message and stack trace
- **Subscriber Information**: Context of the handler where the error occurred

### Integration with DebugManager

All errors are reported through the DebugManager system, which provides:

- Severity-appropriate logging
- Error tracking for repeated issues
- UI display capabilities for critical errors
- Consistent formatting with other system errors

Example error message format:
```
[ERROR] EventManager.publish: Error handling event ball:hit in BallController context: Cannot read property 'position' of undefined
```

### Critical Error UI Display

Errors in gameplay-critical event handlers are automatically flagged for UI display, ensuring players are informed when a problem might affect gameplay. Critical events include:

- `BALL_HIT` - When the player strikes the ball
- `HOLE_COMPLETED` - When completing a hole
- `GAME_COMPLETED` - When the game is finished
- `GAME_STARTED` - When the game begins
- `HAZARD_DETECTED` - When hazards like water or out-of-bounds are detected

### Error Propagation

When an event handler error occurs, an `ERROR_OCCURRED` event is automatically published to inform other components about the issue. This allows the system to:

- Recover gracefully from errors
- Log errors in a centralized location
- Trigger error-specific UI notifications
- Collect error analytics

## Implementation Details

### Error Handling in publish() Method

The event handler errors are caught and processed in the `publish()` method:

```javascript
try {
    const { callback, context } = subscriber;
    callback.call(context, event);
} catch (error) {
    // Create context-rich error message with subscriber info
    // Report the error through DebugManager with comprehensive context
    // Publish ERROR_OCCURRED event for system-wide awareness
}
```

### Simplified Data Representation

Complex event data objects are automatically simplified for logging to prevent overwhelming log entries:

- Arrays are represented as `Array(length)`
- Objects are represented as `Object<ConstructorName>`
- Primitive values remain unchanged

This ensures that error logs remain readable while still providing necessary context.

### Fallback Mechanism

If the DebugManager is unavailable (e.g., during initialization), the EventManager falls back to console error logging to ensure errors are never silently swallowed.

### Protection Against Infinite Loops

To prevent infinite error loops, error propagation checks ensure that:

- `ERROR_OCCURRED` events don't trigger additional error events
- Error reporting is simple and less likely to fail

## Testing

The EventManager error handling can be tested using `EventManagerErrorHandlingTest.js`, which validates:

1. Basic error handling and DebugManager integration
2. Error event propagation
3. Data simplification for complex objects
4. Source object identification

Run the test with:
```
node -e "import('./src/tests/EventManagerErrorHandlingTest.js').then(module => module.testEventManagerErrorHandling())"
```

## Best Practices for Event Handlers

1. **Use try-catch blocks** in complex event handlers to handle specific errors
2. **Keep event handlers focused** on a single responsibility to reduce error potential
3. **Validate event data** before processing to prevent runtime errors
4. **Don't publish events from within event handlers** unless absolutely necessary
5. **Log additional context** when errors might be ambiguous

By following these practices and utilizing the enhanced error handling system, developers can create a more robust and maintainable event-driven architecture. 