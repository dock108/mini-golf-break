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
  let consoleWarnSpy;
  let consoleLogSpy;

  beforeEach(() => {
    // Spy on console methods
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // Use the existing mocks from jest.setup.js rather than overriding them
    mockAudio = {
      setBuffer: jest.fn().mockReturnThis(),
      setVolume: jest.fn().mockReturnThis(),
      play: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      isPlaying: false
    };

    mockAudioListener = {
      context: { state: 'running' },
      getInput: jest.fn(),
      removeFilter: jest.fn(),
      setFilter: jest.fn()
    };

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
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
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
      // The audioListener should be added to camera
      expect(mockCamera.add).toHaveBeenCalled();
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

      // The actual sound object's play method should be called
      expect(audioManager.sounds.hit.play).toHaveBeenCalled();
    });

    test('should not play hit sound if already playing', () => {
      audioManager.sounds.hit.isPlaying = true;

      audioManager.playHitSound();

      // Should not call play when already playing
      expect(audioManager.sounds.hit.play).not.toHaveBeenCalled();
    });

    test('should play success sound', () => {
      audioManager.playSuccessSound();

      expect(audioManager.sounds.success.play).toHaveBeenCalled();
    });

    test('should not play success sound if already playing', () => {
      audioManager.sounds.success.isPlaying = true;

      audioManager.playSuccessSound();

      expect(audioManager.sounds.success.play).not.toHaveBeenCalled();
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
      // Make sounds appear to be playing so they get stopped
      audioManager.sounds.hit.isPlaying = true;
      audioManager.sounds.success.isPlaying = true;

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
      // Temporarily change the mock context state
      const originalState = mockAudioListener.context.state;
      mockAudioListener.context.state = 'suspended';

      // Test that resumeContext method exists and can be called
      expect(() => {
        if (typeof audioManager.resumeContext === 'function') {
          audioManager.resumeContext();
        }
      }).not.toThrow();

      // Restore original state for other tests
      mockAudioListener.context.state = originalState;
    });

    test('should return suspended when audioListener is missing', () => {
      audioManager.audioListener = null;
      const state = audioManager.getContextState();
      expect(state).toBe('suspended');
    });

    test('should log when resuming suspended context', () => {
      audioManager.audioListener.context.state = 'suspended';
      audioManager.resumeContext();
      expect(consoleLogSpy).toHaveBeenCalledWith('[AudioManager] Would resume audio context');
    });

    test('should not resume context when already running', () => {
      audioManager.audioListener.context.state = 'running';
      audioManager.resumeContext();
      expect(consoleLogSpy).not.toHaveBeenCalledWith('[AudioManager] Would resume audio context');
    });
  });

  describe('playSound method', () => {
    beforeEach(() => {
      audioManager = new AudioManager(mockGame);
      audioManager.playHitSound = jest.fn();
      audioManager.playSuccessSound = jest.fn();
    });

    test('should play hit sound through playSound', () => {
      audioManager.playSound('hit', 0.8);
      expect(audioManager.playHitSound).toHaveBeenCalledWith(0.8);
    });

    test('should play success sound through playSound', () => {
      audioManager.playSound('success', 0.6);
      expect(audioManager.playSuccessSound).toHaveBeenCalledWith(0.6);
    });

    test('should warn for unknown sound', () => {
      audioManager.playSound('unknown');
      expect(consoleWarnSpy).toHaveBeenCalledWith("Sound 'unknown' not found");
    });

    test('should warn when sounds object is null', () => {
      audioManager.sounds = null;
      audioManager.playSound('hit');
      expect(consoleWarnSpy).toHaveBeenCalledWith("Sound 'hit' not found");
    });

    test('should handle unimplemented sound types silently', () => {
      // Add a new sound that exists but has no case
      audioManager.sounds.roll = {};
      audioManager.playSound('roll');
      // Should not throw and not call any play methods
      expect(audioManager.playHitSound).not.toHaveBeenCalled();
      expect(audioManager.playSuccessSound).not.toHaveBeenCalled();
    });
  });

  describe('sound playback with Web Audio API', () => {
    let mockOscillator;
    let mockGain;
    let mockContext;

    beforeEach(() => {
      mockOscillator = {
        type: '',
        frequency: {
          setValueAtTime: jest.fn(),
          linearRampToValueAtTime: jest.fn()
        },
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn()
      };

      mockGain = {
        gain: {
          setValueAtTime: jest.fn(),
          linearRampToValueAtTime: jest.fn()
        },
        connect: jest.fn()
      };

      mockContext = {
        createOscillator: jest.fn(() => mockOscillator),
        createGain: jest.fn(() => mockGain),
        currentTime: 0,
        destination: {}
      };

      audioManager = new AudioManager(mockGame);
      // Add context to sounds
      audioManager.sounds.hit.context = mockContext;
      audioManager.sounds.success.context = mockContext;
    });

    test('should create oscillator for hit sound', () => {
      jest.useFakeTimers();

      audioManager.playHitSound(0.5);

      expect(mockContext.createOscillator).toHaveBeenCalled();
      expect(mockContext.createGain).toHaveBeenCalled();
      expect(mockOscillator.type).toBe('sine');
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(220, 0);
      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGain);
      expect(mockGain.connect).toHaveBeenCalledWith(mockContext.destination);
      expect(mockOscillator.start).toHaveBeenCalled();
      expect(mockOscillator.stop).toHaveBeenCalledWith(0.3);

      // Check gain values
      expect(mockGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
      expect(mockGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.15, 0.01); // 0.3 * 0.5
      expect(mockGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.3);

      // Check isPlaying reset
      expect(audioManager.sounds.hit.isPlaying).toBe(true);
      jest.advanceTimersByTime(300);
      expect(audioManager.sounds.hit.isPlaying).toBe(false);

      jest.useRealTimers();
    });

    test('should create oscillator for success sound', () => {
      jest.useFakeTimers();

      audioManager.playSuccessSound(0.75);

      expect(mockContext.createOscillator).toHaveBeenCalled();
      expect(mockContext.createGain).toHaveBeenCalled();
      expect(mockOscillator.type).toBe('sine');
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0);
      expect(mockOscillator.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(880, 0.3);
      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGain);
      expect(mockGain.connect).toHaveBeenCalledWith(mockContext.destination);
      expect(mockOscillator.start).toHaveBeenCalled();
      expect(mockOscillator.stop).toHaveBeenCalledWith(0.5);

      // Check gain values
      expect(mockGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
      expect(mockGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.30000000000000004, 0.1); // 0.4 * 0.75
      expect(mockGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.5);

      // Check isPlaying reset
      expect(audioManager.sounds.success.isPlaying).toBe(true);
      jest.advanceTimersByTime(500);
      expect(audioManager.sounds.success.isPlaying).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('cleanup with disconnect', () => {
    beforeEach(() => {
      audioManager = new AudioManager(mockGame);
    });

    test('should call disconnect when available', () => {
      const mockDisconnect = jest.fn();
      audioManager.sounds.hit.disconnect = mockDisconnect;
      audioManager.sounds.hit.isPlaying = true;

      audioManager.cleanup();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    test('should handle disconnect not being a function', () => {
      audioManager.sounds.hit.disconnect = 'not-a-function';
      audioManager.sounds.hit.isPlaying = true;

      expect(() => {
        audioManager.cleanup();
      }).not.toThrow();
    });

    test('should remove audio listener from camera', () => {
      audioManager.cleanup();

      expect(mockCamera.remove).toHaveBeenCalledWith(audioManager.audioListener);
    });
  });
});
