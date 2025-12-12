# Red Light, Green Light Game

## Overview
A browser-based recreation of the Red Light, Green Light game from Squid Game. Players must reach the finish line before time runs out while avoiding detection when the doll turns around.

## Project Structure
- `index.html` - Main game page
- `scripts/main.js` - Game logic (player movement, doll behavior, win/lose conditions)
- `stylesheets/` - CSS styling files
- `Assets/` - Game assets (images, sounds, favicon)

## How to Play
1. Click "Start Game" to begin
2. Press START to move the player forward
3. Press STOP when the doll turns around (red light)
4. Reach the finish line within 40 seconds to win
5. If you're moving when the doll is watching, you're eliminated

## Technical Details
- Pure HTML/CSS/JavaScript - no build process required
- Static file hosting on port 5000
- No backend or database required

## Deployment
Static deployment serving files from root directory.
