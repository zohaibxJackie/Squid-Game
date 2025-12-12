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
const voiceChatRooms = new Map();

const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

const DIFFICULTY_SETTINGS = {
  easy: { time: 50, dollMinTime: 3000, dollMaxTime: 5000 },
  normal: { time: 40, dollMinTime: 2000, dollMaxTime: 4000 },
  hard: { time: 30, dollMinTime: 1000, dollMaxTime: 2500 },
  insane: { time: 20, dollMinTime: 500, dollMaxTime: 1500 }
};

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
    dollInterval: null,
    difficulty: 'normal'
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
      color: getPlayerColor(0),
      wins: 0
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
      color: getPlayerColor(room.players.size),
      wins: 0
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

  socket.on('leaveRoom', () => {
    handlePlayerLeave(socket);
    socket.emit('leftRoom');
  });

  socket.on('setDifficulty', (difficulty) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.host !== socket.id) return;
    if (room.gameState !== 'waiting') return;
    if (!DIFFICULTY_SETTINGS[difficulty]) return;
    
    room.difficulty = difficulty;
    io.to(socket.roomCode).emit('difficultyChanged', difficulty);
  });

  socket.on('startGame', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.host !== socket.id) return;
    if (room.gameState !== 'waiting') return;

    clearInterval(room.countdownInterval);
    clearTimeout(room.dollInterval);

    const settings = DIFFICULTY_SETTINGS[room.difficulty] || DIFFICULTY_SETTINGS.normal;

    room.gameState = 'playing';
    room.countdownTime = settings.time;
    room.dollLooking = false;

    room.players.forEach(player => {
      player.position = 0;
      player.eliminated = false;
      player.finished = false;
      player.moving = false;
    });

    io.to(socket.roomCode).emit('gameStarted', {
      players: Array.from(room.players.values()),
      difficulty: room.difficulty,
      time: settings.time
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

    const settings = DIFFICULTY_SETTINGS[room.difficulty] || DIFFICULTY_SETTINGS.normal;
    const minTime = settings.dollMinTime;
    const maxTime = settings.dollMaxTime;

    function turnDoll() {
      if (room.gameState !== 'playing') return;

      room.dollLooking = !room.dollLooking;
      io.to(roomCode).emit('dollTurn', room.dollLooking);

      if (room.dollLooking) {
        checkPlayersMoving(roomCode);
      }

      const nextTurn = Math.floor(Math.random() * (maxTime - minTime)) + minTime;
      room.dollInterval = setTimeout(turnDoll, nextTurn);
    }

    const initialDelay = Math.floor(Math.random() * minTime) + (minTime / 2);
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
    
    winners.forEach(winner => {
      winner.wins = (winner.wins || 0) + 1;
    });
    
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

  socket.on('voiceChatJoin', (roomCode) => {
    if (!voiceChatRooms.has(roomCode)) {
      voiceChatRooms.set(roomCode, new Set());
    }
    
    const voiceRoom = voiceChatRooms.get(roomCode);
    const existingPeers = Array.from(voiceRoom);
    voiceRoom.add(socket.id);
    
    socket.emit('voiceChatPeers', existingPeers);
    
    existingPeers.forEach(peerId => {
      io.to(peerId).emit('voiceChatNewPeer', socket.id);
    });
  });

  socket.on('voiceChatLeave', (roomCode) => {
    const voiceRoom = voiceChatRooms.get(roomCode);
    if (voiceRoom) {
      voiceRoom.delete(socket.id);
      socket.to(roomCode).emit('voiceChatUserLeft', socket.id);
    }
  });

  socket.on('voiceOffer', (data) => {
    io.to(data.to).emit('voiceOffer', {
      from: socket.id,
      offer: data.offer
    });
  });

  socket.on('voiceAnswer', (data) => {
    io.to(data.to).emit('voiceAnswer', {
      from: socket.id,
      answer: data.answer
    });
  });

  socket.on('voiceIceCandidate', (data) => {
    io.to(data.to).emit('voiceIceCandidate', {
      from: socket.id,
      candidate: data.candidate
    });
  });

  function handlePlayerLeave(socket) {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    const leavingPlayerId = socket.id;
    room.players.delete(socket.id);

    const voiceRoom = voiceChatRooms.get(socket.roomCode);
    if (voiceRoom) {
      voiceRoom.delete(socket.id);
      socket.to(socket.roomCode).emit('voiceChatUserLeft', socket.id);
    }

    if (room.players.size === 0) {
      clearInterval(room.countdownInterval);
      clearTimeout(room.dollInterval);
      rooms.delete(socket.roomCode);
      voiceChatRooms.delete(socket.roomCode);
    } else {
      if (room.host === socket.id) {
        room.host = room.players.keys().next().value;
      }
      io.to(socket.roomCode).emit('playerLeft', {
        playerId: leavingPlayerId,
        newHost: room.host,
        players: Array.from(room.players.values())
      });
    }

    socket.leave(socket.roomCode);
    socket.roomCode = null;
  }

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    handlePlayerLeave(socket);
  });
});

const PORT = 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
