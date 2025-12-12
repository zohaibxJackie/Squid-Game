const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname)));

const rooms = new Map();

const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createRoom(hostId, hostName) {
  const roomCode = generateRoomCode();
  rooms.set(roomCode, {
    code: roomCode,
    host: hostId,
    players: new Map(),
    gameState: 'waiting',
    dollLooking: false,
    countdownTime: 40,
    countdownInterval: null,
    dollInterval: null
  });
  return roomCode;
}

function getPlayerColor(playerIndex) {
  return PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('createRoom', (playerName) => {
    const roomCode = createRoom(socket.id, playerName);
    const room = rooms.get(roomCode);
    
    room.players.set(socket.id, {
      id: socket.id,
      name: playerName,
      position: 0,
      eliminated: false,
      finished: false,
      moving: false,
      color: getPlayerColor(0)
    });

    socket.join(roomCode);
    socket.roomCode = roomCode;

    socket.emit('roomCreated', {
      roomCode,
      playerId: socket.id,
      players: Array.from(room.players.values())
    });
  });

  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('joinError', 'Room not found');
      return;
    }

    if (room.gameState !== 'waiting') {
      socket.emit('joinError', 'Game already in progress');
      return;
    }

    if (room.players.size >= 8) {
      socket.emit('joinError', 'Room is full');
      return;
    }

    room.players.set(socket.id, {
      id: socket.id,
      name: playerName,
      position: 0,
      eliminated: false,
      finished: false,
      moving: false,
      color: getPlayerColor(room.players.size)
    });

    socket.join(roomCode);
    socket.roomCode = roomCode;

    socket.emit('roomJoined', {
      roomCode,
      playerId: socket.id,
      players: Array.from(room.players.values())
    });

    socket.to(roomCode).emit('playerJoined', {
      player: room.players.get(socket.id),
      players: Array.from(room.players.values())
    });
  });

  socket.on('startGame', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.host !== socket.id) return;
    if (room.gameState !== 'waiting') return;

    clearInterval(room.countdownInterval);
    clearTimeout(room.dollInterval);

    room.gameState = 'playing';
    room.countdownTime = 40;
    room.dollLooking = false;

    room.players.forEach(player => {
      player.position = 0;
      player.eliminated = false;
      player.finished = false;
      player.moving = false;
    });

    io.to(socket.roomCode).emit('gameStarted', {
      players: Array.from(room.players.values())
    });

    room.countdownInterval = setInterval(() => {
      room.countdownTime--;
      io.to(socket.roomCode).emit('timerUpdate', room.countdownTime);

      if (room.countdownTime <= 0) {
        endGame(socket.roomCode, 'timeout');
      }
    }, 1000);

    startDollTurning(socket.roomCode);
  });

  function startDollTurning(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    function turnDoll() {
      if (room.gameState !== 'playing') return;

      room.dollLooking = !room.dollLooking;
      io.to(roomCode).emit('dollTurn', room.dollLooking);

      if (room.dollLooking) {
        checkPlayersMoving(roomCode);
      }

      const nextTurn = Math.floor(Math.random() * 3000) + 2000;
      room.dollInterval = setTimeout(turnDoll, nextTurn);
    }

    const initialDelay = Math.floor(Math.random() * 2000) + 1000;
    room.dollInterval = setTimeout(turnDoll, initialDelay);
  }

  function checkPlayersMoving(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    room.players.forEach((player, playerId) => {
      if (player.moving && !player.eliminated && !player.finished) {
        player.eliminated = true;
        io.to(roomCode).emit('playerEliminated', {
          playerId,
          players: Array.from(room.players.values())
        });
      }
    });

    checkGameEnd(roomCode);
  }

  function checkGameEnd(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    const activePlayers = Array.from(room.players.values()).filter(p => !p.eliminated);
    const finishedPlayers = activePlayers.filter(p => p.finished);

    if (activePlayers.length === 0 || (activePlayers.length > 0 && activePlayers.every(p => p.finished || p.eliminated))) {
      endGame(roomCode, finishedPlayers.length > 0 ? 'winners' : 'allEliminated');
    }
  }

  function endGame(roomCode, reason) {
    const room = rooms.get(roomCode);
    if (!room) return;

    room.gameState = 'ended';
    clearInterval(room.countdownInterval);
    clearTimeout(room.dollInterval);

    const winners = Array.from(room.players.values()).filter(p => p.finished);
    
    io.to(roomCode).emit('gameEnded', {
      reason,
      winners,
      players: Array.from(room.players.values())
    });
  }

  socket.on('playerMove', (isMoving) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.gameState !== 'playing') return;

    const player = room.players.get(socket.id);
    if (!player || player.eliminated || player.finished) return;

    player.moving = isMoving;

    if (room.dollLooking && isMoving) {
      player.eliminated = true;
      io.to(socket.roomCode).emit('playerEliminated', {
        playerId: socket.id,
        players: Array.from(room.players.values())
      });
      checkGameEnd(socket.roomCode);
    }
  });

  socket.on('updatePosition', (position) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.gameState !== 'playing') return;

    const player = room.players.get(socket.id);
    if (!player || player.eliminated || player.finished) return;

    player.position = position;

    if (position >= 95) {
      player.finished = true;
      player.moving = false;
      io.to(socket.roomCode).emit('playerFinished', {
        playerId: socket.id,
        playerName: player.name,
        players: Array.from(room.players.values())
      });
      checkGameEnd(socket.roomCode);
    }

    socket.to(socket.roomCode).emit('playerPositionUpdate', {
      playerId: socket.id,
      position: player.position
    });
  });

  socket.on('playAgain', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.host !== socket.id) return;

    room.gameState = 'waiting';
    room.players.forEach(player => {
      player.position = 0;
      player.eliminated = false;
      player.finished = false;
      player.moving = false;
    });

    io.to(socket.roomCode).emit('gameReset', {
      players: Array.from(room.players.values())
    });
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    room.players.delete(socket.id);

    if (room.players.size === 0) {
      clearInterval(room.countdownInterval);
      clearTimeout(room.dollInterval);
      rooms.delete(socket.roomCode);
    } else {
      if (room.host === socket.id) {
        room.host = room.players.keys().next().value;
      }
      io.to(socket.roomCode).emit('playerLeft', {
        playerId: socket.id,
        newHost: room.host,
        players: Array.from(room.players.values())
      });
    }
  });
});

const PORT = 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
