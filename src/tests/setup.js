// Jest setup file for Mini Golf Break tests
import '@testing-library/jest-dom';

// Mock Three.js global objects for testing
global.THREE = {
  Scene: jest.fn(() => {
    const scene = {
      children: [],
      add: jest.fn(function (object) {
        if (object && !this.children.includes(object)) {
          this.children.push(object);
        }
      }),
      remove: jest.fn(function (object) {
        const index = this.children.indexOf(object);
        if (index > -1) {
          this.children.splice(index, 1);
        }
      }),
      traverse: jest.fn()
    };
    return scene;
  }),
  WebGLRenderer: jest.fn(() => {
    const eventListeners = new Map();
    return {
      setSize: jest.fn(),
      render: jest.fn(),
      dispose: jest.fn(),
      domElement: {
        addEventListener: jest.fn((event, handler, options) => {
          if (!eventListeners.has(event)) {
            eventListeners.set(event, []);
          }
          eventListeners.get(event).push(handler);
        }),
        removeEventListener: jest.fn((event, handler) => {
          if (eventListeners.has(event)) {
            const handlers = eventListeners.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
              handlers.splice(index, 1);
            }
          }
        }),
        dispatchEvent: jest.fn(event => {
          // Actually trigger the event handlers
          const handlers = eventListeners.get(event.type) || [];
          handlers.forEach(handler => {
            try {
              handler(event);
            } catch (error) {
              console.error(`Error in event handler for ${event.type}:`, error);
            }
          });
          return true;
        }),
        style: {}
      }
    };
  }),
  PerspectiveCamera: jest.fn(),
  Vector3: jest.fn(function (x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;

    // Define all methods on the instance
    this.copy = jest.fn();
    this.set = jest.fn();
    this.setY = jest.fn(function (newY) {
      this.y = newY;
      return this;
    });
    this.toArray = jest.fn(() => [this.x, this.y, this.z]);
    this.distanceTo = jest.fn(() => 5);
    this.normalize = jest.fn(() => this);

    // Clone method that ensures cloned objects also have all methods
    this.clone = jest.fn(() => {
      // For now, create a simple object with all the same methods and properties
      const cloned = {
        x: this.x,
        y: this.y,
        z: this.z,
        copy: jest.fn(),
        set: jest.fn(),
        setY: jest.fn(function (newY) {
          cloned.y = newY;
          return cloned;
        }),
        toArray: jest.fn(() => [cloned.x, cloned.y, cloned.z]),
        distanceTo: jest.fn(() => 5),
        normalize: jest.fn(() => cloned),
        clone: jest.fn(() => {
          // Recursive clone
          return {
            x: cloned.x,
            y: cloned.y,
            z: cloned.z,
            setY: jest.fn(function (newY) {
              this.y = newY;
              return this;
            }),
            clone: jest.fn()
          };
        })
      };
      return cloned;
    });
  }),
  Euler: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
  Mesh: jest.fn(() => {
    const mesh = {
      position: {
        x: 0,
        y: 0,
        z: 0,
        copy: jest.fn(function (other) {
          if (other) {
            this.x = other.x || 0;
            this.y = other.y || 0;
            this.z = other.z || 0;
          }
        }),
        distanceTo: jest.fn(() => 5),
        set: jest.fn(function (x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        }),
        clone: jest.fn(function () {
          return { x: this.x, y: this.y, z: this.z };
        })
      },
      rotation: { x: 0, y: 0, z: 0 },
      quaternion: {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
        copy: jest.fn(function (other) {
          if (other) {
            mesh.quaternion.x = other.x || 0;
            mesh.quaternion.y = other.y || 0;
            mesh.quaternion.z = other.z || 0;
            mesh.quaternion.w = other.w || 1;
          }
        })
      },
      castShadow: false,
      receiveShadow: false
    };
    return mesh;
  }),
  Group: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    position: { x: 0, y: 0, z: 0, copy: jest.fn() },
    name: '',
    userData: {},
    children: []
  })),
  SphereGeometry: jest.fn(),
  CircleGeometry: jest.fn(),
  CylinderGeometry: jest.fn(),
  RingGeometry: jest.fn(),
  PlaneGeometry: jest.fn(),
  BoxGeometry: jest.fn(),
  MeshStandardMaterial: jest.fn(() => ({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.2
  })),
  MeshBasicMaterial: jest.fn(() => ({
    color: 0xffffff
  })),
  CanvasTexture: jest.fn(),
  PointLight: jest.fn(() => ({
    position: { x: 0, y: 0, z: 0, copy: jest.fn() }
  })),
  AudioListener: jest.fn(() => ({
    context: { state: 'running' },
    getInput: jest.fn(),
    removeFilter: jest.fn(),
    setFilter: jest.fn()
  })),
  Audio: jest.fn(() => ({
    setBuffer: jest.fn(),
    setVolume: jest.fn(),
    play: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    disconnect: jest.fn(),
    isPlaying: false
  })),
  Box3: jest.fn(() => ({
    min: { x: 0, y: 0, z: 0 },
    max: { x: 0, y: 0, z: 0 },
    expandByPoint: jest.fn()
  }))
};

