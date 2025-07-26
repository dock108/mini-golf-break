import { CameraModes } from '../../controls/CameraStateManager';
import { debug } from '../../utils/debug';
import { iOSOptimizations } from '../../utils/iOSOptimizations';

/**
 * UICameraControls - Manages camera control UI elements
 * Provides camera mode toggle and settings interface
 */
export class UICameraControls {
  constructor(game, uiContainer) {
    this.game = game;
    this.uiContainer = uiContainer;

    // UI Elements
    this.controlsContainer = null;
    this.settingsPanel = null;
    this.settingsToggleButton = null;

    // Settings state
    this.settingsVisible = false;
    this.currentSettings = {
      autoFollow: true,
      defaultCameraMode: 'overhead', // overhead, ball_follow, manual
      zoomSensitivity: 1.0,
      panSensitivity: 1.0,
      rotationSensitivity: 1.0,
      tiltSensitivity: 1.0,
      smoothTransitions: true
    };

    // Touch device detection
    this.isTouchDevice = this.detectTouchDevice();
  }

  /**
   * Initialize camera controls UI
   */
  async init() {
    this.createCameraControls();

    // Initialize iOS optimizations
    await iOSOptimizations.init();

    debug.log('[UICameraControls] Initialized');
  }

  /**
   * Create camera control UI elements
   */
  createCameraControls() {
    // Create main controls container
    this.controlsContainer = document.createElement('div');
    this.controlsContainer.id = 'camera-controls';
    this.controlsContainer.className = 'camera-controls-container';

    // Create settings toggle button (only for touch devices)
    if (this.isTouchDevice) {
      this.settingsToggleButton = document.createElement('button');
      this.settingsToggleButton.id = 'camera-settings-toggle';
      this.settingsToggleButton.className = 'camera-settings-btn';
      this.settingsToggleButton.innerHTML = '⚙️';
      this.settingsToggleButton.title = 'Camera Settings';
      this.settingsToggleButton.addEventListener('click', () => this.toggleSettings());
    }

    // Add button to container
    if (this.settingsToggleButton) {
      this.controlsContainer.appendChild(this.settingsToggleButton);
    }

    // Create settings panel
    this.createSettingsPanel();

    // Ensure camera controls can receive touch events using CSS class
    this.controlsContainer.classList.add('interactive-ui');

    // Add to UI container
    this.uiContainer.appendChild(this.controlsContainer);

    // Apply styles
    this.applyStyles();
  }

  /**
   * Create camera settings panel
   */
  createSettingsPanel() {
    this.settingsPanel = document.createElement('div');
    this.settingsPanel.id = 'camera-settings-panel';
    this.settingsPanel.className = 'camera-settings-panel hidden';

    const panelContent = `
      <div class="settings-header">
        <h3>Camera Settings</h3>
        <button class="close-btn" id="settings-close">×</button>
      </div>
      <div class="settings-content">
        <div class="setting-group">
          <label>
            <input type="checkbox" id="auto-follow" ${this.currentSettings.autoFollow ? 'checked' : ''}>
            Auto-follow ball shots
          </label>
        </div>
        <div class="setting-group">
          <label>
            <input type="checkbox" id="smooth-transitions" ${this.currentSettings.smoothTransitions ? 'checked' : ''}>
            Smooth camera transitions
          </label>
        </div>
        <div class="setting-group">
          <label for="default-camera-mode">Default Camera View</label>
          <select id="default-camera-mode" class="camera-mode-select">
            <option value="overhead" ${this.currentSettings.defaultCameraMode === 'overhead' ? 'selected' : ''}>Overhead View</option>
            <option value="ball_follow" ${this.currentSettings.defaultCameraMode === 'ball_follow' ? 'selected' : ''}>Ball Follow View</option>
            <option value="manual" ${this.currentSettings.defaultCameraMode === 'manual' ? 'selected' : ''}>Manual View</option>
          </select>
        </div>
        ${this.isTouchDevice ? this.createTouchSettings() : ''}
        <div class="setting-group">
          <button id="reset-camera-btn" class="reset-btn">Reset Camera View</button>
        </div>
      </div>
    `;

    this.settingsPanel.innerHTML = panelContent;
    // Ensure settings panel can receive touch events using CSS class
    this.settingsPanel.classList.add('interactive-ui');
    this.uiContainer.appendChild(this.settingsPanel);

    // Add event listeners
    this.setupSettingsEventListeners();
  }

