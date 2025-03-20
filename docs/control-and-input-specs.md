# Controls & Input Specification Document for Mini Golf Break

This document outlines the controls and input methods for **Mini Golf Break**, emphasizing intuitive drag-and-release mechanics, clear visual feedback, and handling of user input edge cases.

## 1. General Controls

- **Primary Input Method:** Drag-and-release interaction, designed for ease of use and intuitive gameplay.
- **Camera Controls:** Players can rotate or adjust the view/camera before making a shot, ensuring clear visibility of the course.

## 2. Drag-and-Release Mechanics

- **Shot Power:** Drag length is directly proportional to shot power; the farther the drag, the more powerful the shot.
- **Power Limit:** A maximum drag length caps the shot power to maintain balanced gameplay.
- **Minimum Drag Threshold:** Implemented to avoid accidental taps or very weak shots, ensuring deliberate player input.

## 3. Visual Feedback

- **Aiming Direction Line:** Visible during dragging, clearly indicating the direction of the shot.
- **Shot Power Representation:** The length of the direction line visually represents the power of the shot.
- **Fade-out Effect:** The aiming direction line fades out after 3 seconds from the drag start, providing a subtle visual cue and enhancing user experience.

## 4. Input Edge Cases

- **Drag Outside Playable Area:** Ignore inputs when the drag starts or extends outside the playable area, preventing unintended shots or behaviors.
- **Canceling Drag:** Players can cancel or reset their shot by dragging back to the ball’s safe area before releasing, giving control to reconsider shot placement and power.

## Best Practices

- Ensure drag-and-release controls feel responsive and intuitive.
- Maintain clear and concise visual feedback to aid player decision-making.
- Regularly test edge cases to ensure consistent and expected control behavior across various scenarios.

This controls and input specification provides a seamless and intuitive user experience, encouraging effortless engagement while clearly communicating gameplay mechanics.