// Mock Cannon-es physics for testing
global.CANNON = {
  World: jest.fn(() => {
    const world = {
      add: jest.fn(),
      remove: jest.fn(),
      contactmaterials: [], // Array with map method for contact materials logging
      addContactMaterial: jest.fn(),
      removeContactMaterial: jest.fn(),
      addBody: jest.fn(body => {
        world.bodies.push(body);
      }),
      step: jest.fn(dt => {
        // Simple physics simulation for tests
        world.bodies.forEach(body => {
          if (body.velocity && body.position) {
            const prevPos = { x: body.position.x, y: body.position.y, z: body.position.z };
            // Update position based on velocity
            body.position.x += body.velocity.x * (dt || 1 / 60);
            body.position.y += body.velocity.y * (dt || 1 / 60);
            body.position.z += body.velocity.z * (dt || 1 / 60);

            // Apply simple damping
            const damping = body.linearDamping || 0.01;
            body.velocity.x *= 1 - damping;
            body.velocity.y *= 1 - damping;
            body.velocity.z *= 1 - damping;
          }
        });
      }),
      removeBody: jest.fn(body => {
        const index = world.bodies.indexOf(body);
        if (index > -1) {
          world.bodies.splice(index, 1);
        }
      }),
      gravity: { set: jest.fn() },
      solver: {
        iterations: 30,
        tolerance: 0.0001,
        type: 1,
        equations: [],
        equationSorter: null
      },
      broadphase: null,
      allowSleep: true,
      defaultSleepSpeedLimit: 0.15,
      defaultSleepTimeLimit: 0.2,
      defaultContactMaterial: {
        friction: 0.8,
        restitution: 0.1,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 4,
        frictionEquationStiffness: 1e8,
        frictionEquationRelaxation: 3
      },
      bodies: [],
      constraints: [],
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    return world;
  }),
  Body: jest.fn(() => {
    const body = {
      position: {
        x: 0,
        y: 0,
        z: 0,
        set: jest.fn(function (x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        })
      },
      velocity: {
        x: 0,
        y: 0,
        z: 0,
        set: jest.fn(function (x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        })
      },
      angularVelocity: { x: 0, y: 0, z: 0, set: jest.fn() },
      material: null,
      addEventListener: jest.fn(),
      quaternion: {
        setFromAxisAngle: jest.fn(),
        x: 0,
        y: 0,
        z: 0,
        w: 1,
        set: jest.fn(),
        copy: jest.fn(),
        normalize: jest.fn()
      },
      addShape: jest.fn(),
      userData: {},
      wakeUp: jest.fn(),
      applyImpulse: jest.fn(function (force, point) {
        // Simple impulse application for tests
        if (force && body.velocity) {
          body.velocity.x += force.x || 0;
          body.velocity.y += force.y || 0;
          body.velocity.z += force.z || 0;
        }
      }),
      linearDamping: 0.01
    };
    return body;
  }),
  Material: jest.fn(),
  ContactMaterial: jest.fn(),
  Vec3: jest.fn(function (x = 0, y = 0, z = 0) {
    return { x, y, z };
  }),
  Sphere: jest.fn(),
  Box: jest.fn(),
  Cylinder: jest.fn(),
  Plane: jest.fn(),
  SAPBroadphase: jest.fn(() => ({
    type: 'SAPBroadphase',
    world: null
  }))
};

// Mock window.AudioContext
global.window = global.window || {};
global.window.AudioContext = jest.fn(() => ({
  createGain: jest.fn(() => ({
    gain: { value: 1 },
    connect: jest.fn()
  })),
  createBufferSource: jest.fn(() => ({
    buffer: null,
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn()
  })),
  decodeAudioData: jest.fn((buffer, success) => {
    success({});
  }),
  destination: {},
  state: 'running',
  currentTime: 0
}));

// Mock DOM methods that might be used
global.document.createElement = jest.fn(elementType => {
  // Store event listeners for this element
  const eventListeners = new Map();

  const element = {
    style: {
      position: undefined,
      top: undefined,
      left: undefined,
      width: undefined,
      height: undefined,
      overflow: undefined,
      opacity: undefined,
      visibility: undefined
    },
    addEventListener: jest.fn((event, handler, options) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, []);
      }
      eventListeners.get(event).push(handler);
    }),
    removeEventListener: jest.fn((event, handler) => {
      if (eventListeners.has(event)) {
        const handlers = eventListeners.get(event);
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }),
    appendChild: jest.fn(function (child) {
      if (!this.children) {
        this.children = [];
      }
      this.children.push(child);
      if (child) {
        child.parentNode = this;
      }
      return child;
    }),
    insertBefore: jest.fn(function (newNode, referenceNode) {
      if (!this.children) {
        this.children = [];
      }
      const index = referenceNode ? this.children.indexOf(referenceNode) : this.children.length;
      if (index === -1) {
        // If reference node not found, append at end
        this.children.push(newNode);
      } else {
        this.children.splice(index, 0, newNode);
      }
      if (newNode) {
        newNode.parentNode = this;
      }
      return newNode;
    }),
    removeChild: jest.fn(function (child) {
      if (!this.children) {
        this.children = [];
      }
      const index = this.children.indexOf(child);
      if (index > -1) {
        this.children.splice(index, 1);
      }
      if (child) {
        child.parentNode = null;
      }
      return child;
    }),
    remove: jest.fn(function () {
      if (this.parentNode && this.parentNode.removeChild) {
        this.parentNode.removeChild(this);
      }
      // Remove from tracked elements if it has an id
      if (this.id && global.document._elements && global.document._elements[this.id] === this) {
        delete global.document._elements[this.id];
      }
    }),
    textContent: '',
    id: '',
    children: [],
    parentNode: null,
    get childNodes() {
      return this.children || [];
    },
    innerHTML: '',
    setAttribute: jest.fn(function (name, value) {
      if (name === 'id') {
        // Remove old id tracking
        if (this.id && global.document._elements[this.id] === this) {
          delete global.document._elements[this.id];
        }
        this.id = value;
        // Track new id
        if (value) {
          global.document._elements[value] = this;
        }
      }
      this[name] = value;
    }),
    getAttribute: jest.fn(function (name) {
      return this[name];
    }),
    removeAttribute: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(() => false),
      toggle: jest.fn()
    },
    // Add click method for DOM tests that triggers event listeners
    click: jest.fn(function () {
      // Trigger all click event listeners
      const handlers = eventListeners.get('click') || [];
      handlers.forEach(handler => {
        try {
          handler.call(this, { type: 'click', target: this });
        } catch (error) {
          console.error('Error in click handler:', error);
        }
      });
    }),
    // Add contains method for DOM hierarchy checks
    contains: jest.fn(function (child) {
      return this.children && this.children.includes(child);
    }),
    // Add tagName property
    tagName: elementType ? elementType.toUpperCase() : 'DIV',
    // Add dispatchEvent for renderer.domElement
    dispatchEvent: jest.fn(function (event) {
      // Trigger event listeners for the event type
      const handlers = eventListeners.get(event.type) || [];
      handlers.forEach(handler => {
        try {
          handler.call(this, event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      });
      return true;
    }),
    // Add firstChild property getter
    get firstChild() {
      return this.children && this.children.length > 0 ? this.children[0] : null;
    },
    // Add querySelector for DOM queries
    querySelector: jest.fn(function (selector) {
      if (!this.children) {
        return null;
      }
      // Simple class selector support
      if (selector.startsWith('.')) {
        const className = selector.substring(1);
        for (const child of this.children) {
          if (child.classList && child.classList.contains(className)) {
            return child;
          }
        }
      }
      return null;
    })
  };

  // Add property descriptor for innerHTML
  Object.defineProperty(element, 'innerHTML', {
    get() {
      return this._innerHTML || '';
    },
    set(value) {
      this._innerHTML = value;
      // Clear children when innerHTML is set
      if (value === '') {
        this.children = [];
      }
    }
  });

  // Override classList.contains to actually check
  element.classList._classes = [];
  element.classList.add = jest.fn(function (className) {
    if (!this._classes.includes(className)) {
      this._classes.push(className);
    }
  });
  element.classList.contains = jest.fn(function (className) {
    return this._classes.includes(className);
  });

  // Add id property with tracking
  Object.defineProperty(element, 'id', {
    get() {
      return this._id || '';
    },
    set(value) {
      // Remove old id tracking
      if (this._id && global.document._elements[this._id] === this) {
        delete global.document._elements[this._id];
      }
      this._id = value;
      // Track new id
      if (value) {
        global.document._elements[value] = this;
      }
    }
  });

  // Add style.cssText property
  Object.defineProperty(element.style, 'cssText', {
    get: jest.fn(() => ''),
    set: jest.fn(),
    enumerable: true,
    configurable: true
  });

  // Mock canvas-specific methods
  if (elementType === 'canvas') {
    element.getContext = jest.fn(() => ({
      fillStyle: '',
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      createImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4)
      })),
      putImageData: jest.fn()
    }));
    element.width = 512;
    element.height = 512;
  }

  return element;
});

