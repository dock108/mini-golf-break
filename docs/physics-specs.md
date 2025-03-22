# Physics Specification Document for Mini Golf Break

This document defines the physics requirements and behaviors for **Mini Golf Break**, ensuring consistent gameplay mechanics and realistic interactions, while maintaining simplicity for performance and accessibility.

> **Note:** For specific implementation values, please refer to the [Physics Parameters Reference](./physics-parameters.md) document, which serves as the single source of truth for exact physics values used in the implementation.

## 1. General Physics Settings

- **Gravity:** 9.81 m/s² downward (real-world Earth gravity).
- **Friction and Rolling Resistance:** Realistic friction and rolling resistance for ball interactions with surfaces, ensuring natural gameplay without overly prolonged roll times.

## 2. Ball Behavior

- **Mass:** 0.45kg (intentionally lighter than standard golf ball for better gameplay feel).
- **Bounce:** Realistic bounce behavior, with the ball bouncing naturally off surfaces but gradually reducing energy until it stops.
- **Roll:** Ball should naturally roll to a stop after a realistic distance, ensuring gameplay feels authentic without unnecessarily prolonging gameplay.
- **Damping:** Linear and angular damping of 0.6 to simulate air resistance and rolling friction.

## 3. Materials & Surface Interactions

- Clearly distinct physical behaviors for different surfaces:
  - **Grass:** Standard friction (0.8), moderate bounce (0.1).
  - **Sand:** High friction (2.0), minimal bounce (0.01), significantly slows ball.
  - **Water:** Immediate stop with a visual splash effect.
  - **Obstacles/Bumpers:** Low friction (0.1), high bounce (0.8) for dynamic interactions.

## 4. Collision Handling

- **Collision Detection:** Accurate, realistic collision detection to provide authentic interactions between the ball, course borders, obstacles, and holes.
- **Course Borders and Obstacles:** The ball should respond naturally to impacts with static course borders and obstacles, bouncing or deflecting appropriately based on collision angle and force.
- **Holes:** Accurate detection for entering holes, ensuring the ball realistically falls in when over the opening.
- **Water and Sand Traps:** Ball stops immediately upon landing with an accompanying splash or sand effect.

## 5. Physics Accuracy

- **Priority:** Simplicity and performance prioritized, maintaining realistic physics without compromising smooth gameplay. The physics should feel believable but avoid overly complex calculations to maintain consistent frame rates.
- **Solver Settings:** Enhanced stability with 30 iterations and 0.0001 tolerance, with 8 max substeps for smoother physics.

## 6. Edge Case Handling

- **Out of Bounds:** Treat as bugs or issues; players should re-hit, with clear identification of areas causing out-of-bound issues to aid debugging and improvements.

## Best Practices

- Regularly test physics interactions across different surfaces and obstacles to ensure realistic and enjoyable gameplay.
- Use Cannon-es' built-in features to maintain optimal physics performance.
- Keep physics calculations simple and efficient to maintain smooth performance, especially critical for casual play sessions.

This physics specification ensures a balance between realism and simplicity, delivering an engaging yet accessible mini-golf experience.
