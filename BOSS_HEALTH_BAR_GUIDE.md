# Boss Health Bar Component - Usage Guide

## Overview
A reusable, clean boss health bar UI component with proper rendering, clipping, and layering for Canvas-based games. Fixes overflow issues, alignment problems, and improves visual polish.

## File Location
- **Component**: `js/jeu/shared/boss-health-bar.js`
- **Maps using it**: map1.html, map2.html

## Features
✅ **Proper Clipping** - Health fill is clipped inside the bar container (no overflow)
✅ **Correct Layering** - Background → Fill → Border → Text
✅ **Clean Text Alignment** - Boss name positioned above the bar with proper centering
✅ **Responsive Design** - Scales with canvas size
✅ **Fallback Rendering** - Basic UI if sprite images fail to load
✅ **Reusable Component** - Easy to use for multiple bosses
✅ **Maintainable Code** - Well-documented, clean separation of concerns

## How It Works

### 1. **Rendering Layers**
```
Layer 1: Background sprite (under)
  ↓
Layer 2: Health fill (clipped to container)
  ↓
Layer 3: Border/Overlay sprite (over)
  ↓
Layer 4: Boss name text (above bar)
```

### 2. **Health Fill Clipping**
Uses Canvas `ctx.clip()` with a rectangular path to properly mask the health fill:
```javascript
ctx.save();
ctx.beginPath();
ctx.rect(fillX, fillY, filledWidth, fillHeight);
ctx.clip();
ctx.drawImage(...); // Only visible within clipped region
ctx.restore();
```

### 3. **Text Positioning**
- **Positioned above** the health bar (not overlapping)
- **Centered horizontally** on screen
- **Scaled proportionally** with bar dimensions
- **Dark background box** with golden border for readability
- **Text shadow** for depth

## Usage

### Basic Usage (Map2 - Fire Knight)
```javascript
// Already integrated in map2/boss-system.js
// Component is auto-initialized and reused
window.Map2BossSystem.drawBossHealthBar(ctx, canvas, clamp, bossEnemy, sprites);
```

### Creating a Custom Boss Health Bar
```javascript
const myBossHealthBar = window.BossHealthBarComponent.createHealthBar({
    maxWidth: 380,              // Max bar width (px)
    screenWidthRatio: 0.31,     // 31% of screen width
    topOffset: 14,              // Distance from top (px)
    showBossName: true,         // Show/hide name label
    bossName: "MY BOSS"         // Boss name to display
});

// Draw each frame
myBossHealthBar.draw(ctx, canvas, hp, maxHp, sprites);
```

### Configuration Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxWidth` | number | 380 | Maximum bar width in pixels |
| `screenWidthRatio` | number | 0.31 | Bar width as % of screen (31%) |
| `topOffset` | number | 14 | Distance from top in pixels |
| `showBossName` | boolean | true | Show/hide boss name text |
| `bossName` | string | "BOSS" | Name displayed above bar |

## Sprite Requirements
Three sprite images are required (same as before):
- `sprites.under` - Background/base sprite
- `sprites.progress` - Health fill sprite
- `sprites.over` - Border/overlay sprite

All sprites should have the same dimensions and aspect ratio.

## Visual Improvements from Previous Version

### Before
❌ Health fill overflowed outside the container
❌ Text overlapped the health bar
❌ Complex, hard-to-maintain rendering code
❌ Inconsistent text positioning

### After
✅ Clean clipping prevents overflow
✅ Boss name positioned above bar with spacing
✅ Simple, reusable component architecture
✅ Perfect text centering and alignment
✅ Better responsive scaling

## Colors & Styling

### Health Bar
- **Background**: Semi-transparent dark brown (uses sprite)
- **Border**: Golden color with slight transparency (uses sprite)
- **Health Fill**: Red/orange gradient (uses sprite)

### Text Label
- **Background**: Dark brown `rgba(12, 6, 6, 0.75)`
- **Border**: Golden `rgba(240, 205, 120, 0.85)`
- **Text Color**: Light beige `rgba(250, 240, 210, 0.98)`
- **Font**: Georgia, 700 (bold), scaled to bar height
- **Shadow**: Dark shadow for depth effect

## Example Integration in Game Loop

```javascript
// In your game-loop.js
function drawBossUI() {
    if (fireKnightBoss) {
        window.Map2BossSystem.drawBossHealthBar(
            ctx,              // Canvas context
            canvas,           // Canvas element
            clamp,            // Clamp function
            fireKnightBoss.boss,   // Boss object with hp/maxhp
            bossHealthBarSprites   // Sprite objects {under, progress, over}
        );
    }
}
```

## Troubleshooting

### Bar doesn't appear
- Check that canvas context (`ctx`) is valid
- Verify sprite images are loaded (`sprites.under.complete === true`)
- Check canvas dimensions are > 0

### Text overlaps or misaligned
- Adjust `topOffset` to move bar down
- Modify `bossName` config parameter
- Text automatically scales with bar height

### Health fill not clipping
- Verify sprites have correct dimensions
- Check that `naturalWidth` and `naturalHeight` are set
- Ensure clip path is within canvas bounds

### Performance issues
- Component is initialized once and reused (cached)
- All rendering is canvas-native (no DOM overhead)
- Minimal calculation overhead

## Refactoring Notes
- **Removed 100+ lines** of duplicate/complex code
- **Created reusable component** for any boss UI
- **Improved maintainability** with clear layer separation
- **Better error handling** with fallback rendering
- **Consistent styling** across all boss UIs

## Files Modified
- `js/jeu/shared/boss-health-bar.js` (NEW - Component)
- `js/jeu/map1/boss-system.js` (Updated to use component)
- `js/jeu/map2/boss-system.js` (Updated to use component)
- `template/map1.html` (Added script reference)
- `template/map2.html` (Added script reference)