// Track DOM elements for getElementById
global.document._elements = {};

// Mock additional document methods
global.document.getElementById = jest.fn(id => {
  // Return element from tracked elements or null
  return global.document._elements[id] || null;
});

global.document.querySelector = jest.fn(() => {
  // Return a mock element for any selector
  return global.document.createElement('div');
});

global.document.querySelectorAll = jest.fn(() => {
  // Return an empty array for any selector
  return [];
});

// Enhance existing document.body with missing methods
if (global.document.body) {
  // Use internal property to track children since children is read-only
  global.document.body._children = [];

  // Add getter for children property
  Object.defineProperty(global.document.body, 'children', {
    get() {
      return this._children || [];
    }
  });

  global.document.body.appendChild = jest.fn(function (child) {
    if (!this._children) {
      this._children = [];
    }
    this._children.push(child);
    if (child) {
      child.parentNode = this;
    }
    // Track element by id if it has one
    if (child.id) {
      global.document._elements[child.id] = child;
    }
    return child;
  });

  global.document.body.insertBefore = jest.fn(function (newNode, referenceNode) {
    if (!this._children) {
      this._children = [];
    }
    const index = referenceNode ? this._children.indexOf(referenceNode) : this._children.length;
    if (index === -1) {
      // If reference node not found, append at end
      this._children.push(newNode);
    } else {
      this._children.splice(index, 0, newNode);
    }
    if (newNode) {
      newNode.parentNode = this;
      // Track element by id if it has one
      if (newNode.id) {
        global.document._elements[newNode.id] = newNode;
      }
    }
    return newNode;
  });

  global.document.body.removeChild = jest.fn(function (child) {
    if (!this._children) {
      this._children = [];
    }
    const index = this._children.indexOf(child);
    if (index > -1) {
      this._children.splice(index, 1);
    }
    if (child) {
      child.parentNode = null;
      // Remove from tracked elements
      if (child.id && global.document._elements[child.id] === child) {
        delete global.document._elements[child.id];
      }
    }
    return child;
  });

  global.document.body.contains = jest.fn(function (element) {
    return this._children && this._children.includes(element);
  });

  Object.defineProperty(global.document.body, 'firstChild', {
    get() {
      return this._children && this._children.length > 0 ? this._children[0] : null;
    }
  });
}