  /**
   * Create touch-specific settings UI
   */
  createTouchSettings() {
    return `
      <div class="setting-group">
        <label for="zoom-sensitivity">Zoom Sensitivity</label>
        <input type="range" id="zoom-sensitivity" min="0.1" max="3.0" step="0.1" value="${this.currentSettings.zoomSensitivity}">
        <span class="slider-value">${this.currentSettings.zoomSensitivity}</span>
      </div>
      <div class="setting-group">
        <label for="pan-sensitivity">Pan Sensitivity</label>
        <input type="range" id="pan-sensitivity" min="0.1" max="3.0" step="0.1" value="${this.currentSettings.panSensitivity}">
        <span class="slider-value">${this.currentSettings.panSensitivity}</span>
      </div>
      <div class="setting-group">
        <label for="rotation-sensitivity">Rotation Sensitivity</label>
        <input type="range" id="rotation-sensitivity" min="0.1" max="3.0" step="0.1" value="${this.currentSettings.rotationSensitivity}">
        <span class="slider-value">${this.currentSettings.rotationSensitivity}</span>
      </div>
      <div class="setting-group">
        <label for="tilt-sensitivity">Tilt Sensitivity</label>
        <input type="range" id="tilt-sensitivity" min="0.1" max="3.0" step="0.1" value="${this.currentSettings.tiltSensitivity}">
        <span class="slider-value">${this.currentSettings.tiltSensitivity}</span>
      </div>
    `;
  }

  /**
   * Setup event listeners for settings panel
   */
  setupSettingsEventListeners() {
    // Close button
    const closeBtn = this.settingsPanel.querySelector('#settings-close');
    closeBtn.addEventListener('click', () => this.hideSettings());

    // Auto-follow toggle
    const autoFollowCheckbox = this.settingsPanel.querySelector('#auto-follow');
    autoFollowCheckbox.addEventListener('change', e => {
      this.currentSettings.autoFollow = e.target.checked;
      this.applySettings();
    });

    // Smooth transitions toggle
    const smoothTransitionsCheckbox = this.settingsPanel.querySelector('#smooth-transitions');
    smoothTransitionsCheckbox.addEventListener('change', e => {
      this.currentSettings.smoothTransitions = e.target.checked;
      this.applySettings();
    });

    // Default camera mode selection
    const cameraModeSelect = this.settingsPanel.querySelector('#default-camera-mode');
    cameraModeSelect.addEventListener('change', e => {
      this.currentSettings.defaultCameraMode = e.target.value;
      this.applySettings();
      // Immediately switch to the selected camera mode
      this.switchToCameraMode(e.target.value);
    });

    // Reset camera button
    const resetBtn = this.settingsPanel.querySelector('#reset-camera-btn');
    resetBtn.addEventListener('click', () => this.resetCamera());

    // Touch sensitivity sliders
    if (this.isTouchDevice) {
      this.setupSensitivitySliders();
    }

    // Close panel when clicking outside
    document.addEventListener('click', e => {
      if (
        this.settingsVisible &&
        !this.settingsPanel.contains(e.target) &&
        !this.settingsToggleButton.contains(e.target)
      ) {
        this.hideSettings();
      }
    });
  }

  /**
   * Setup sensitivity slider controls
   */
  setupSensitivitySliders() {
    const sliders = {
      'zoom-sensitivity': 'zoomSensitivity',
      'pan-sensitivity': 'panSensitivity',
      'rotation-sensitivity': 'rotationSensitivity',
      'tilt-sensitivity': 'tiltSensitivity'
    };

    Object.entries(sliders).forEach(([sliderId, settingKey]) => {
      const slider = this.settingsPanel.querySelector(`#${sliderId}`);
      const valueDisplay = slider.nextElementSibling;

      slider.addEventListener('input', e => {
        const value = parseFloat(e.target.value);
        this.currentSettings[settingKey] = value;
        valueDisplay.textContent = value.toFixed(1);
        this.applySettings();
      });
    });
  }

  /**
   * Toggle settings panel visibility
   */
  toggleSettings() {
    if (this.settingsVisible) {
      this.hideSettings();
    } else {
      this.showSettings();
    }
  }

  /**
   * Show settings panel
   */
  showSettings() {
    this.settingsPanel.classList.remove('hidden');
    this.settingsPanel.classList.add('visible');
    this.settingsVisible = true;
    this.triggerHapticFeedback('medium');
  }

  /**
   * Hide settings panel
   */
  hideSettings() {
    this.settingsPanel.classList.remove('visible');
    this.settingsPanel.classList.add('hidden');
    this.settingsVisible = false;
  }

