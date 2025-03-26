/**
 * Enum for game states
 * @readonly
 * @enum {string}
 */
export const GameState = {
    /** Initial state when game starts */
    INITIALIZING: 'initializing',
    
    /** Player is aiming their shot */
    AIMING: 'aiming',
    
    /** Ball is in motion */
    BALL_IN_MOTION: 'ball_in_motion',
    
    /** Current hole is completed */
    HOLE_COMPLETED: 'hole_completed',
    
    /** Transitioning between holes */
    TRANSITIONING: 'transitioning',
    
    /** Game is completed */
    GAME_COMPLETED: 'game_completed',
    
    /** Game is paused */
    PAUSED: 'paused'
}; 