// Main Game Engine
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.state = 'menu'; // menu, playing, paused, gameover
        this.mode = 'classic'; // classic, arcade, timeattack, chaos, survival
        this.multiplayer = false;
        this.localMultiplayer = false;
        
        // Settings
        this.settings = {
            controlScheme: 'drag',
            difficulty: 'medium',
            paddleSize: 'medium',
            ballSpeed: 'medium',
            crtEffect: true,
            glowEffect: true,
            sound: true
        };
        
        // Game objects
        this.paddle1 = null;
        this.paddle2 = null;
        this.ball = null;
        this.balls = [];
        
        // Players
        this.player1 = { score: 0, hasShield: false };
        this.player2 = { score: 0, hasShield: false };
        
        // Timing
        this.lastTime = 0;
        this.gameTime = 0;
        this.timeLimit = 90; // For time attack mode
        
        // Controls
        this.keys = {};
        this.touches = {};
        
        // Power-ups
        this.powerUpManager = new PowerUpManager(this);
        
        // Animation frame ID
        this.animationId = null;
        
        // Initialize
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupCanvas();
        this.setupControls();
        this.initGameObjects();
        
        // Handle resize
        window.addEventListener('resize', Utils.debounce(() => this.setupCanvas(), 250));
        
        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.setupCanvas(), 100);
        });
    }

    loadSettings() {
        const saved = Utils.loadFromStorage('gameSettings');
        if (saved) {
            this.settings = { ...this.settings, ...saved };
        }
        
        // Apply settings
        if (this.settings.crtEffect) {
            document.body.classList.add('crt-effect');
        }
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        const maxWidth = window.innerWidth;
        const maxHeight = window.innerHeight - 100; // Leave space for HUD
        
        // Maintain 4:3 aspect ratio
        const aspectRatio = 4 / 3;
        let width, height;
        
        if (maxWidth / maxHeight > aspectRatio) {
            height = maxHeight;
            width = height * aspectRatio;
        } else {
            width = maxWidth;
            height = width / aspectRatio;
        }
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Re-initialize game objects if playing
        if (this.state === 'playing') {
            this.initGameObjects();
        }
    }

    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            // Pause on Escape
            if (e.key === 'Escape' && this.state === 'playing') {
                this.pause();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // Touch controls
        const leftZone = document.querySelector('.left-zone');
        const rightZone = document.querySelector('.right-zone');
        
        if (this.settings.controlScheme === 'drag') {
            this.setupDragControls(leftZone, rightZone);
        } else {
            this.setupTapControls(leftZone, rightZone);
        }
        
        // Prevent default touch behaviors
        document.addEventListener('touchmove', Utils.preventDefaultTouch, { passive: false });
        document.addEventListener('gesturestart', Utils.preventDefaultTouch, { passive: false });
    }

    setupDragControls(leftZone, rightZone) {
        const handleTouch = (e, zone, paddle) => {
            e.preventDefault();
            const touch = e.touches[0] || e.changedTouches[0];
            const rect = this.canvas.getBoundingClientRect();
            const y = touch.clientY - rect.top;
            const scaleY = this.canvas.height / rect.height;
            paddle.targetY = y * scaleY - paddle.height / 2;
        };
        
        leftZone.addEventListener('touchstart', (e) => handleTouch(e, 'left', this.paddle1), { passive: false });
        leftZone.addEventListener('touchmove', (e) => handleTouch(e, 'left', this.paddle1), { passive: false });
        
        rightZone.addEventListener('touchstart', (e) => handleTouch(e, 'right', this.paddle2), { passive: false });
        rightZone.addEventListener('touchmove', (e) => handleTouch(e, 'right', this.paddle2), { passive: false });
    }

    setupTapControls(leftZone, rightZone) {
        const handleTap = (e, paddle) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0] || e.changedTouches[0];
            const y = touch.clientY - rect.top;
            const scaleY = this.canvas.height / rect.height;
            const tapY = y * scaleY;
            
            // Move paddle towards tap position
            if (tapY < paddle.y + paddle.height / 2) {
                paddle.velocityY = -paddle.speed;
            } else {
                paddle.velocityY = paddle.speed;
            }
        };
        
        leftZone.addEventListener('touchstart', (e) => handleTap(e, this.paddle1), { passive: false });
        rightZone.addEventListener('touchstart', (e) => handleTap(e, this.paddle2), { passive: false });
        
        leftZone.addEventListener('touchend', () => { this.paddle1.velocityY = 0; }, { passive: false });
        rightZone.addEventListener('touchend', () => { this.paddle2.velocityY = 0; }, { passive: false });
    }

    initGameObjects() {
        const paddleSizes = {
            small: this.canvas.height * 0.12,
            medium: this.canvas.height * 0.15,
            large: this.canvas.height * 0.2
        };
        
        const paddleHeight = paddleSizes[this.settings.paddleSize];
        const paddleWidth = this.canvas.width * 0.02;
        
        // Paddles
        this.paddle1 = {
            x: 20,
            y: this.canvas.height / 2 - paddleHeight / 2,
            width: paddleWidth,
            height: paddleHeight,
            speed: this.canvas.height * 0.01,
            velocityY: 0,
            targetY: null,
            color: '#00f0ff'
        };
        
        this.paddle2 = {
            x: this.canvas.width - 20 - paddleWidth,
            y: this.canvas.height / 2 - paddleHeight / 2,
            width: paddleWidth,
            height: paddleHeight,
            speed: this.canvas.height * 0.01,
            velocityY: 0,
            targetY: null,
            color: '#ff10f0'
        };
        
        // Ball
        const ballSpeeds = {
            slow: this.canvas.width * 0.003,
            medium: this.canvas.width * 0.005,
            fast: this.canvas.width * 0.007
        };
        
        const ballSpeed = ballSpeeds[this.settings.ballSpeed];
        
        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            radius: this.canvas.width * 0.01,
            speed: ballSpeed,
            velocityX: ballSpeed * (Math.random() > 0.5 ? 1 : -1),
            velocityY: Utils.random(-ballSpeed / 2, ballSpeed / 2),
            color: '#ffff00'
        };
        
        this.balls = [this.ball];
        
        // Adjust AI difficulty
        const difficulties = {
            easy: 0.6,
            medium: 0.8,
            hard: 0.95
        };
        
        this.aiDifficulty = difficulties[this.settings.difficulty];
    }

    start(mode, isMultiplayer = false, isLocal = false) {
        this.mode = mode;
        this.multiplayer = isMultiplayer;
        this.localMultiplayer = isLocal;
        this.state = 'playing';
        
        // Reset game
        this.player1.score = 0;
        this.player2.score = 0;
        this.gameTime = 0;
        
        this.initGameObjects();
        this.powerUpManager.reset();
        
        // Update UI
        document.getElementById('game-mode-label').textContent = mode.toUpperCase();
        
        if (mode === 'timeattack') {
            document.getElementById('timer').classList.remove('hidden');
        } else {
            document.getElementById('timer').classList.add('hidden');
        }
        
        if (mode === 'chaos') {
            // Start with multiple balls
            for (let i = 0; i < 2; i++) {
                const newBall = {
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2,
                    radius: this.ball.radius,
                    speed: this.ball.speed,
                    velocityX: Utils.random(-1, 1) > 0 ? this.ball.speed : -this.ball.speed,
                    velocityY: Utils.random(-this.ball.speed / 2, this.ball.speed / 2),
                    color: '#ff10f0'
                };
                this.balls.push(newBall);
            }
        }
        
        // Start game loop
        this.lastTime = performance.now();
        this.gameLoop();
    }

    gameLoop() {
        if (this.state !== 'playing') return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.draw();
        
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        const dt = deltaTime / 16.67; // Normalize to 60fps
        
        // Update game time
        this.gameTime += deltaTime;
        
        // Time attack mode
        if (this.mode === 'timeattack') {
            const remaining = Math.max(0, this.timeLimit - Math.floor(this.gameTime / 1000));
            document.getElementById('timer').textContent = remaining;
            
            if (remaining === 0) {
                this.endGame();
                return;
            }
        }
        
        // Update paddles
        this.updatePaddle(this.paddle1, dt);
        
        if (this.localMultiplayer) {
            this.updatePaddle(this.paddle2, dt);
        } else if (!this.multiplayer) {
            this.updateAI(dt);
        }
        
        // Update balls
        this.balls.forEach((ball, index) => {
            this.updateBall(ball, dt);
            
            // Remove balls that went out of bounds
            if (ball.remove) {
                this.balls.splice(index, 1);
            }
        });
        
        // Keep at least one ball
        if (this.balls.length === 0) {
            this.balls.push({ ...this.ball });
            this.resetBall(this.balls[0]);
        }
        
        // Update power-ups
        this.powerUpManager.update(deltaTime);
        
        // Update UI
        document.getElementById('score-p1').textContent = this.player1.score;
        document.getElementById('score-p2').textContent = this.player2.score;
        
        // Check win condition
        if (this.mode !== 'timeattack') {
            const winScore = this.mode === 'survival' ? 1 : 11;
            if (this.player1.score >= winScore || this.player2.score >= winScore) {
                this.endGame();
            }
        }
    }

    updatePaddle(paddle, dt) {
        // Drag control with target
        if (paddle.targetY !== null) {
            const diff = paddle.targetY - paddle.y;
            paddle.velocityY = Utils.clamp(diff * 0.2, -paddle.speed * 2, paddle.speed * 2);
        }
        
        // Update position
        paddle.y += paddle.velocityY * dt;
        
        // Clamp to canvas
        paddle.y = Utils.clamp(paddle.y, 0, this.canvas.height - paddle.height);
    }

    updateAI(dt) {
        // AI controls paddle 2
        const paddle = this.paddle2;
        const ball = this.balls[0]; // Track first ball
        
        // Predict ball position
        const targetY = ball.y - paddle.height / 2;
        const diff = targetY - paddle.y;
        
        // Add some randomness based on difficulty
        if (Math.random() < this.aiDifficulty) {
            if (Math.abs(diff) > 10) {
                paddle.velocityY = diff > 0 ? paddle.speed : -paddle.speed;
            } else {
                paddle.velocityY = 0;
            }
        }
        
        paddle.y += paddle.velocityY * dt;
        paddle.y = Utils.clamp(paddle.y, 0, this.canvas.height - paddle.height);
    }

    updateBall(ball, dt) {
        // Update position
        ball.x += ball.velocityX * dt;
        ball.y += ball.velocityY * dt;
        
        // Wall collision (top/bottom)
        if (ball.y - ball.radius < 0 || ball.y + ball.radius > this.canvas.height) {
            ball.velocityY *= -1;
            ball.y = Utils.clamp(ball.y, ball.radius, this.canvas.height - ball.radius);
            audioManager.play('wallHit');
        }
        
        // Paddle collision
        if (Utils.ballPaddleCollision(ball, this.paddle1)) {
            if (ball.velocityX < 0) {
                this.handlePaddleHit(ball, this.paddle1, 'p1');
            }
        }
        
        if (Utils.ballPaddleCollision(ball, this.paddle2)) {
            if (ball.velocityX > 0) {
                this.handlePaddleHit(ball, this.paddle2, 'p2');
            }
        }
        
        // Scoring (ball out of bounds)
        if (ball.x - ball.radius < 0) {
            if (!this.player1.hasShield) {
                this.player2.score++;
                audioManager.play('score');
                ball.remove = this.balls.length > 1;
                if (this.balls.length === 1) {
                    this.resetBall(ball);
                }
            } else {
                ball.velocityX *= -1;
                ball.x = ball.radius;
            }
        } else if (ball.x + ball.radius > this.canvas.width) {
            if (!this.player2.hasShield) {
                this.player1.score++;
                audioManager.play('score');
                ball.remove = this.balls.length > 1;
                if (this.balls.length === 1) {
                    this.resetBall(ball);
                }
            } else {
                ball.velocityX *= -1;
                ball.x = this.canvas.width - ball.radius;
            }
        }
        
        // Survival mode: increase speed over time
        if (this.mode === 'survival' && this.gameTime % 5000 < 16) {
            ball.speed *= 1.01;
        }
    }

    handlePaddleHit(ball, paddle, player) {
        audioManager.play('paddleHit');
        
        // Calculate bounce angle
        const bounceAngle = Utils.calculateBounceAngle(ball, paddle);
        const direction = player === 'p1' ? 1 : -1;
        
        // Update velocity
        ball.velocityX = direction * ball.speed * Math.cos(bounceAngle);
        ball.velocityY = ball.speed * -Math.sin(bounceAngle);
        
        // Move ball away from paddle
        if (player === 'p1') {
            ball.x = paddle.x + paddle.width + ball.radius;
        } else {
            ball.x = paddle.x - ball.radius;
        }
        
        // Increase speed slightly in chaos mode
        if (this.mode === 'chaos') {
            ball.speed *= 1.02;
        }
    }

    resetBall(ball) {
        ball.x = this.canvas.width / 2;
        ball.y = this.canvas.height / 2;
        ball.velocityX = ball.speed * (Math.random() > 0.5 ? 1 : -1);
        ball.velocityY = Utils.random(-ball.speed / 2, ball.speed / 2);
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#0a0014';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw center line
        this.drawCenterLine();
        
        // Draw paddles
        this.drawPaddle(this.paddle1);
        this.drawPaddle(this.paddle2);
        
        // Draw shields
        if (this.player1.hasShield) {
            this.drawShield(this.paddle1);
        }
        if (this.player2.hasShield) {
            this.drawShield(this.paddle2);
        }
        
        // Draw balls
        this.balls.forEach(ball => this.drawBall(ball));
        
        // Draw power-ups
        this.powerUpManager.draw(this.ctx);
    }

    drawCenterLine() {
        this.ctx.strokeStyle = '#2a0845';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawPaddle(paddle) {
        this.ctx.fillStyle = paddle.color;
        
        if (this.settings.glowEffect) {
            this.ctx.shadowColor = paddle.color;
            this.ctx.shadowBlur = 20;
        }
        
        this.ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
        this.ctx.shadowBlur = 0;
    }

    drawBall(ball) {
        this.ctx.fillStyle = ball.color;
        
        if (this.settings.glowEffect) {
            this.ctx.shadowColor = ball.color;
            this.ctx.shadowBlur = 30;
        }
        
        this.ctx.beginPath();
        this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }

    drawShield(paddle) {
        this.ctx.strokeStyle = '#b026ff';
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = '#b026ff';
        this.ctx.shadowBlur = 20;
        
        const x = paddle.x === 20 ? 5 : this.canvas.width - 5;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.canvas.height);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }

    pause() {
        if (this.state !== 'playing') return;
        this.state = 'paused';
        cancelAnimationFrame(this.animationId);
        document.getElementById('pause-menu').classList.remove('hidden');
    }

    resume() {
        if (this.state !== 'paused') return;
        this.state = 'playing';
        document.getElementById('pause-menu').classList.add('hidden');
        this.lastTime = performance.now();
        this.gameLoop();
    }

    restart() {
        this.resume();
        this.start(this.mode, this.multiplayer, this.localMultiplayer);
    }

    endGame() {
        this.state = 'gameover';
        cancelAnimationFrame(this.animationId);
        
        // Show game over screen
        const gameOverTitle = document.getElementById('game-over-title');
        const finalScoreText = document.getElementById('final-score-text');
        
        if (this.mode === 'timeattack') {
            gameOverTitle.textContent = 'TIME\'S UP!';
            finalScoreText.textContent = `P1: ${this.player1.score} - P2: ${this.player2.score}`;
        } else {
            const winner = this.player1.score > this.player2.score ? 'PLAYER 1' : 'PLAYER 2';
            gameOverTitle.textContent = `${winner} WINS!`;
            finalScoreText.textContent = `${this.player1.score} - ${this.player2.score}`;
        }
        
        document.getElementById('game-over').classList.remove('hidden');
        audioManager.play('gameOver');
        
        // Check for high score
        this.checkHighScore();
    }

    checkHighScore() {
        // Implementation in leaderboard.js
        if (window.leaderboardManager) {
            const score = Math.max(this.player1.score, this.player2.score);
            leaderboardManager.checkHighScore(score, this.mode);
        }
    }

    quit() {
        this.state = 'menu';
        cancelAnimationFrame(this.animationId);
        this.powerUpManager.reset();
    }
}

// Create game instance
const game = new Game();
