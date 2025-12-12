# Red Light, Green Light - Multiplayer Game

## Overview
A browser-based multiplayer recreation of the Red Light, Green Light game from Squid Game. Players compete in real-time to reach the finish line before time runs out while avoiding detection when the doll turns around.

## Recent Changes (December 2025)
- Fixed music not playing on first doll turn by preloading audio on user interaction
- Fixed doll image loading issues on slow connections by preloading images before game starts
- Added "Leave Room" button in waiting room and game end screen
- Improved "Play Again" flow - players stay together without re-entering names/room codes
- Added win tracking across multiple games with leaderboard display
- Added WebRTC-based voice chat for players to communicate during games

## Project Structure
- `server.js` - Node.js backend with Express, Socket.io, and WebRTC signaling
- `index.html` - Main game page with lobby and game UI
- `scripts/main.js` - Client-side game logic (Socket.io client, player movement, WebRTC voice chat, UI)
- `stylesheets/` - CSS styling files (style.css, multiplayerStyles.css)
- `Assets/` - Game assets (images, sounds, favicon)
- `package.json` - Node.js dependencies

## How to Play
1. Enter your name and create a room or join with a room code
2. Share the room code with friends (up to 8 players)
3. Host selects difficulty level
4. Host starts the game when everyone is ready
5. Press START to move, STOP when the doll turns around (red light)
6. Reach the finish line before time runs out to win
7. If you're moving when the doll is watching, you're eliminated

## Difficulty Levels
- **Easy**: 50 seconds, slow doll turns
- **Normal**: 40 seconds, medium doll turns  
- **Hard**: 30 seconds, fast doll turns
- **Insane**: 20 seconds, very fast doll turns

## Multiplayer Features
- Real-time player synchronization via Socket.io
- Room-based matchmaking with shareable codes
- Up to 8 players per room
- Synchronized doll behavior for all players
- Live player positions visible to everyone
- Difficulty selection by host
- Game state: waiting, playing, ended

## Technical Details
- Backend: Node.js + Express + Socket.io
- Frontend: Vanilla JavaScript with Socket.io client
- Port: 5000 (Express server with static files)
- No database required (in-memory game rooms)

## Deployment
Autoscale deployment running Node.js server.
