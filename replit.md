# Red Light, Green Light - Multiplayer Game

## Overview
A browser-based multiplayer recreation of the Red Light, Green Light game from Squid Game. Players compete in real-time to reach the finish line before time runs out while avoiding detection when the doll turns around.

## Project Structure
- `server.js` - Node.js backend with Express and Socket.io for real-time multiplayer
- `index.html` - Main game page with lobby and game UI
- `scripts/main.js` - Client-side game logic (Socket.io client, player movement, UI)
- `stylesheets/` - CSS styling files (style.css, multiplayerStyles.css)
- `Assets/` - Game assets (images, sounds, favicon)
- `package.json` - Node.js dependencies

## How to Play
1. Enter your name and create a room or join with a room code
2. Share the room code with friends (up to 8 players)
3. Host starts the game when everyone is ready
4. Press START to move, STOP when the doll turns around (red light)
5. Reach the finish line within 40 seconds to win
6. If you're moving when the doll is watching, you're eliminated

## Multiplayer Features
- Real-time player synchronization via Socket.io
- Room-based matchmaking with shareable codes
- Up to 8 players per room
- Synchronized doll behavior for all players
- Live player positions visible to everyone
- Game state: waiting, playing, ended

## Technical Details
- Backend: Node.js + Express + Socket.io
- Frontend: Vanilla JavaScript with Socket.io client
- Port: 5000 (Express server with static files)
- No database required (in-memory game rooms)

## Deployment
Autoscale deployment running Node.js server.
