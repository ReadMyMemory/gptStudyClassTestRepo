const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const restartButton = document.getElementById('restartButton');
const musicToggleButton = document.getElementById('musicToggleButton');
const backgroundMusic = document.getElementById('backgroundMusic');
const crashSound = document.getElementById('crashSound');
const gameOverSound = document.getElementById('gameOverSound');
const attackSound = document.getElementById('attackSound');
let scoreDisplay = document.getElementById('score');
let energyDisplay = document.getElementById('energy');
let timerDisplay = document.getElementById('timer');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let player;
let keys;
let enemies;
let score;
let energy;
let gameLoopId;
let enemySpawnInterval;
let timerInterval;
let gameRunning;
let startTime;
let lastDirection = 'up';
let playerImage = new Image();
let enemyImages = [];
let isMusicPlaying = true;

async function fetchPokemonImages() {
    try {
        // Fetch player image (Pikachu)
        const pikachuResponse = await axios.get('https://pokeapi.co/api/v2/pokemon/pikachu');
        playerImage.src = pikachuResponse.data.sprites.front_default;

        // Fetch enemy images
        const response = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=10&offset=1'); // Skip Pikachu
        const pokemonList = response.data.results;

        for (let i = 0; i < pokemonList.length; i++) {
            const enemyResponse = await axios.get(pokemonList[i].url);
            const enemyImage = new Image();
            enemyImage.src = enemyResponse.data.sprites.front_default;
            enemyImages.push(enemyImage);
        }
    } catch (error) {
        console.error('Error fetching Pokémon data:', error);
    }
}

function initGame() {
    player = {
        x: canvas.width / 2,
        y: canvas.height - 50,
        width: 50,
        height: 50,
        speed: 5,
        bullets: []
    };

    keys = {
        left: false,
        right: false,
        up: false,
        down: false,
        space: false
    };

    enemies = [];
    score = 0;
    energy = 10;
    startTime = Date.now();
    scoreDisplay.innerText = `Score: ${score}`;
    energyDisplay.innerText = `Energy: ${energy}`;
    timerDisplay.innerText = `Time: 0`;
    gameRunning = true;

    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);

    backgroundMusic.play();
    isMusicPlaying = true;
    musicToggleButton.innerText = 'Music: On';

    gameLoopId = requestAnimationFrame(gameLoop);
    enemySpawnInterval = setInterval(spawnEnemy, 1000);
    timerInterval = setInterval(updateTimer, 1000);
}

function keyDownHandler(e) {
    if (e.code === 'ArrowLeft') {
        keys.left = true;
        lastDirection = 'left';
    }
    if (e.code === 'ArrowRight') {
        keys.right = true;
        lastDirection = 'right';
    }
    if (e.code === 'ArrowUp') {
        keys.up = true;
        lastDirection = 'up';
    }
    if (e.code === 'ArrowDown') {
        keys.down = true;
        lastDirection = 'down';
    }
    if (e.code === 'Space') keys.space = true;
}

function keyUpHandler(e) {
    if (e.code === 'ArrowLeft') keys.left = false;
    if (e.code === 'ArrowRight') keys.right = false;
    if (e.code === 'ArrowUp') keys.up = false;
    if (e.code === 'ArrowDown') keys.down = false;
    if (e.code === 'Space') keys.space = false;
}

function spawnEnemy() {
    const size = 50;
    const position = Math.random() * (canvas.width - size);
    const direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';
    let x, y, speedX, speedY;

    if (direction === 'horizontal') {
        x = Math.random() < 0.5 ? -size : canvas.width;
        y = Math.random() * (canvas.height - size);
        speedX = x < 0 ? 2 : -2;
        speedY = 0;
    } else {
        x = Math.random() * (canvas.width - size);
        y = Math.random() < 0.5 ? -size : canvas.height;
        speedX = 0;
        speedY = y < 0 ? 2 : -2;
    }

    const randomImage = enemyImages[Math.floor(Math.random() * enemyImages.length)];

    enemies.push({ x, y, width: size, height: size, speedX, speedY, image: randomImage });
}

function update() {
    if (!gameRunning) return;

    if (keys.left && player.x > 0) player.x -= player.speed;
    if (keys.right && player.x + player.width < canvas.width) player.x += player.speed;
    if (keys.up && player.y > 0) player.y -= player.speed;
    if (keys.down && player.y + player.height < canvas.height) player.y += player.speed;
    if (keys.space) {
        let bulletSpeedX = 0, bulletSpeedY = 0;
        switch (lastDirection) {
            case 'left':
                bulletSpeedX = -7;
                break;
            case 'right':
                bulletSpeedX = 7;
                break;
            case 'up':
                bulletSpeedY = -7;
                break;
            case 'down':
                bulletSpeedY = 7;
                break;
        }
        player.bullets.push({
            x: player.x + player.width / 2 - 2.5,
            y: player.y + player.height / 2 - 2.5,
            width: 5,
            height: 5,
            speedX: bulletSpeedX,
            speedY: bulletSpeedY
        });
        keys.space = false;
    }

    player.bullets.forEach((bullet, index) => {
        bullet.x += bullet.speedX;
        bullet.y += bullet.speedY;
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            player.bullets.splice(index, 1);
        }
    });

    enemies.forEach((enemy, enemyIndex) => {
        enemy.x += enemy.speedX;
        enemy.y += enemy.speedY;

        if (enemy.x < 0 || enemy.x > canvas.width || enemy.y < 0 || enemy.y > canvas.height) {
            enemies.splice(enemyIndex, 1);
        }

        player.bullets.forEach((bullet, bulletIndex) => {
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
            ) {
                player.bullets.splice(bulletIndex, 1);
                enemies.splice(enemyIndex, 1);
                score += 10;
                scoreDisplay.innerText = `Score: ${score}`;
                attackSound.play();
            }
        });

        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            energy -= 1;
            crashSound.play();
            energyDisplay.innerText = `Energy: ${energy}`;
            enemies.splice(enemyIndex, 1);
            if (energy <= 0) {
                gameOverSound.play();
                endGame();
            }
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);

    player.bullets.forEach(bullet => {
        ctx.fillStyle = 'red';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });

    enemies.forEach(enemy => {
        ctx.drawImage(enemy.image, enemy.x, enemy.y, enemy.width, enemy.height);
    });
}

function gameLoop() {
    update();
    draw();
    if (gameRunning) {
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}

function updateTimer() {
    if (!gameRunning) return;

    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    timerDisplay.innerText = `Time: ${elapsedTime}`;
}

function endGame() {
    gameRunning = false;
    cancelAnimationFrame(gameLoopId);
    clearInterval(enemySpawnInterval);
    clearInterval(timerInterval);
    document.removeEventListener('keydown', keyDownHandler);
    document.removeEventListener('keyup', keyUpHandler);
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    restartButton.style.display = 'block';
}

function restartGame() {
    restartButton.style.display = 'none';
    initGame();
}

function toggleMusic() {
    if (isMusicPlaying) {
        backgroundMusic.pause();
        musicToggleButton.innerText = 'Music: Off';
    } else {
        backgroundMusic.play();
        musicToggleButton.innerText = 'Music: On';
    }
    isMusicPlaying = !isMusicPlaying;
}

fetchPokemonImages().then(initGame);