// Mock window performance
global.performance = {
  now: jest.fn(() => Date.now())
};

// Create EventManager mock that actually publishes events
jest.mock('../managers/EventManager', () => {
  return {
    EventManager: jest.fn(function (game) {
      this.game = game;
      this.subscribers = new Map();
      this.enabled = true;

      this.init = jest.fn(() => {
        this.enabled = true;
        return this;
      });

      this.subscribe = jest.fn((eventType, callback, context = null) => {
        if (!this.subscribers.has(eventType)) {
          this.subscribers.set(eventType, []);
        }
        const subscriber = { callback, context };
        this.subscribers.get(eventType).push(subscriber);
        return () => this.unsubscribe(eventType, callback, context);
      });

      this.publish = jest.fn((eventType, data = {}) => {
        if (!this.enabled) {
          return;
        }

        const subscribers = this.subscribers.get(eventType) || [];
        subscribers.forEach(({ callback, context }) => {
          try {
            // Pass data directly as it's what the handlers expect
            callback.call(context, data);
          } catch (error) {
            console.error(`Error in event handler for ${eventType}:`, error);
          }
        });
      });

      this.unsubscribe = jest.fn((eventType, callback, context) => {
        const subscribers = this.subscribers.get(eventType);
        if (!subscribers) {
          return;
        }

        const index = subscribers.findIndex(
          sub => sub.callback === callback && sub.context === context
        );
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      });

      this.cleanup = jest.fn(() => {
        this.subscribers.clear();
        this.enabled = false;
      });
    })
  };
});

