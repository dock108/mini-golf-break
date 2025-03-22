/**
 * GameEvent - Base class for all game events
 * Provides a consistent structure for events throughout the system
 */
export class GameEvent {
    /**
     * Create a new game event
     * @param {string} type - The event type from EventTypes
     * @param {object} data - Event data specific to this event
     * @param {object} source - The source object that generated the event
     */
    constructor(type, data = {}, source = null) {
        this.type = type;
        this.data = data;
        this.source = source;
        this.timestamp = Date.now();
    }

    /**
     * Get a value from the event data
     * @param {string} key - The data property to retrieve
     * @param {*} defaultValue - Default value if property doesn't exist
     * @returns {*} The value or defaultValue
     */
    get(key, defaultValue = null) {
        return this.data.hasOwnProperty(key) ? this.data[key] : defaultValue;
    }

    /**
     * Create a string representation of the event
     * @returns {string} String representation
     */
    toString() {
        return `GameEvent[${this.type}]: ${JSON.stringify(this.data)}`;
    }
} 