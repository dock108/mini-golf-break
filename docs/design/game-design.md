# Mini Golf Break - Game Design

## Core Concept
Mini Golf Break offers a minimalist mini-golf experience focused on a series of perfectly designed holes. The game emphasizes quick, repeatable sessions with satisfying feedback - ideal for short mental breaks.

## Target Audience
- Casual gamers looking for quick sessions
- Office workers needing a short mental break
- People who enjoy minimalist gameplay experiences
- Fans of relaxing, non-competitive games
- Anyone who appreciates clean, focused design

## Key Design Pillars

### 1. Minimalist Aesthetic
- Clean, simple background for visual clarity
- Focused lighting to highlight important elements
- High-contrast materials for clear visibility
- Emissive materials that enhance visibility
- Simple, clean UI with appropriate spacing and typography

### 2. Focused Gameplay Loop
- Series of perfectly crafted holes with optimized dimensions
- Quick gameplay sessions (1-2 minutes per hole)
- Simple drag-and-release controls that anyone can learn
- Satisfying ball physics with appropriate gravity and friction
- Clear visual and audio feedback for all actions
- Smooth transitions between holes

### 3. Satisfying Feedback
- Animated particles when the ball enters the hole
- Ball changes color and pulses when successful
- Sound effects for hitting the ball and completing the hole
- Animated scorecard showing your final stroke count
- Counter animation with sound for each stroke on the scorecard
- Clear progression indicators between holes

### 4. Intelligent Camera System
- Camera positions behind the ball looking toward the hole
- Smooth transitions during ball movement
- Camera follows ball during motion for clarity
- Appropriate distance and height constraints
- Optional orbit controls for players who want to look around

### 5. Course Progression
- Progressive difficulty through the course
- Clear visual indicators of hole number and progress
- Smooth transitions between holes
- Proper ball positioning at each hole's start
- Total score tracking across all holes

## Visual Style
- **Color Palette:**
  - Background: Dark tones for contrast
  - Fairway: Bright green with clear visibility
  - Fairway Border: Darker green for clear boundaries
  - Ball: White with subtle glow for visibility
  - Success: Vibrant green with glow effect for clear feedback
  - Hole Rim: Dark color for contrast
  - UI Elements: White text on semi-transparent dark backgrounds
  - Scorecard: Dark background with green accents

- **Lighting:**
  - Ambient light at 40% intensity for base illumination
  - Directional light for main illumination
  - Accent lighting for atmosphere and depth
  - Shadows for visual grounding and realism

## Audio Design
- **Ball Hit:** Low-pitched impact sound, volume varies with shot power
- **Success Sound:** Rising pitch from 440Hz to 880Hz with smooth fadeout
- **UI Sounds:** Subtle clicks for interactions
- **Score Counter:** Soft tick sound for each increment
- **Hole Transition:** Smooth audio transition between holes

## Gameplay Flow
1. **Start:** Player sees the ball positioned at the first hole's tee
2. **Input:** Player clicks and drags to aim, with power and direction indicator
3. **Action:** Ball is hit and travels across the course following physics rules
4. **Outcome:** Ball either enters hole (success) or stops elsewhere (try again)
5. **Success:** 
   - Ball changes color and emits particles
   - Animated scorecard appears showing stroke count
   - Continue button appears to progress to next hole
6. **Progression:** 
   - Ball is positioned at next hole's tee
   - Camera smoothly transitions to new position
   - UI updates to show current hole number
   - Total score is maintained and displayed

## Technical Considerations
- Physics tuned for satisfying, slightly forgiving gameplay
- Ball mass of 0.45kg for ideal control
- Enhanced damping (0.6) for natural movement
- Emissive materials for visibility
- Intelligent camera positioning for optimal experience
- Mobile-friendly controls (planned for future)
- Efficient hole transition system
- Proper cleanup between holes

Ball Force Application:
- Force Multiplier: 15 (applied to power to determine impulse magnitude)