// Mock StateManager to publish events
jest.mock('../managers/StateManager', () => {
  const { GameState } = require('../states/GameState');

  return {
    StateManager: jest.fn(function (game) {
      this.game = game;
      this.state = {
        currentGameState: GameState.INITIALIZING,
        previousGameState: null,
        ballInMotion: false,
        holeCompleted: false,
        resetBall: false
      };

      this.setGameState = jest.fn(newState => {
        const previousState = this.state.currentGameState;
        this.state.previousGameState = previousState;
        this.state.currentGameState = newState;

        // Publish state change event
        if (this.game && this.game.eventManager) {
          this.game.eventManager.publish('STATE_CHANGED', {
            previousState,
            newState
          });
        }
      });

      this.getGameState = jest.fn(() => this.state.currentGameState);
      this.setBallInMotion = jest.fn(inMotion => {
        this.state.ballInMotion = inMotion;
      });
      this.isBallInMotion = jest.fn(() => this.state.ballInMotion);
      this.setHoleCompleted = jest.fn(completed => {
        this.state.holeCompleted = completed;
      });
      this.isHoleCompleted = jest.fn(() => this.state.holeCompleted);
      this.setResetBall = jest.fn(reset => {
        this.state.resetBall = reset;
      });
      this.shouldResetBall = jest.fn(() => this.state.resetBall);
      this.clearResetBall = jest.fn(() => {
        this.state.resetBall = false;
      });
      this.resetState = jest.fn(() => {
        this.state = {
          currentGameState: GameState.INITIALIZING,
          previousGameState: null,
          ballInMotion: false,
          holeCompleted: false,
          resetBall: false
        };
      });
    })
  };
});

