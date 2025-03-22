/**
 * EventTypes - Enumeration of all game events
 * Used to maintain consistency in event naming across the codebase
 */
export const EventTypes = {
    // Ball events
    BALL_CREATED: 'ball:created',
    BALL_HIT: 'ball:hit',
    BALL_MOVED: 'ball:moved',
    BALL_STOPPED: 'ball:stopped',
    BALL_RESET: 'ball:reset',
    BALL_IN_HOLE: 'ball:in_hole',
    
    // Game state events
    HOLE_COMPLETED: 'hole:completed',
    HOLE_STARTED: 'hole:started',
    GAME_COMPLETED: 'game:completed',
    GAME_STARTED: 'game:started',
    STATE_CHANGED: 'state:changed',
    
    // Hazard events
    HAZARD_DETECTED: 'hazard:detected',
    HAZARD_WATER: 'hazard:water',
    HAZARD_OUT_OF_BOUNDS: 'hazard:out_of_bounds',
    
    // Physics events
    PHYSICS_UPDATED: 'physics:updated',
    COLLISION_DETECTED: 'physics:collision',
    
    // UI events
    UI_ACTION: 'ui:action',
    UI_BUTTON_CLICKED: 'ui:button_clicked',
    
    // Input events
    INPUT_ENABLED: 'input:enabled',
    INPUT_DISABLED: 'input:disabled',
    
    // Audio events
    AUDIO_PLAY: 'audio:play',
    
    // Visual effects events
    EFFECT_STARTED: 'effect:started',
    EFFECT_COMPLETED: 'effect:completed',
    
    // System events
    WINDOW_RESIZED: 'system:window_resized',
    ERROR_OCCURRED: 'system:error'
}; 