  /**
   * Apply current settings to camera controllers
   */
  applySettings() {
    const cameraController = this.game.cameraController;
    if (!cameraController) {
      return;
    }

    // Apply transition settings
    if (cameraController.setCameraTransitionSettings) {
      cameraController.setCameraTransitionSettings({
        enableSmoothing: this.currentSettings.smoothTransitions
      });
    }

    // Apply touch sensitivity settings
    if (this.isTouchDevice && cameraController.touchController) {
      cameraController.touchController.setSensitivities({
        zoom: this.currentSettings.zoomSensitivity,
        pan: this.currentSettings.panSensitivity,
        rotation: this.currentSettings.rotationSensitivity,
        tilt: this.currentSettings.tiltSensitivity
      });
    }

    debug.log('[UICameraControls] Settings applied:', this.currentSettings);
  }

  /**
   * Switch to specified camera mode
   */
  switchToCameraMode(mode) {
    if (!this.game.cameraController) {
      return;
    }

    // Map our UI values to camera controller modes
    const modeMap = {
      overhead: 'OVERHEAD',
      ball_follow: 'BALL_FOLLOW',
      manual: 'MANUAL'
    };

    const cameraMode = modeMap[mode];
    if (cameraMode && this.game.cameraController.setCameraMode) {
      this.game.cameraController.setCameraMode(cameraMode);
      this.triggerHapticFeedback('selection');
    }
  }

  /**
   * Reset camera to default view
   */
  resetCamera() {
    if (this.game.cameraController) {
      this.game.cameraController.resetCameraView(this.currentSettings.smoothTransitions);
      this.triggerHapticFeedback('success');
    }
  }

  /**
   * Trigger haptic feedback using iOS optimizations
   */
  async triggerHapticFeedback(type = 'light') {
    await iOSOptimizations.triggerHaptic(type);
  }

  /**
   * Detect touch device
   */
  detectTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Apply CSS styles for camera controls
   */
  applyStyles() {
    // Check if styles already exist
    if (document.getElementById('camera-controls-styles')) {
      return;
    }

    const styles = document.createElement('style');
    styles.id = 'camera-controls-styles';
    styles.textContent = `
      .camera-controls-container {
        position: fixed;
        bottom: 20px;
        left: 20px;
        display: flex;
        gap: 10px;
        z-index: 1000;
      }

      .camera-settings-btn {
        width: 50px;
        height: 50px;
        border: none;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      }

      .camera-settings-btn:hover {
        background: rgba(0, 0, 0, 0.9);
        transform: scale(1.1);
      }

      .camera-settings-btn:active {
        transform: scale(0.95);
      }

      .camera-settings-panel {
        position: fixed;
        bottom: 80px;
        left: 20px;
        width: 280px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 1001;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
      }

      .camera-settings-panel.hidden {
        opacity: 0;
        transform: translateY(-20px);
        pointer-events: none;
      }

      .camera-settings-panel.visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }

      .settings-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        background: rgba(0, 0, 0, 0.05);
        border-radius: 10px 10px 0 0;
      }

      .settings-header h3 {
        margin: 0;
        font-size: 18px;
        color: #333;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .close-btn:hover {
        color: #333;
      }

      .settings-content {
        padding: 20px;
      }

      .setting-group {
        margin-bottom: 20px;
      }

      .setting-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #333;
      }

      .setting-group input[type="checkbox"] {
        margin-right: 8px;
      }

      .setting-group input[type="range"] {
        width: 100%;
        margin: 8px 0;
      }

      .slider-value {
        font-weight: bold;
        color: #007acc;
        margin-left: 10px;
      }

      .camera-mode-select {
        width: 100%;
        padding: 8px;
        margin-top: 5px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        font-size: 14px;
        cursor: pointer;
      }

      .camera-mode-select:focus {
        outline: none;
        border-color: #007acc;
        box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
      }

      .reset-btn {
        width: 100%;
        padding: 12px;
        background: #007acc;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.3s ease;
      }

      .reset-btn:hover {
        background: #005aa3;
      }

      /* Mobile optimizations */
      @media (max-width: 768px) {
        .camera-controls-container {
          bottom: 15px;
          left: 15px;
          gap: 8px;
        }

        .camera-settings-btn {
          width: 45px;
          height: 45px;
          font-size: 18px;
        }

        .camera-settings-panel {
          width: calc(100vw - 30px);
          left: 15px;
          bottom: 70px;
          max-width: 280px;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Update camera controls (called from game loop)
   */
  update() {
    // No longer need to update toggle button since it's removed
  }

  /**
   * Dispose of camera controls
   */
  dispose() {
    if (this.controlsContainer && this.controlsContainer.parentNode) {
      this.controlsContainer.parentNode.removeChild(this.controlsContainer);
    }
    if (this.settingsPanel && this.settingsPanel.parentNode) {
      this.settingsPanel.parentNode.removeChild(this.settingsPanel);
    }

    // Remove styles
    const styles = document.getElementById('camera-controls-styles');
    if (styles) {
      styles.remove();
    }

    debug.log('[UICameraControls] Disposed');
  }
}
