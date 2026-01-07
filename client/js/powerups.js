// Power-up System
class PowerUpManager {
    constructor(game) {
        this.game = game;
        this.activePowerUps = [];
        this.powerUpTypes = {
            paddleGrow: {
                name: 'PADDLE GROW',
                color: '#39ff14',
                rarity: 0.2,
                duration: 8000,
                effect: (player) => {
                    const paddle = player === 'p1' ? this.game.paddle1 : this.game.paddle2;
                    paddle.originalHeight = paddle.height;
                    paddle.height *= 1.5;
                }
            },
            paddleShrink: {
                name: 'PADDLE SHRINK',
                color: '#ff1010',
                rarity: 0.15,
                duration: 8000,
                effect: (player) => {
                    const paddle = player === 'p1' ? this.game.paddle1 : this.game.paddle2;
                    paddle.originalHeight = paddle.height;
                    paddle.height *= 0.6;
                }
            },
            speedBoost: {
                name: 'SPEED BOOST',
                color: '#ffff00',
                rarity: 0.25,
                duration: 5000,
                effect: () => {
                    this.game.balls.forEach(ball => {
                        ball.originalSpeed = ball.speed;
                        ball.speed *= 1.5;
                    });
                }
            },
            slowMo: {
                name: 'SLOW MOTION',
                color: '#00f0ff',
                rarity: 0.2,
                duration: 6000,
                effect: () => {
                    this.game.balls.forEach(ball => {
                        ball.originalSpeed = ball.speed;
                        ball.speed *= 0.5;
                    });
                }
            },
            multiBall: {
                name: 'MULTI-BALL',
                color: '#ff10f0',
                rarity: 0.1,
                duration: 0,
                effect: () => {
                    // Create 2 additional balls
                    for (let i = 0; i < 2; i++) {
                        const newBall = {
                            x: this.game.canvas.width / 2,
                            y: this.game.canvas.height / 2,
                            radius: this.game.ball.radius,
                            speed: this.game.ball.speed,
                            velocityX: Utils.random(-1, 1) > 0 ? this.game.ball.speed : -this.game.ball.speed,
                            velocityY: Utils.random(-3, 3),
                            color: '#ff10f0'
                        };
                        this.game.balls.push(newBall);
                    }
                }
            },
            shield: {
                name: 'SHIELD',
                color: '#b026ff',
                rarity: 0.1,
                duration: 10000,
                effect: (player) => {
                    if (player === 'p1') {
                        this.game.player1.hasShield = true;
                    } else {
                        this.game.player2.hasShield = true;
                    }
                }
            }
        };
        this.spawnTimer = 0;
        this.spawnInterval = 15000; // Spawn every 15 seconds
    }

    // Update power-up spawning and active effects
    update(deltaTime) {
        if (this.game.mode !== 'arcade' && this.game.mode !== 'chaos') return;

        // Spawn new power-ups
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnPowerUp();
        }

