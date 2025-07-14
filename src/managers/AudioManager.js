import * as THREE from 'three';

/**
 * AudioManager - Centralizes audio functionality for the entire game
 */
export class AudioManager {
  constructor(game) {
    this.game = game;
    this.audioListener = null;
    this.sounds = {
      hit: null,
      success: null
    };

    // Initialize audio system
    this.init();
  }

  /**
   * Initialize the audio system
   */
  init() {
    // Create audio listener
    this.audioListener = new THREE.AudioListener();

    // Add listener to camera if available
    if (this.game && this.game.camera) {
      this.game.camera.add(this.audioListener);
    }

    // Create sounds
    this.createSounds();
  }

  /**
   * Create sound objects
   */
  createSounds() {
    // Create hit sound
    this.sounds.hit = new THREE.Audio(this.audioListener);
    this.sounds.hit.setVolume(0.5);

    // Create success sound
    this.sounds.success = new THREE.Audio(this.audioListener);
    this.sounds.success.setVolume(0.7);

    // Create the actual sound sources
    // this.createHitSound();
    // this.createSuccessSound();
  }

  /**
   * Play a sound effect
   * @param {string} soundName - Name of the sound to play ('hit', 'roll', 'success')
   * @param {number} volume - Optional volume (0.0 to 1.0)
   */
  playSound(soundName, volume = 1.0) {
    if (!this.sounds || !this.sounds[soundName]) {
      console.warn(`Sound '${soundName}' not found`);
      return;
    }

    // Handle different sound types
    switch (soundName) {
      case 'hit':
        this.playHitSound(volume);
        break;

      case 'success':
        this.playSuccessSound(volume);
        break;

      // Removed default case that logged warnings for unimplemented sounds
      // default:
      //     // Just log a warning for unimplemented sounds
      //     console.warn(`Sound type '${soundName}' not implemented`);
    }
  }

  /**
   * Play the hit sound
   */
  playHitSound(volume = 1.0) {
    if (!this.sounds.hit || !this.sounds.hit.context) {
      return;
    }

    // Create new oscillator each time for hit sound
    const oscillator = this.sounds.hit.context.createOscillator();
    const gain = this.sounds.hit.context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(220, this.sounds.hit.context.currentTime);

    gain.gain.setValueAtTime(0, this.sounds.hit.context.currentTime);
    gain.gain.linearRampToValueAtTime(0.3 * volume, this.sounds.hit.context.currentTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, this.sounds.hit.context.currentTime + 0.3);

    oscillator.connect(gain);
    gain.connect(this.sounds.hit.context.destination);

    oscillator.start();
    oscillator.stop(this.sounds.hit.context.currentTime + 0.3);
  }

  /**
   * Play the success sound
   */
  playSuccessSound(volume = 1.0) {
    if (!this.sounds.success || !this.sounds.success.context) {
      return;
    }

    // Create new oscillator each time for success sound
    const oscillator = this.sounds.success.context.createOscillator();
    const gain = this.sounds.success.context.createGain();

    oscillator.type = 'sine';

    // Rising tone for success
    oscillator.frequency.setValueAtTime(440, this.sounds.success.context.currentTime);
    oscillator.frequency.linearRampToValueAtTime(
      880,
      this.sounds.success.context.currentTime + 0.3
    );

    gain.gain.setValueAtTime(0, this.sounds.success.context.currentTime);
    gain.gain.linearRampToValueAtTime(0.4 * volume, this.sounds.success.context.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, this.sounds.success.context.currentTime + 0.5);

    oscillator.connect(gain);
    gain.connect(this.sounds.success.context.destination);

    oscillator.start();
    oscillator.stop(this.sounds.success.context.currentTime + 0.5);
  }

  /**
   * Get the current audio context state
   * @returns {string} The audio context state
   */
  getContextState() {
    if (this.audioListener && this.audioListener.context) {
      return this.audioListener.context.state;
    }
    return 'suspended';
  }

  /**
   * Resume the audio context if it's suspended
   */
  resumeContext() {
    if (
      this.audioListener &&
      this.audioListener.context &&
      this.audioListener.context.state === 'suspended'
    ) {
      // In a real implementation, we would call context.resume()
      // For now, just log the action
      console.log('[AudioManager] Would resume audio context');
    }
  }

  /**
   * Clean up audio resources
   */
  cleanup() {
    // Stop and dispose of all sounds
    for (const soundName in this.sounds) {
      const sound = this.sounds[soundName];
      if (sound) {
        if (sound.isPlaying) {
          sound.stop();
        }
        sound.disconnect();
      }
    }

    // Remove listener from camera
    if (this.audioListener && this.game && this.game.camera) {
      this.game.camera.remove(this.audioListener);
    }
  }
}
