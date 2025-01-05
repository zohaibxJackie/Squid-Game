document.addEventListener('DOMContentLoaded', () => {
    const rulesPage = document.querySelector('.modal');
    const startButton = document.querySelector('#startGameButton');
    const player = document.getElementById('player'); 
    let position = 0; 
    const speed = 0.8; 
    const moveButton = document.getElementById('moveButton'); 
    let moving = false; 
    let moveInterval; 
    let btnText = document.querySelector('#moveButton span');
    const wrapper = document.querySelector('.wrapper'); 
    const dollImage = document.getElementById('dollImage'); 
    const sound = new Audio('./Assets/doll sound.mp3');
    const playerOutSound = new Audio('./Assets/death sound.mp3'); 
    let soundPlaying = false;
    let dollLooking = false;
    let countdown;
    let countdownTime = 40;
    let dollTurnInterval; // Variable to control doll turning
    let dollTurn = true;

    // Select the popup and button
    const eliminationPopup = document.getElementById('eliminationPopup');
    const playAgainButton = document.getElementById('playAgainButton');

    function startTime() {
        const countdownElement = document.getElementById('countdown');
        countdownTime = 40; // Reset the countdown time

        countdown = setInterval(() => {
            countdownElement.textContent = countdownTime;

            if (countdownTime === 0) {
                clearInterval(countdown);
                alert('Time is up! Game Over!');
                resetGame();
            } else {
                countdownTime--;
            }
        }, 1000);
    }

    function startGame() {
        // Hide rules and reset game
        rulesPage.style.display = 'none';
        resetGame();

        // Start countdown
        startTime();

        // Doll logic
        function turnDollBack() {
            dollImage.src = './Assets/doll back.png';
            sound.play();
            soundPlaying = true;
            setDollLooking(false);
        }

        function turnDollFront() {
            setTimeout(() => {
                sound.pause();
            }, 50);  
            dollImage.src = './Assets/doll front.png';
            sound.currentTime = 0;
            soundPlaying = false;
            setDollLooking(true);
            checkPlayerStatus();
        }

        turnDollBack();

        function randomDollTurn() {
            const randomTime = Math.floor(Math.random() * 3000) + 2000;            

            dollTurnInterval = setTimeout(() => {
                if (!soundPlaying) {
                    turnDollBack();
                } else {
                    turnDollFront();
                }

                if (dollTurn) {
                    randomDollTurn();
                }
            }, randomTime);
        }

        randomDollTurn();

        // Movement logic
        moveButton.onclick = () => {
            
            if (moving) {
                
                clearInterval(moveInterval);
                moving = false;
                btnText.innerText = "START";
            } else {
                
                btnText.innerText = "STOP";
                moving = true;
                moveInterval = setInterval(() => {
                    position += speed;
                    player.style.left = position + 'px';

                    // Check if player reaches the end
                    const wrapperWidth = wrapper.offsetWidth;
                    const playerWidth = player.offsetWidth / 2;
                    if (position >= wrapperWidth - playerWidth) {
                        clearInterval(moveInterval);
                        alert('You Win!');
                        resetGame();
                    }
                }, 20);
            }
            checkPlayerStatus();
        };

        function checkPlayerStatus() {
            setTimeout(() => {
                if (dollLooking && moving) {
                    playerOutSound.play();
                    showEliminationPopup();
                    dollTurn = false;
                    resetGame();
                }
            }, 100);
        }

        function setDollLooking(isLooking) {
            dollLooking = isLooking;
        }
    }

    function resetGame() {
        
        // Stop all intervals and reset variables
        playerOutSound.currentTime = 0;
        position = 0;
        player.style.left = position + 'px';
        moving = false;
        btnText.innerText = "START";
        clearInterval(moveInterval);
        clearInterval(countdown);
        sound.pause();
        sound.currentTime = 0;
        clearTimeout(dollTurnInterval); // Stop doll turning
        console.log('resetting game');
    }

    startButton.addEventListener('click', startGame);

    playAgainButton.addEventListener('click', () => {
        dollTurn = true;
        eliminationPopup.style.display = 'none';
        startGame();
    });

    function showEliminationPopup() {
        // Stop doll-related actions
        clearTimeout(dollTurnInterval);
        sound.pause();
        sound.currentTime = 0;

        // Show elimination popup
        eliminationPopup.style.display = 'flex';
    }
});
