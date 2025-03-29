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
    
    /** Current hole is completed */
    HOLE_COMPLETED: 'hole_completed',
    
    /** Game is completed */
    GAME_COMPLETED: 'game_completed'
}; 