// Mock UIManager to handle state-based UI updates
jest.mock('../managers/UIManager', () => {
  const { GameState } = require('../states/GameState');

  return {
    UIManager: jest.fn(function (game) {
      this.game = game;
      this.renderer = null;

      // Define methods first so they exist when init is called
      this.showMessage = jest.fn();
      this.hideMessage = jest.fn();

      this.init = jest.fn(() => {
        // Create main container
        this.createMainContainer();

        // Create UI elements
        this.createMessageUI();
        this.createPowerIndicatorUI();

        // Initialize overlays
        this.scoreOverlay = {
          init: jest.fn(),
          updateHoleInfo: jest.fn(),
          updateScorecard: jest.fn(),
          updateScore: jest.fn(),
          updateStrokes: jest.fn(),
          showFinalScorecard: jest.fn(),
          hideFinalScorecard: jest.fn(),
          cleanup: jest.fn()
        };
        this.scoreOverlay.init();

        this.debugOverlay = {
          init: jest.fn(),
          updateDebugDisplay: jest.fn(),
          cleanup: jest.fn()
        };
        this.debugOverlay.init();

        // Subscribe to state changes
        const self = this; // Capture the correct 'this' context
        if (this.game && this.game.eventManager) {
          this.game.eventManager.subscribe('STATE_CHANGED', data => {
            // data is passed directly, not wrapped in event object
            const { newState } = data;
            switch (newState) {
              case GameState.AIMING:
                self.showMessage('Aim and click to shoot');
                break;
              case GameState.PLAYING:
                self.hideMessage();
                break;
              case GameState.HOLE_COMPLETED:
                self.showMessage('Hole Complete!');
                break;
            }
          });
        }

        return this;
      });

      this.attachRenderer = jest.fn(renderer => {
        if (!renderer || !renderer.domElement) {
          if (this.game && this.game.debugManager) {
            this.game.debugManager.warn(
              'UIManager.attachRenderer',
              'Invalid renderer or domElement'
            );
          }
          return;
        }

        this.renderer = renderer;

        // Find or create game container
        let gameContainer = global.document.getElementById('game-container');
        if (!gameContainer) {
          gameContainer = global.document.createElement('div');
          gameContainer.id = 'game-container';
          gameContainer.style.position = 'absolute';
          gameContainer.style.top = '0';
          gameContainer.style.left = '0';
          gameContainer.style.width = '100%';
          gameContainer.style.height = '100%';
          gameContainer.style.overflow = 'hidden';
          global.document.body.insertBefore(gameContainer, global.document.body.firstChild);
        }

        // Move renderer if it has a parent
        if (renderer.domElement.parentNode && renderer.domElement.parentNode !== gameContainer) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }

        // Append if not already a child
        if (renderer.domElement.parentNode !== gameContainer) {
          gameContainer.appendChild(renderer.domElement);
        }
      });
      this.updateHoleInfo = jest.fn();
      this.resetStrokes = jest.fn();
      this.createMessageUI = jest.fn(() => {
        if (this.uiContainer) {
          this.messageElement = global.document.createElement('div');
          this.messageElement.id = 'message-container';
          this.messageElement.classList.add('message-container');
          this.uiContainer.appendChild(this.messageElement);
        }
      });
      this.createPowerIndicatorUI = jest.fn(() => {
        if (this.uiContainer) {
          this.powerIndicator = global.document.createElement('div');
          this.powerIndicator.classList.add('power-indicator');
          const powerFill = global.document.createElement('div');
          powerFill.classList.add('power-indicator-fill');
          this.powerIndicator.appendChild(powerFill);
          this.uiContainer.appendChild(this.powerIndicator);
        }
      });
      this.createMainContainer = jest.fn(() => {
        // Check for existing containers
        this.uiContainer =
          global.document.getElementById('ui-container') ||
          global.document.getElementById('ui-overlay');

        if (!this.uiContainer) {
          // Create new container
          this.uiContainer = global.document.createElement('div');
          this.uiContainer.id = 'ui-container';
          this.uiContainer.classList.add('ui-container');
          global.document.body.appendChild(this.uiContainer);
        } else {
          // Clear existing contents
          this.uiContainer.innerHTML = '';
          while (this.uiContainer.firstChild) {
            this.uiContainer.removeChild(this.uiContainer.firstChild);
          }
        }
        return this.uiContainer;
      });
      this.cleanup = jest.fn(() => {
        // Clean up elements
        if (this.messageElement) {
          this.messageElement.remove();
        }
        if (this.powerIndicator) {
          this.powerIndicator.remove();
        }
        if (this.uiContainer) {
          this.uiContainer.remove();
        }

        // Nullify references
        this.messageElement = null;
        this.powerIndicator = null;
        this.uiContainer = null;
        this.scoreOverlay = null;
        this.debugOverlay = null;
      });
      this.uiContainer = null;
      this.messageElement = null;
      this.powerIndicator = null;
    })
  };
});