        // Update active power-ups
        this.activePowerUps.forEach((powerUp, index) => {
            // Check collision with ball
            this.game.balls.forEach(ball => {
                const distance = Utils.distance(ball.x, ball.y, powerUp.x, powerUp.y);
                if (distance < ball.radius + powerUp.radius) {
                    this.collectPowerUp(powerUp, index);
                }
            });

            // Update duration
            if (powerUp.duration > 0) {
                powerUp.duration -= deltaTime;
                if (powerUp.duration <= 0) {
                    this.deactivatePowerUp(powerUp);
                    this.activePowerUps.splice(index, 1);
                }
            }
        });
    }

    // Spawn a new power-up
    spawnPowerUp() {
        // Select random power-up based on rarity
        const rand = Math.random();
        let cumulative = 0;
        let selectedType = null;

        for (const [key, type] of Object.entries(this.powerUpTypes)) {
            cumulative += type.rarity;
            if (rand <= cumulative) {
                selectedType = key;
                break;
            }
        }

        if (!selectedType) return;

        const powerUp = {
            type: selectedType,
            x: Utils.random(this.game.canvas.width * 0.3, this.game.canvas.width * 0.7),
            y: Utils.random(this.game.canvas.height * 0.2, this.game.canvas.height * 0.8),
            radius: 15,
            collected: false,
            duration: this.powerUpTypes[selectedType].duration,
            color: this.powerUpTypes[selectedType].color,
            rotation: 0
        };

        this.activePowerUps.push(powerUp);
    }

    // Collect a power-up
    collectPowerUp(powerUp, index) {
        if (powerUp.collected) return;

        powerUp.collected = true;
        const type = this.powerUpTypes[powerUp.type];
        
        // Determine which player collected it (based on ball direction)
        const ball = this.game.balls[0];
        const player = ball.velocityX > 0 ? 'p2' : 'p1';
        
        // Apply effect
        type.effect(player);
        
        // Show indicator
        this.showPowerUpIndicator(type.name, powerUp.duration);
        
        // Play sound
        audioManager.play('powerUp');
        
        // Remove from spawn list if it has no duration (instant effect)
        if (powerUp.duration === 0) {
            this.activePowerUps.splice(index, 1);
        }
    }

    // Deactivate a power-up effect
    deactivatePowerUp(powerUp) {
        const type = powerUp.type;
        
        switch(type) {
            case 'paddleGrow':
            case 'paddleShrink':
                // Reset paddle size
                if (this.game.paddle1.originalHeight) {
                    this.game.paddle1.height = this.game.paddle1.originalHeight;
                }
                if (this.game.paddle2.originalHeight) {
                    this.game.paddle2.height = this.game.paddle2.originalHeight;
                }
                break;
                
            case 'speedBoost':
            case 'slowMo':
                // Reset ball speed
                this.game.balls.forEach(ball => {
                    if (ball.originalSpeed) {
                        ball.speed = ball.originalSpeed;
                        // Adjust velocity to maintain direction
                        const angle = Math.atan2(ball.velocityY, ball.velocityX);
                        ball.velocityX = Math.cos(angle) * ball.speed;
                        ball.velocityY = Math.sin(angle) * ball.speed;
                    }
                });
                break;
                
            case 'shield':
                this.game.player1.hasShield = false;
                this.game.player2.hasShield = false;
                break;
        }
    }

    // Show power-up indicator in UI
    showPowerUpIndicator(name, duration) {
        const indicator = document.getElementById('power-up-indicator');
        const nameEl = document.getElementById('power-up-name');
        const timerBar = document.getElementById('power-up-timer-bar');
        
        indicator.classList.remove('hidden');
        nameEl.textContent = name;
        
        if (duration > 0) {
            let remaining = duration;
            const interval = setInterval(() => {
                remaining -= 100;
                const percent = (remaining / duration) * 100;
                timerBar.style.width = percent + '%';
                
                if (remaining <= 0) {
                    clearInterval(interval);
                    indicator.classList.add('hidden');
                }
            }, 100);
        } else {
            // Instant effect, hide after 2 seconds
            setTimeout(() => {
                indicator.classList.add('hidden');
            }, 2000);
        }
    }

    // Draw power-ups
    draw(ctx) {
        this.activePowerUps.forEach(powerUp => {
            if (powerUp.collected) return;
            
            ctx.save();
            
            // Rotation animation
            powerUp.rotation += 0.05;
            
            ctx.translate(powerUp.x, powerUp.y);
            ctx.rotate(powerUp.rotation);
            
            // Draw power-up as a glowing square
            ctx.fillStyle = powerUp.color;
            ctx.shadowColor = powerUp.color;
            ctx.shadowBlur = 20;
            ctx.fillRect(-powerUp.radius, -powerUp.radius, powerUp.radius * 2, powerUp.radius * 2);
            
            // Draw inner square
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(-powerUp.radius/2, -powerUp.radius/2, powerUp.radius, powerUp.radius);
            
            ctx.restore();
        });
    }

    // Reset power-ups
    reset() {
        this.activePowerUps = [];
        this.spawnTimer = 0;
        
        // Reset all effects
        if (this.game.paddle1) {
            this.game.paddle1.height = this.game.paddle1.originalHeight || this.game.paddle1.height;
        }
        if (this.game.paddle2) {
            this.game.paddle2.height = this.game.paddle2.originalHeight || this.game.paddle2.height;
        }
        
        this.game.balls.forEach(ball => {
            if (ball.originalSpeed) {
                ball.speed = ball.originalSpeed;
            }
        });
        
        this.game.player1.hasShield = false;
        this.game.player2.hasShield = false;
        
        // Hide indicator
        const indicator = document.getElementById('power-up-indicator');
        indicator.classList.add('hidden');
    }
}
