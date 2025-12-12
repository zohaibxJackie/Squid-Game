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
    const difficultySection = document.getElementById('difficultySection');
    const difficultyDisplay = document.getElementById('difficultyDisplay');
    const currentDifficulty = document.getElementById('currentDifficulty');
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
    const leaveRoomBtn = document.getElementById('leaveRoomBtn');

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

    const sound = new Audio();
    const playerOutSound = new Audio();
    sound.src = './Assets/doll sound.mp3';
    playerOutSound.src = './Assets/death sound.mp3';

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
    let audioUnlocked = false;
    let savedPlayerName = '';

    const dollFrontImg = new Image();
    const dollBackImg = new Image();
    let imagesLoaded = 0;
    let imagesPreloaded = false;

    function preloadImages() {
        const checkAllLoaded = () => {
            imagesLoaded++;
            if (imagesLoaded >= 2) {
                imagesPreloaded = true;
                console.log('All doll images preloaded');
            }
        };
        
        dollFrontImg.onload = checkAllLoaded;
        dollFrontImg.onerror = checkAllLoaded;
        dollBackImg.onload = checkAllLoaded;
        dollBackImg.onerror = checkAllLoaded;
        
        dollFrontImg.src = './Assets/doll front.png';
        dollBackImg.src = './Assets/doll back.png';
    }

    preloadImages();

    function unlockAudio() {
        if (audioUnlocked) return;
        
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        
        sound.volume = 0;
        sound.play().then(() => {
            sound.pause();
            sound.currentTime = 0;
            sound.volume = 1;
            audioUnlocked = true;
            console.log('Audio context unlocked');
        }).catch(() => {
            console.log('Audio unlock failed, will try again on next interaction');
        });
        
        playerOutSound.volume = 0;
        playerOutSound.play().then(() => {
            playerOutSound.pause();
            playerOutSound.currentTime = 0;
            playerOutSound.volume = 1;
        }).catch(() => {});
    }

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    showJoinBtn.onclick = () => {
        unlockAudio();
        nameInputSection.style.display = 'none';
        joinRoomSection.style.display = 'block';
        lobbyError.textContent = '';
    };

    backBtn.onclick = () => {
        joinRoomSection.style.display = 'none';
        nameInputSection.style.display = 'block';
        lobbyError.textContent = '';
    };

    if (leaveRoomBtn) {
        leaveRoomBtn.onclick = () => {
            socket.emit('leaveRoom');
        };
    }

    socket.on('leftRoom', () => {
        waitingRoom.style.display = 'none';
        lobbyModal.style.display = 'flex';
        nameInputSection.style.display = 'block';
        joinRoomSection.style.display = 'none';
        playerNameInput.value = savedPlayerName;
        roomCode = null;
        isHost = false;
    });

    createRoomBtn.onclick = () => {
        unlockAudio();
        const name = playerNameInput.value.trim();
        if (!name) {
            lobbyError.textContent = 'Please enter your name';
            return;
        }
        savedPlayerName = name;
        socket.emit('createRoom', name);
    };

    joinRoomBtn.onclick = () => {
        unlockAudio();
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
        savedPlayerName = name;
        socket.emit('joinRoom', { roomCode: code, playerName: name });
    };

    difficultyBtns.forEach(btn => {
        btn.onclick = () => {
            if (!isHost) return;
            const difficulty = btn.dataset.difficulty;
            socket.emit('setDifficulty', difficulty);
            difficultyBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });

    socket.on('difficultyChanged', (difficulty) => {
        currentDifficulty.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
        difficultyBtns.forEach(b => {
            b.classList.toggle('active', b.dataset.difficulty === difficulty);
        });
    });

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
            difficultySection.style.display = 'block';
            difficultyDisplay.style.display = 'none';
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
            difficultySection.style.display = 'block';
            difficultyDisplay.style.display = 'none';
        } else {
            startGameBtn.style.display = 'none';
            waitingText.style.display = 'block';
            difficultySection.style.display = 'none';
            difficultyDisplay.style.display = 'block';
        }
    }

    function updatePlayersList(players) {
        playersList.innerHTML = '';
        
        const sortedPlayers = [...players].sort((a, b) => (b.wins || 0) - (a.wins || 0));
        
        sortedPlayers.forEach((player, index) => {
            const card = document.createElement('div');
            card.className = 'player-card';
            if (players.indexOf(player) === 0) card.classList.add('host');
            if (player.id === myPlayerId) card.classList.add('you');

            const colorDiv = document.createElement('div');
            colorDiv.className = 'player-color';
            colorDiv.style.backgroundColor = player.color;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = player.name + (player.id === myPlayerId ? ' (You)' : '');

            const winsSpan = document.createElement('span');
            winsSpan.className = 'player-wins';
            winsSpan.textContent = `${player.wins || 0} wins`;

            card.appendChild(colorDiv);
            card.appendChild(nameSpan);
            card.appendChild(winsSpan);

            if (players.indexOf(player) === 0) {
                const hostBadge = document.createElement('span');
                hostBadge.className = 'host-badge';
                hostBadge.textContent = 'HOST';
                card.appendChild(hostBadge);
            }

            playersList.appendChild(card);
        });
    }

    startGameBtn.onclick = () => {
        unlockAudio();
        socket.emit('startGame');
    };

    socket.on('gameStarted', (data) => {
        startGame(data.players);
    });

    function startGame(players) {
        waitingRoom.style.display = 'none';
        gameEndPopup.style.display = 'none';
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
        
        if (imagesPreloaded) {
            dollImage.src = dollBackImg.src;
        } else {
            dollImage.src = './Assets/doll back.png';
        }
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
            if (imagesPreloaded) {
                dollImage.src = dollFrontImg.src;
            } else {
                dollImage.src = './Assets/doll front.png';
            }
            sound.pause();
            sound.currentTime = 0;
        } else {
            if (imagesPreloaded) {
                dollImage.src = dollBackImg.src;
            } else {
                dollImage.src = './Assets/doll back.png';
            }
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Audio play failed:', e));
        }
    });

    moveButton.onclick = () => {
        unlockAudio();
        
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
            playerOutSound.play().catch(e => console.log('Death sound failed:', e));
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
                p.textContent = w.name + (w.id === myPlayerId ? ' (You!)' : '') + ` - Total Wins: ${w.wins || 0}`;
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
                    p.textContent = w.name + (w.id === myPlayerId ? ' (You!)' : '') + ` - Total Wins: ${w.wins || 0}`;
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

        const leaderboardDiv = document.createElement('div');
        leaderboardDiv.className = 'leaderboard';
        leaderboardDiv.innerHTML = '<p><strong>Leaderboard:</strong></p>';
        
        const sortedPlayers = [...data.players].sort((a, b) => (b.wins || 0) - (a.wins || 0));
        sortedPlayers.forEach((player, index) => {
            const p = document.createElement('p');
            p.className = 'leaderboard-entry';
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            p.textContent = `${medal} ${player.name}: ${player.wins || 0} wins`;
            if (player.id === myPlayerId) p.style.fontWeight = 'bold';
            leaderboardDiv.appendChild(p);
        });
        gameEndMessage.appendChild(leaderboardDiv);

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
        socket.emit('leaveRoom');
    };

    socket.on('leftRoom', () => {
        gameEndPopup.style.display = 'none';
        clock.style.display = 'none';
        playground.style.display = 'none';
        controllers.style.display = 'none';
        waitingRoom.style.display = 'none';
        lobbyModal.style.display = 'flex';
        nameInputSection.style.display = 'block';
        joinRoomSection.style.display = 'none';
        playerNameInput.value = savedPlayerName;
        roomCode = null;
        isHost = false;
        myPlayerId = null;
    });

    let localStream = null;
    let peerConnections = {};
    let voiceChatEnabled = false;

    const voiceChatBtn = document.getElementById('voiceChatBtn');
    const voiceChatStatus = document.getElementById('voiceChatStatus');

    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    if (voiceChatBtn) {
        voiceChatBtn.onclick = async () => {
            if (!roomCode) return;
            
            if (!voiceChatEnabled) {
                try {
                    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    voiceChatEnabled = true;
                    voiceChatBtn.textContent = 'Mute';
                    voiceChatBtn.classList.add('active');
                    if (voiceChatStatus) voiceChatStatus.textContent = 'Voice: ON';
                    socket.emit('voiceChatJoin', roomCode);
                } catch (err) {
                    console.error('Failed to get microphone:', err);
                    alert('Could not access microphone. Please allow microphone access to use voice chat.');
                }
            } else {
                if (localStream) {
                    localStream.getTracks().forEach(track => track.stop());
                    localStream = null;
                }
                voiceChatEnabled = false;
                voiceChatBtn.textContent = 'Voice Chat';
                voiceChatBtn.classList.remove('active');
                if (voiceChatStatus) voiceChatStatus.textContent = 'Voice: OFF';
                
                Object.keys(peerConnections).forEach(peerId => {
                    if (peerConnections[peerId]) {
                        peerConnections[peerId].close();
                        delete peerConnections[peerId];
                    }
                });
                socket.emit('voiceChatLeave', roomCode);
            }
        };
    }

    socket.on('voiceChatPeers', async (peers) => {
        if (!voiceChatEnabled || !localStream) return;
        
        for (const peerId of peers) {
            if (peerId !== myPlayerId && !peerConnections[peerId]) {
                await createPeerConnection(peerId, true);
            }
        }
    });

    socket.on('voiceChatNewPeer', async (peerId) => {
        if (!voiceChatEnabled || !localStream) return;
        if (peerId !== myPlayerId && !peerConnections[peerId]) {
            await createPeerConnection(peerId, true);
        }
    });

    socket.on('voiceOffer', async (data) => {
        if (!voiceChatEnabled) return;
        
        const { from, offer } = data;
        if (!peerConnections[from]) {
            await createPeerConnection(from, false);
        }
        const pc = peerConnections[from];
        if (pc) {
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('voiceAnswer', { to: from, answer });
            } catch (e) {
                console.error('Error handling voice offer:', e);
            }
        }
    });

    socket.on('voiceAnswer', async (data) => {
        const { from, answer } = data;
        const pc = peerConnections[from];
        if (pc) {
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (e) {
                console.error('Error handling voice answer:', e);
            }
        }
    });

    socket.on('voiceIceCandidate', async (data) => {
        const { from, candidate } = data;
        const pc = peerConnections[from];
        if (pc && candidate) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error('Error adding ICE candidate:', e);
            }
        }
    });

    socket.on('voiceChatUserLeft', (peerId) => {
        if (peerConnections[peerId]) {
            peerConnections[peerId].close();
            delete peerConnections[peerId];
        }
        const remoteAudio = document.getElementById(`audio-${peerId}`);
        if (remoteAudio) remoteAudio.remove();
    });

    async function createPeerConnection(peerId, isInitiator) {
        const pc = new RTCPeerConnection(rtcConfig);
        peerConnections[peerId] = pc;

        if (localStream) {
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });
        }

        pc.ontrack = (event) => {
            let remoteAudio = document.getElementById(`audio-${peerId}`);
            if (!remoteAudio) {
                remoteAudio = document.createElement('audio');
                remoteAudio.id = `audio-${peerId}`;
                remoteAudio.autoplay = true;
                document.body.appendChild(remoteAudio);
            }
            remoteAudio.srcObject = event.streams[0];
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('voiceIceCandidate', { to: peerId, candidate: event.candidate });
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                pc.close();
                delete peerConnections[peerId];
            }
        };

        if (isInitiator) {
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('voiceOffer', { to: peerId, offer });
            } catch (e) {
                console.error('Error creating offer:', e);
            }
        }

        return pc;
    }
});
