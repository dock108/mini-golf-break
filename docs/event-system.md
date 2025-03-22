# Event-Driven Architecture in Mini Golf Break

This document outlines the event-driven architecture implemented in Mini Golf Break to improve scalability, reduce tight coupling between components, and enhance maintainability.

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Event Types](#event-types)
4. [Publisher-Subscriber Pattern](#publisher-subscriber-pattern)
5. [Integration with Game Components](#integration-with-game-components)
6. [Debugging Events](#debugging-events)
7. [Best Practices](#best-practices)
8. [Example Flows](#example-flows)

## Overview

The event system in Mini Golf Break replaces direct method calls between components with a publish-subscribe pattern. This allows components to communicate without having explicit knowledge of each other, reducing tight coupling and improving scalability.

Key benefits of the event-driven architecture:

- **Reduced Coupling**: Components only need to know about events, not other components
- **Improved Testability**: Components can be tested in isolation by simulating events
- **Enhanced Scalability**: New features can subscribe to existing events without modifying core components
- **Better Debugging**: Event flow can be traced and logged for easier troubleshooting
- **Cleaner Code**: Standard communication patterns make the codebase more maintainable

## Core Components

The event system consists of three primary components:

### EventManager

Located at `src/managers/EventManager.js`, this is the central message bus that manages subscriptions and publishes events. Key functionalities include:

- `subscribe(eventType, callback, context)`: Register a callback for a specific event type
- `publish(eventType, data, source)`: Broadcast an event to all subscribers
- `unsubscribe(eventType, callback, context)`: Remove a subscription
- Event history tracking for debugging
- Error handling within event listeners

### EventTypes

Located at `src/events/EventTypes.js`, this is an enumeration of all available event types in the system to ensure consistency in event naming.

### GameEvent

Located at `src/events/GameEvent.js`, this is the base class for all events with standardized properties:

- `type`: The event type from EventTypes
- `data`: Event-specific data
- `source`: The component that published the event
- `timestamp`: When the event was created

## Event Types

Events are categorized by domain to maintain organization as the system grows:

### Ball Events
- `BALL_CREATED`: Fired when a new ball is created
- `BALL_HIT`: Fired when the ball is hit by the player
- `BALL_MOVED`: Fired when the ball changes position
- `BALL_STOPPED`: Fired when the ball comes to rest
- `BALL_RESET`: Fired when the ball is reset after a hazard
- `BALL_IN_HOLE`: Fired when the ball goes in the hole

### Game State Events
- `HOLE_COMPLETED`: Fired when a hole is successfully completed
- `HOLE_STARTED`: Fired when a new hole begins
- `GAME_COMPLETED`: Fired when all holes are completed
- `GAME_STARTED`: Fired when a new game begins
- `STATE_CHANGED`: Fired when a game state value changes

### Hazard Events
- `HAZARD_DETECTED`: Fired when the ball enters any hazard
- `HAZARD_WATER`: Fired specifically for water hazards
- `HAZARD_OUT_OF_BOUNDS`: Fired when the ball goes out of bounds

### Input Events
- `INPUT_ENABLED`: Fired when user input is enabled
- `INPUT_DISABLED`: Fired when user input is disabled

### UI Events
- `UI_ACTION`: General UI action event
- `UI_BUTTON_CLICKED`: Fired when a UI button is clicked

## Publisher-Subscriber Pattern

The event system follows the publisher-subscriber pattern:

1. **Publishers** broadcast events without knowing who will receive them
2. **Subscribers** register interest in specific event types
3. The **EventManager** connects publishers and subscribers

Example of subscribing to an event:

```javascript
// In a component that needs to know when the ball is hit
this.game.eventManager.subscribe(
    EventTypes.BALL_HIT,
    this.handleBallHit,
    this  // 'this' context will be preserved when the callback is called
);

// The handler method
handleBallHit(event) {
    const power = event.get('power');
    const direction = event.get('direction');
    
    // React to the ball being hit
    console.log(`Ball hit with power: ${power}`);
}
```

Example of publishing an event:

```javascript
// In BallManager when the ball is hit
hitBall(direction, power) {
    // ... ball hit logic ...
    
    // Publish the event with relevant data
    this.game.eventManager.publish(
        EventTypes.BALL_HIT,
        {
            direction: direction.clone(),
            power: power,
            position: this.ball.mesh.position.clone()
        },
        this  // 'this' as the source of the event
    );
}
```

## Integration with Game Components

Key components in the game that use the event system:

### BallManager
- **Publishes**: BALL_CREATED, BALL_HIT, BALL_MOVED, BALL_STOPPED, BALL_RESET
- **Subscribes to**: HAZARD_DETECTED

### HazardManager
- **Publishes**: HAZARD_DETECTED, HAZARD_WATER, HAZARD_OUT_OF_BOUNDS
- **Subscribes to**: BALL_MOVED, BALL_STOPPED, BALL_CREATED

### HoleManager
- **Publishes**: HOLE_COMPLETED, HOLE_STARTED, GAME_COMPLETED, BALL_IN_HOLE
- **Subscribes to**: UI_BUTTON_CLICKED

### InputController
- **Publishes**: INPUT_ENABLED, INPUT_DISABLED
- **Subscribes to**: BALL_STOPPED, BALL_IN_HOLE, HOLE_STARTED

### UIManager
- **Publishes**: UI_BUTTON_CLICKED
- **Subscribes to**: HOLE_COMPLETED, HOLE_STARTED, GAME_COMPLETED, BALL_HIT, BALL_IN_HOLE, HAZARD_DETECTED

## Debugging Events

The EventManager includes built-in debugging capabilities:

- Events are logged to the debug console when debug mode is enabled
- The most recent events are kept in an event history that can be inspected
- Each event includes a timestamp and source information for tracing

Debug commands:

```javascript
// Get recent event history
const history = game.eventManager.getEventHistory();
console.log(history);

// Enable/disable event debugging
game.eventManager.debug = true;
```

## Best Practices

When working with the event system, follow these guidelines:

1. **Use Standard Event Types**: Add new events to the EventTypes enum rather than using string literals
2. **Include Relevant Data**: Provide all necessary data in the event to avoid subscribers needing to look up information
3. **Clean Up Subscriptions**: Store unsubscribe functions and call them when components are destroyed
4. **Handle Errors**: Add try-catch blocks in event handlers to prevent one handler failure from blocking others
5. **Use Meaningful Names**: Name event handler methods with the format `handle[EventName]`
6. **Avoid Event Loops**: Be careful not to create circular event dependencies

## Example Flows

### Ball Hit Flow

1. Player drags to hit the ball
2. InputController triggers BallManager.hitBall()
3. BallManager hits the ball and publishes BALL_HIT event
4. AudioManager (subscriber) plays hit sound
5. UIManager (subscriber) updates stroke count display
6. InputController (publisher) publishes INPUT_DISABLED event
7. As ball moves, BallManager publishes BALL_MOVED events
8. HazardManager (subscriber) checks for hazards during movement
9. When ball stops, BallManager publishes BALL_STOPPED event
10. InputController (subscriber) re-enables input
11. HoleManager (subscriber) checks if ball is in hole

### Hazard Detection Flow

1. HazardManager detects ball in water during a BALL_MOVED event
2. HazardManager publishes HAZARD_DETECTED and HAZARD_WATER events
3. UIManager (subscriber) shows water hazard message
4. BallManager (subscriber) adds penalty stroke and resets ball position
5. ScoringSystem (subscriber) updates score with penalty
6. UIManager (subscriber) updates score display 