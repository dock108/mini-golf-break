import { GameEvent } from '../events/GameEvent';

/**
 * EventManager - Central event bus for the game
 * Handles event publishing and subscription to decouple components
 */
export class EventManager {
    constructor(game) {
        this.game = game;
        this.subscribers = new Map();
        this.enabled = true;
        this.eventHistory = [];
        this.historyLimit = 50; // Keep last 50 events for debugging
        this.debug = false;
    }

    /**
     * Initialize the event manager
     */
    init() {
        this.clear();
        this.enabled = true;
        this.debug = this.game.debugManager ? this.game.debugManager.enabled : false;
        return this;
    }

    /**
     * Subscribe to an event
     * @param {string} eventType - Type of event from EventTypes
     * @param {function} callback - Function to call when event is published
     * @param {object} context - The 'this' context for the callback
     * @returns {function} Unsubscribe function
     */
    subscribe(eventType, callback, context = null) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, []);
        }
        
        const subscriber = { callback, context };
        this.subscribers.get(eventType).push(subscriber);
        
        // Return unsubscribe function
        return () => this.unsubscribe(eventType, callback, context);
    }

    /**
     * Subscribe to multiple event types with the same callback
     * @param {string[]} eventTypes - Array of event types to subscribe to
     * @param {function} callback - Function to call when any of these events is published
     * @param {object} context - The 'this' context for the callback
     * @returns {function} Unsubscribe function that removes all subscriptions
     */
    subscribeToMany(eventTypes, callback, context = null) {
        const unsubscribeFunctions = eventTypes.map(type => 
            this.subscribe(type, callback, context)
        );
        
        // Return a function that unsubscribes from all event types
        return () => unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} eventType - Type of event
     * @param {function} callback - The callback function to remove
     * @param {object} context - The context of the callback
     */
    unsubscribe(eventType, callback, context = null) {
        if (!this.subscribers.has(eventType)) return;
        
        const subscribers = this.subscribers.get(eventType);
        const index = subscribers.findIndex(s => 
            s.callback === callback && s.context === context);
        
        if (index !== -1) {
            subscribers.splice(index, 1);
        }
    }
    
    /**
     * Publish an event to all subscribers
     * @param {string} eventType - Type of event
     * @param {object} data - Event data
     * @param {object} source - Source object that triggered the event
     */
    publish(eventType, data = {}, source = null) {
        if (!this.enabled) return;
        
        const event = new GameEvent(eventType, data, source);
        
        // Log event in debug mode
        if (this.debug) {
            this.logEvent(event);
        }
        
        // Store in history
        this.addToHistory(event);
        
        if (!this.subscribers.has(eventType)) return;
        
        this.subscribers.get(eventType).forEach(subscriber => {
            try {
                const { callback, context } = subscriber;
                callback.call(context, event);
            } catch (error) {
                console.error(`Error in event handler for ${eventType}:`, error);
                if (this.game.debugManager) {
                    this.game.debugManager.error(`Event handler error for ${eventType}: ${error.message}`);
                }
            }
        });
    }
    
    /**
     * Log an event in debug mode
     * @param {GameEvent} event - The event to log
     */
    logEvent(event) {
        if (this.game.debugManager) {
            this.game.debugManager.log(`EVENT: ${event.toString()}`);
        }
    }
    
    /**
     * Add an event to the history
     * @param {GameEvent} event - The event to add
     */
    addToHistory(event) {
        this.eventHistory.push(event);
        
        // Trim history if needed
        if (this.eventHistory.length > this.historyLimit) {
            this.eventHistory.shift();
        }
    }
    
    /**
     * Get recent event history
     * @param {number} count - Number of events to return (default all)
     * @returns {GameEvent[]} Recent events
     */
    getEventHistory(count = this.historyLimit) {
        return this.eventHistory.slice(-count);
    }
    
    /**
     * Disable all event publishing (for testing or during scene transitions)
     */
    disable() {
        this.enabled = false;
    }
    
    /**
     * Enable event publishing
     */
    enable() {
        this.enabled = true;
    }
    
    /**
     * Clear all subscribers and history
     */
    clear() {
        this.subscribers.clear();
        this.eventHistory = [];
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        this.clear();
        this.enabled = false;
    }
} 