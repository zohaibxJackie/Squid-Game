document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    const lobbyModal = document.getElementById('lobbyModal');
    const waitingRoom = document.getElementById('waitingRoom');
    const nameInputSection = document.getElementById('nameInputSection');
    const joinRoomSection = document.getElementById('joinRoomSection');
    const playerNameInput = document.getElementById('playerNameInput');
    const roomCodeInput = document.getElementById('roomCodeInput');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const showJoinBtn = document.getElementById('showJoinBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const backBtn = document.getElementById('backBtn');
    const lobbyError = document.getElementById('lobbyError');
    const displayRoomCode = document.getElementById('displayRoomCode');
    const playersList = document.getElementById('playersList');
    const startGameBtn = document.getElementById('startGameBtn');
    const waitingText = document.getElementById('waitingText');

    const clock = document.querySelector('.clock');
    const playground = document.querySelector('.playground');
    const controllers = document.querySelector('.controllers');
    const playersContainer = document.getElementById('playersContainer');
    const countdownElement = document.getElementById('countdown');
    const dollImage = document.getElementById('dollImage');
    const moveButton = document.getElementById('moveButton');
    const btnText = document.querySelector('#moveButton span');
    const eliminationPopup = document.getElementById('eliminationPopup');
    const winPopup = document.getElementById('winPopup');
    const gameEndPopup = document.getElementById('gameEndPopup');
    const gameEndTitle = document.getElementById('gameEndTitle');
    const gameEndMessage = document.getElementById('gameEndMessage');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const backToLobbyBtn = document.getElementById('backToLobbyBtn');

    const sound = new Audio('./Assets/doll sound.mp3');
    const playerOutSound = new Audio('./Assets/death sound.mp3');

    let myPlayerId = null;
    let isHost = false;
    let roomCode = null;
    let moving = false;
    let position = 0;
    const speed = 0.5;
    let moveInterval = null;
    let isEliminated = false;
    let isFinished = false;
    let dollLooking = false;

    showJoinBtn.onclick = () => {
        nameInputSection.style.display = 'none';
        joinRoomSection.style.display = 'block';
        lobbyError.textContent = '';
    };

    backBtn.onclick = () => {
        joinRoomSection.style.display = 'none';
        nameInputSection.style.display = 'block';
        lobbyError.textContent = '';
    };

    createRoomBtn.onclick = () => {
        const name = playerNameInput.value.trim();
        if (!name) {
            lobbyError.textContent = 'Please enter your name';
            return;
        }
        socket.emit('createRoom', name);
    };

    joinRoomBtn.onclick = () => {
        const name = playerNameInput.value.trim();
        const code = roomCodeInput.value.trim().toUpperCase();
        if (!name) {
            lobbyError.textContent = 'Please enter your name first';
            joinRoomSection.style.display = 'none';
            nameInputSection.style.display = 'block';
            return;
        }
        if (!code) {
            lobbyError.textContent = 'Please enter a room code';
            return;
        }
        socket.emit('joinRoom', { roomCode: code, playerName: name });
    };

    socket.on('roomCreated', (data) => {
        myPlayerId = data.playerId;
        roomCode = data.roomCode;
        isHost = true;
        showWaitingRoom(data.roomCode, data.players);
    });

    socket.on('roomJoined', (data) => {
        myPlayerId = data.playerId;
        roomCode = data.roomCode;
        isHost = false;
        showWaitingRoom(data.roomCode, data.players);
    });

    socket.on('joinError', (message) => {
        lobbyError.textContent = message;
    });

    socket.on('playerJoined', (data) => {
        updatePlayersList(data.players);
    });

    socket.on('playerLeft', (data) => {
        if (data.newHost === myPlayerId) {
            isHost = true;
            startGameBtn.style.display = 'block';
            waitingText.style.display = 'none';
        }
        updatePlayersList(data.players);
        
        const sprite = document.getElementById(`player-${data.playerId}`);
        if (sprite) {
            sprite.remove();
        }
    });

    function showWaitingRoom(code, players) {
        lobbyModal.style.display = 'none';
        waitingRoom.style.display = 'flex';
        displayRoomCode.textContent = code;
        updatePlayersList(players);

        if (isHost) {
            startGameBtn.style.display = 'block';
            waitingText.style.display = 'none';
        } else {
            startGameBtn.style.display = 'none';
            waitingText.style.display = 'block';
        }
    }

    function updatePlayersList(players) {
        playersList.innerHTML = '';
        
        players.forEach((player, index) => {
            const card = document.createElement('div');
            card.className = 'player-card';
            if (index === 0) card.classList.add('host');
            if (player.id === myPlayerId) card.classList.add('you');

            const colorDiv = document.createElement('div');
            colorDiv.className = 'player-color';
            colorDiv.style.backgroundColor = player.color;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = player.name + (player.id === myPlayerId ? ' (You)' : '');

            card.appendChild(colorDiv);
            card.appendChild(nameSpan);

            if (index === 0) {
                const hostBadge = document.createElement('span');
                hostBadge.className = 'host-badge';
                hostBadge.textContent = 'HOST';
                card.appendChild(hostBadge);
            }

            playersList.appendChild(card);
        });
    }

    startGameBtn.onclick = () => {
        socket.emit('startGame');
    };

    socket.on('gameStarted', (data) => {
        startGame(data.players);
    });

    function startGame(players) {
        waitingRoom.style.display = 'none';
        clock.style.display = 'flex';
        playground.style.display = 'block';
        controllers.style.display = 'flex';

        isEliminated = false;
        isFinished = false;
        moving = false;
        position = 0;
        dollLooking = false;
        btnText.innerText = 'START';

        renderPlayers(players);
        dollImage.src = './Assets/doll back.png';
    }

    function renderPlayers(players) {
        playersContainer.innerHTML = '';

        players.forEach(player => {
            const sprite = document.createElement('div');
            sprite.className = 'multiplayer-sprite';
            sprite.id = `player-${player.id}`;
            sprite.style.left = `${player.position}%`;

            if (player.eliminated) sprite.classList.add('eliminated');
            if (player.finished) sprite.classList.add('finished');

            const img = document.createElement('img');
            img.src = './Assets/player.png';
            img.style.width = '100%';
            img.style.filter = `hue-rotate(${getHueFromColor(player.color)}deg)`;

            const label = document.createElement('div');
            label.className = 'player-label';
            label.style.backgroundColor = player.color;
            label.textContent = player.name;

            if (player.id === myPlayerId) {
                const youIndicator = document.createElement('div');
                youIndicator.className = 'you-indicator';
                youIndicator.textContent = '▼';
                sprite.appendChild(youIndicator);
            }

            sprite.appendChild(img);
            sprite.appendChild(label);
            playersContainer.appendChild(sprite);
        });
    }

    function getHueFromColor(hexColor) {
        const r = parseInt(hexColor.slice(1, 3), 16) / 255;
        const g = parseInt(hexColor.slice(3, 5), 16) / 255;
        const b = parseInt(hexColor.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;

        if (max !== min) {
            const d = max - min;
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return Math.round(h * 360);
    }

    socket.on('timerUpdate', (time) => {
        countdownElement.textContent = time;
    });

    socket.on('dollTurn', (isLooking) => {
        dollLooking = isLooking;
        if (isLooking) {
            dollImage.src = './Assets/doll front.png';
            sound.pause();
            sound.currentTime = 0;
        } else {
            dollImage.src = './Assets/doll back.png';
            sound.play();
        }
    });

    moveButton.onclick = () => {
        if (isEliminated || isFinished) return;

        if (moving) {
            clearInterval(moveInterval);
            moving = false;
            btnText.innerText = 'START';
            socket.emit('playerMove', false);
        } else {
            moving = true;
            btnText.innerText = 'STOP';
            socket.emit('playerMove', true);

            moveInterval = setInterval(() => {
                position += speed;
                if (position > 95) position = 95;

                const mySprite = document.getElementById(`player-${myPlayerId}`);
                if (mySprite) {
                    mySprite.style.left = `${position}%`;
                }

                socket.emit('updatePosition', position);
            }, 20);
        }
    };

    socket.on('playerPositionUpdate', (data) => {
        const sprite = document.getElementById(`player-${data.playerId}`);
        if (sprite) {
            sprite.style.left = `${data.position}%`;
        }
    });

    socket.on('playerEliminated', (data) => {
        if (data.playerId === myPlayerId) {
            isEliminated = true;
            moving = false;
            clearInterval(moveInterval);
            btnText.innerText = 'START';
            playerOutSound.play();
            eliminationPopup.style.display = 'flex';
            setTimeout(() => {
                eliminationPopup.style.display = 'none';
            }, 2000);
        }

        const sprite = document.getElementById(`player-${data.playerId}`);
        if (sprite) {
            sprite.classList.add('eliminated');
        }
    });

    socket.on('playerFinished', (data) => {
        if (data.playerId === myPlayerId) {
            isFinished = true;
            moving = false;
            clearInterval(moveInterval);
            btnText.innerText = 'START';
            winPopup.style.display = 'flex';
            setTimeout(() => {
                winPopup.style.display = 'none';
            }, 2000);
        }

        const sprite = document.getElementById(`player-${data.playerId}`);
        if (sprite) {
            sprite.classList.add('finished');
        }
    });

    socket.on('gameEnded', (data) => {
        sound.pause();
        sound.currentTime = 0;
        clearInterval(moveInterval);
        moving = false;

        gameEndMessage.innerHTML = '';
        let title = 'Game Over';

        if (data.reason === 'winners' && data.winners.length > 0) {
            title = 'Game Complete!';
            const header = document.createElement('p');
            const strong = document.createElement('strong');
            strong.textContent = 'Winners:';
            header.appendChild(strong);
            gameEndMessage.appendChild(header);
            
            data.winners.forEach(w => {
                const p = document.createElement('p');
                p.className = 'winner';
                p.textContent = w.name + (w.id === myPlayerId ? ' (You!)' : '');
                gameEndMessage.appendChild(p);
            });
        } else if (data.reason === 'timeout') {
            title = 'Time\'s Up!';
            const winners = data.players.filter(p => p.finished);
            if (winners.length > 0) {
                const header = document.createElement('p');
                const strong = document.createElement('strong');
                strong.textContent = 'Winners:';
                header.appendChild(strong);
                gameEndMessage.appendChild(header);
                
                winners.forEach(w => {
                    const p = document.createElement('p');
                    p.className = 'winner';
                    p.textContent = w.name + (w.id === myPlayerId ? ' (You!)' : '');
                    gameEndMessage.appendChild(p);
                });
            } else {
                const p = document.createElement('p');
                p.textContent = 'No one made it to the finish line!';
                gameEndMessage.appendChild(p);
            }
        } else {
            title = 'Everyone Eliminated!';
            const p = document.createElement('p');
            p.textContent = 'No survivors this round!';
            gameEndMessage.appendChild(p);
        }

        gameEndTitle.textContent = title;
        gameEndPopup.style.display = 'flex';

        if (isHost) {
            playAgainBtn.style.display = 'block';
        } else {
            playAgainBtn.style.display = 'none';
        }
    });

    playAgainBtn.onclick = () => {
        socket.emit('playAgain');
    };

    socket.on('gameReset', (data) => {
        gameEndPopup.style.display = 'none';
        clock.style.display = 'none';
        playground.style.display = 'none';
        controllers.style.display = 'none';
        waitingRoom.style.display = 'flex';
        updatePlayersList(data.players);
    });

    backToLobbyBtn.onclick = () => {
        location.reload();
    };
});
