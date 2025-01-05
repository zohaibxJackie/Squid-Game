# Red Light, Green Light

This project is a simple web-based game inspired by the classic "Red Light, Green Light" game. The objective is to reach the finish line before the timer runs out while avoiding being caught moving by the doll.

## Table of Contents

- Gameplay
- Installation
- Usage
- Project Structure
- Contributing
- License

## Gameplay

### Objective
Reach the finish line before the timer runs out to win the game.

### How to Play
1. Press the **START** button to move the player forward.
2. Press the **STOP** button to stop the player.
3. When the doll is facing **back** (green light), you are safe to move.
4. When the doll is facing **front** (red light), you must **STOP immediately**.

### Game Over Conditions
- If you are moving while the doll is watching (red light), you will be **eliminated**.
- If the timer runs out before you reach the finish line, you lose.

### Winning Condition
Reach the finish line without being eliminated, and within the given time, to win the game.

### Tips
- Be quick but cautious.
- Pay attention to the doll’s movements and stop immediately when it turns to face you.

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/your-username/red-light-green-light.git
    ```
2. Navigate to the project directory:
    ```sh
    cd red-light-green-light
    ```

## Usage

1. Open `index.html` in your web browser to start the game.

## Project Structure
.red-light-green-light/ 
├── .gitignore ├── Assets/ │ ├── background.png │ ├── death sound.mp3 │ ├── doll back.png │ ├── doll front.png │ ├── doll sound.mp3 │ └── player.png ├── index.html ├── main.js └── style.css



## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.