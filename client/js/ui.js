// UI Manager
class UIManager {
    constructor() {
        this.currentScreen = 'loading';
        this.init();
    }

    init() {
        this.setupMenuButtons();
        this.setupModeSelection();
        this.setupSettings();
        this.setupGameControls();
        this.setupOnlineMultiplayer();
        this.setupLeaderboard();
    }

    setupMenuButtons() {
        // Main menu buttons
        document.querySelectorAll('.menu-btn[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                audioManager.play('menuClick');
                const action = e.target.dataset.action;
                this.handleMenuAction(action);
            });
        });
    }

    handleMenuAction(action) {
        switch(action) {
            case 'singleplayer':
                this.showScreen('mode-selection');
                break;
                
            case 'local-multiplayer':
                // Start local multiplayer with classic mode
                this.showScreen('game-screen');
                game.start('classic', false, true);
                break;
                
            case 'online-multiplayer':
                this.showScreen('online-menu');
                break;
                
            case 'leaderboard':
                this.showScreen('leaderboard-screen');
                leaderboardManager.displayLeaderboard('classic');
                break;
                
            case 'settings':
                this.showScreen('settings-menu');
                break;
                
            case 'back':
                this.showScreen('main-menu');
                break;
        }
    }

    setupModeSelection() {
        document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                audioManager.play('menuClick');
                const mode = e.currentTarget.dataset.mode;
                this.showScreen('game-screen');
                game.start(mode, false, false);
            });
        });
    }

    setupSettings() {
        // Control scheme
        const controlScheme = document.getElementById('control-scheme');
        controlScheme.value = game.settings.controlScheme;
        controlScheme.addEventListener('change', (e) => {
            game.settings.controlScheme = e.target.value;
            this.saveSettings();
        });
        
        // Difficulty
        const difficulty = document.getElementById('difficulty');
        difficulty.value = game.settings.difficulty;
        difficulty.addEventListener('change', (e) => {
            game.settings.difficulty = e.target.value;
            this.saveSettings();
        });
        
        // Paddle size
        const paddleSize = document.getElementById('paddle-size');
        paddleSize.value = game.settings.paddleSize;
        paddleSize.addEventListener('change', (e) => {
            game.settings.paddleSize = e.target.value;
            this.saveSettings();
        });
        
        // Ball speed
        const ballSpeed = document.getElementById('ball-speed');
        ballSpeed.value = game.settings.ballSpeed;
        ballSpeed.addEventListener('change', (e) => {
            game.settings.ballSpeed = e.target.value;
            this.saveSettings();
        });
        
        // CRT effect
        const crtEffect = document.getElementById('crt-effect');
        crtEffect.checked = game.settings.crtEffect;
        crtEffect.addEventListener('change', (e) => {
            game.settings.crtEffect = e.target.checked;
            if (e.target.checked) {
                document.body.classList.add('crt-effect');
            } else {
                document.body.classList.remove('crt-effect');
            }
            this.saveSettings();
        });
        
        // Glow effect
        const glowEffect = document.getElementById('glow-effect');
        glowEffect.checked = game.settings.glowEffect;
        glowEffect.addEventListener('change', (e) => {
            game.settings.glowEffect = e.target.checked;
            this.saveSettings();
        });
        
        // Sound
        const soundToggle = document.getElementById('sound-toggle');
        soundToggle.checked = audioManager.isEnabled();
        soundToggle.addEventListener('change', (e) => {
            audioManager.setEnabled(e.target.checked);
        });
        
        // Music (placeholder)
        const musicToggle = document.getElementById('music-toggle');
        musicToggle.addEventListener('change', (e) => {
            // Music functionality could be added here
            console.log('Music toggle:', e.target.checked);
        });
    }

    saveSettings() {
        Utils.saveToStorage('gameSettings', game.settings);
    }

    setupGameControls() {
        // Pause button
        document.getElementById('resume-btn').addEventListener('click', () => {
            audioManager.play('menuClick');
            game.resume();
        });
        
        // Restart button
        document.getElementById('restart-btn').addEventListener('click', () => {
            audioManager.play('menuClick');
            document.getElementById('pause-menu').classList.add('hidden');
            game.restart();
        });
        
        // Quit button
        document.getElementById('quit-btn').addEventListener('click', () => {
            audioManager.play('menuClick');
            document.getElementById('pause-menu').classList.add('hidden');
            game.quit();
            this.showScreen('main-menu');
        });
        
        // Play again button
        document.getElementById('play-again-btn').addEventListener('click', () => {
            audioManager.play('menuClick');
            document.getElementById('game-over').classList.add('hidden');
            game.restart();
        });
        
        // Menu button
        document.getElementById('menu-btn').addEventListener('click', () => {
            audioManager.play('menuClick');
            document.getElementById('game-over').classList.add('hidden');
            game.quit();
            this.showScreen('main-menu');
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && game.state === 'playing') {
                game.pause();
            }
        });
    }

    setupOnlineMultiplayer() {
        // Create room
        document.getElementById('create-room').addEventListener('click', () => {
            audioManager.play('menuClick');
            networkManager.createRoom('classic');
        });
        
        // Join room
        document.getElementById('join-room').addEventListener('click', () => {
            audioManager.play('menuClick');
            const roomCode = document.getElementById('room-code-input').value.toUpperCase();
            if (roomCode.length === 6) {
                networkManager.joinRoom(roomCode);
            } else {
                alert('Please enter a valid 6-character room code');
            }
        });
        
        // Format room code input
        const roomCodeInput = document.getElementById('room-code-input');
        roomCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
    }

    setupLeaderboard() {
        // Tab switching
        document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                audioManager.play('menuClick');
                
                // Update active tab
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Display leaderboard for selected tab
                const tab = e.target.dataset.tab;
                leaderboardManager.displayLeaderboard(tab);
            });
        });
    }

    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Show selected screen
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.remove('hidden');
            this.currentScreen = screenId;
        }
    }

    showLoading() {
        this.showScreen('loading-screen');
    }

    hideLoading() {
        setTimeout(() => {
            this.showScreen('main-menu');
        }, 2000);
    }
}

// Create UI manager instance
const uiManager = new UIManager();
