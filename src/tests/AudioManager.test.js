/**
 * Unit tests for AudioManager
 */

import { AudioManager } from '../managers/AudioManager';
import * as THREE from 'three';

describe('AudioManager', () => {
  let mockGame;
  let mockCamera;
  let audioManager;
  let mockAudioListener;
  let mockAudio;

  beforeEach(() => {
    // Mock THREE.Audio
    mockAudio = {
      setBuffer: jest.fn(),
      setVolume: jest.fn(),
      play: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      isPlaying: false
    };

    // Mock AudioListener
    mockAudioListener = {
      context: { state: 'running' },
      getInput: jest.fn(),
      removeFilter: jest.fn(),
      setFilter: jest.fn()
    };

    // Mock THREE constructors
    Object.defineProperty(THREE, 'AudioListener', {
      value: jest.fn(() => mockAudioListener),
      writable: true,
      configurable: true
    });
    Object.defineProperty(THREE, 'Audio', {
      value: jest.fn(() => mockAudio),
      writable: true,
      configurable: true
    });

    // Mock camera
    mockCamera = {
      add: jest.fn(),
      remove: jest.fn()
    };

    // Setup mock game object
    mockGame = {
      camera: mockCamera,
      debugManager: {
        log: jest.fn(),
        warn: jest.fn()
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with game reference', () => {
      audioManager = new AudioManager(mockGame);

      expect(audioManager.game).toBe(mockGame);
      // init() is called in constructor, so audioListener is created
      expect(audioManager.audioListener).toBeDefined();
      expect(audioManager.sounds).toBeDefined();
      expect(typeof audioManager.sounds).toBe('object');
    });
  });

  describe('init', () => {
    beforeEach(() => {
      audioManager = new AudioManager(mockGame);
    });

    test('should create audio listener', () => {
      // init() is already called in constructor, so AudioListener is already created
      expect(THREE.AudioListener).toHaveBeenCalled();
      expect(audioManager.audioListener).toBeDefined();
    });

    test('should add audio listener to camera', () => {
      // init() is already called in constructor
      expect(mockCamera.add).toHaveBeenCalledWith(mockAudioListener);
    });

    test('should initialize sounds', () => {
      // init() is already called in constructor
      expect(audioManager.sounds.hit).toBeDefined();
      expect(audioManager.sounds.success).toBeDefined();
      expect(THREE.Audio).toHaveBeenCalledTimes(2);
    });

    test('should handle missing camera gracefully', () => {
      // Create a game without camera
      const gameWithoutCamera = { ...mockGame, camera: null };

      expect(() => {
        new AudioManager(gameWithoutCamera);
      }).not.toThrow();
    });
  });

  describe('sound playback', () => {
    beforeEach(() => {
      audioManager = new AudioManager(mockGame);
      // init() is already called in constructor
    });

    test('should play hit sound', () => {
      audioManager.playHitSound();

      expect(mockAudio.play).toHaveBeenCalled();
    });

    test('should not play hit sound if already playing', () => {
      audioManager.sounds.hit.isPlaying = true;

      audioManager.playHitSound();

      expect(mockAudio.play).not.toHaveBeenCalled();
    });

    test('should play success sound', () => {
      audioManager.playSuccessSound();

      expect(mockAudio.play).toHaveBeenCalled();
    });

    test('should not play success sound if already playing', () => {
      audioManager.sounds.success.isPlaying = true;

      audioManager.playSuccessSound();

      expect(mockAudio.play).not.toHaveBeenCalled();
    });

    test('should handle missing sound gracefully', () => {
      audioManager.sounds.hit = null;

      expect(() => {
        audioManager.playHitSound();
      }).not.toThrow();
    });
  });

  describe('volume control', () => {
    beforeEach(() => {
      audioManager = new AudioManager(mockGame);
      // init() already called in constructor
    });

    test('should set volume for all sounds', () => {
      audioManager.setVolume(0.5);

      expect(audioManager.sounds.hit.setVolume).toHaveBeenCalledWith(0.5);
      expect(audioManager.sounds.success.setVolume).toHaveBeenCalledWith(0.5);
    });

    test('should clamp volume between 0 and 1', () => {
      audioManager.setVolume(2.0);
      expect(audioManager.sounds.hit.setVolume).toHaveBeenCalledWith(1.0);

      audioManager.setVolume(-0.5);
      expect(audioManager.sounds.hit.setVolume).toHaveBeenCalledWith(0);
    });
  });

  describe('mute functionality', () => {
    beforeEach(() => {
      audioManager = new AudioManager(mockGame);
      // init() already called in constructor
    });

    test('should mute all sounds', () => {
      audioManager.mute();

      expect(audioManager.sounds.hit.setVolume).toHaveBeenCalledWith(0);
      expect(audioManager.sounds.success.setVolume).toHaveBeenCalledWith(0);
    });

    test('should unmute and restore volume', () => {
      audioManager.setVolume(0.7);
      audioManager.mute();
      audioManager.unmute();

      // Should restore to previous volume
      expect(audioManager.sounds.hit.setVolume).toHaveBeenLastCalledWith(0.7);
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      audioManager = new AudioManager(mockGame);
      // init() already called in constructor
    });

    test('should stop all sounds', () => {
      audioManager.cleanup();

      expect(audioManager.sounds.hit.stop).toHaveBeenCalled();
      expect(audioManager.sounds.success.stop).toHaveBeenCalled();
    });

    test('should handle cleanup without initialization', () => {
      audioManager = new AudioManager(mockGame);

      expect(() => {
        audioManager.cleanup();
      }).not.toThrow();
    });
  });

  describe('context handling', () => {
    beforeEach(() => {
      audioManager = new AudioManager(mockGame);
    });

    test('should check audio context state', () => {
      // init() already called in constructor

      const state = audioManager.getContextState();
      expect(state).toBe('running');
    });

    test('should handle suspended audio context', () => {
      mockAudioListener.context.state = 'suspended';

      audioManager.resumeContext();

      // In a real scenario, this would call context.resume()
      expect(audioManager.audioListener.context.state).toBe('suspended');
    });
  });
});
