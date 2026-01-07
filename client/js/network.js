// Network Manager for Online Multiplayer
class NetworkManager {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.roomCode = null;
        this.isHost = false;
        this.playerId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.latency = 0;
        this.lastPingTime = 0;
        
        // State interpolation for smooth gameplay
        this.remoteState = {
            paddle: { y: 0 },
            ball: { x: 0, y: 0 }
        };
        
        this.stateBuffer = [];
        this.interpolationDelay = 100; // ms
    }

    // Connect to server
    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port || '3000';
        
        try {
            this.ws = new WebSocket(`${protocol}//${host}:${port}`);
            
            this.ws.onopen = () => this.onOpen();
            this.ws.onmessage = (event) => this.onMessage(event);
            this.ws.onclose = () => this.onClose();
            this.ws.onerror = (error) => this.onError(error);
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.showError('Failed to connect to server');
        }
    }

    onOpen() {
        console.log('Connected to server');
        this.connected = true;
        this.reconnectAttempts = 0;
        
        // Start ping interval for latency measurement
        this.pingInterval = setInterval(() => this.ping(), 1000);
    }

    onMessage(event) {
        try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        } catch (error) {
            console.error('Failed to parse message:', error);
        }
    }

    onClose() {
        console.log('Disconnected from server');
        this.connected = false;
        clearInterval(this.pingInterval);
        
        // Attempt reconnection if in a game
        if (this.roomCode && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnect();
        }
    }

    onError(error) {
        console.error('WebSocket error:', error);
        this.showError('Connection error occurred');
    }

    reconnect() {
        this.reconnectAttempts++;
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        setTimeout(() => {
            this.connect();
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    handleMessage(message) {
        switch (message.type) {
            case 'room-created':
                this.onRoomCreated(message);
                break;
                
            case 'room-joined':
                this.onRoomJoined(message);
                break;
                
            case 'player-joined':
                this.onPlayerJoined(message);
                break;
                
            case 'game-start':
                this.onGameStart(message);
                break;
                
            case 'game-state':
                this.onGameState(message);
                break;
                
            case 'player-input':
                this.onPlayerInput(message);
                break;
                
            case 'game-over':
                this.onGameOver(message);
                break;
                
            case 'player-left':
                this.onPlayerLeft(message);
                break;
                
            case 'error':
                this.showError(message.error);
                break;
                
            case 'pong':
                this.onPong(message);
                break;
        }
    }

    // Create a new room
    createRoom(mode = 'classic') {
        if (!this.connected) {
            this.connect();
            // Wait for connection, then create room
            setTimeout(() => {
                if (this.connected) {
                    this.createRoom(mode);
                }
            }, 1000);
            return;
        }
        
        this.isHost = true;
        this.send({
            type: 'create-room',
            mode: mode
        });
    }

    // Join an existing room
    joinRoom(roomCode) {
        if (!this.connected) {
            this.connect();
            setTimeout(() => {
                if (this.connected) {
                    this.joinRoom(roomCode);
                }
            }, 1000);
            return;
        }
        
        this.isHost = false;
        this.send({
            type: 'join-room',
            roomCode: roomCode
        });
    }

    // Leave current room
    leaveRoom() {
        if (this.roomCode) {
            this.send({
                type: 'leave-room',
                roomCode: this.roomCode
            });
            this.roomCode = null;
            this.isHost = false;
        }
    }

    // Send player input to server
    sendInput(paddleY) {
        if (!this.connected || !this.roomCode) return;
        
        this.send({
            type: 'player-input',
            roomCode: this.roomCode,
            playerId: this.playerId,
            paddleY: paddleY,
            timestamp: Date.now()
        });
    }

    // Send game state (host only)
    sendGameState(state) {
        if (!this.connected || !this.roomCode || !this.isHost) return;
        
        this.send({
            type: 'game-state',
            roomCode: this.roomCode,
            state: state,
            timestamp: Date.now()
        });
    }

    // Ping server for latency measurement
    ping() {
        if (!this.connected) return;
        
        this.lastPingTime = Date.now();
        this.send({
            type: 'ping',
            timestamp: this.lastPingTime
        });
    }

    onPong(message) {
        this.latency = Date.now() - message.timestamp;
    }

    onRoomCreated(message) {
        this.roomCode = message.roomCode;
        this.playerId = message.playerId;
        
        document.getElementById('room-code').textContent = this.roomCode;
        document.getElementById('room-info').classList.remove('hidden');
        document.getElementById('room-status').textContent = 'Waiting for opponent...';
    }

    onRoomJoined(message) {
        this.roomCode = message.roomCode;
        this.playerId = message.playerId;
        
        document.getElementById('room-info').classList.remove('hidden');
        document.getElementById('room-status').textContent = 'Connected! Starting game...';
    }

    onPlayerJoined(message) {
        if (this.isHost) {
            document.getElementById('room-status').textContent = 'Opponent joined! Starting game...';
            
            // Host starts the game
            setTimeout(() => {
                this.send({
                    type: 'start-game',
                    roomCode: this.roomCode
                });
            }, 2000);
        }
    }

    onGameStart(message) {
        // Hide online menu and start game
        document.getElementById('online-menu').classList.add('hidden');
        
        // Start multiplayer game
        game.start(message.mode, true, false);
        
        // If not host, receive state from host
        if (!this.isHost) {
            this.startReceivingState();
        }
    }

    onGameState(message) {
        if (this.isHost) return; // Host doesn't receive state
        
        // Add state to buffer for interpolation
        this.stateBuffer.push({
            timestamp: message.timestamp,
            state: message.state
        });
        
        // Keep buffer size manageable
        if (this.stateBuffer.length > 10) {
            this.stateBuffer.shift();
        }
    }

    onPlayerInput(message) {
        if (!this.isHost) return; // Only host processes input
        
        // Update opponent paddle based on input
        const paddle = message.playerId === this.playerId ? game.paddle1 : game.paddle2;
        
        // Apply client-side prediction compensation
        const latencyCompensation = this.latency / 2;
        paddle.targetY = message.paddleY;
    }

    onGameOver(message) {
        game.endGame();
    }

    onPlayerLeft(message) {
        this.showError('Opponent disconnected');
        game.quit();
        this.leaveRoom();
    }

    startReceivingState() {
        // Interpolate between received states for smooth gameplay
        this.stateUpdateInterval = setInterval(() => {
            if (this.stateBuffer.length < 2) return;
            
            const now = Date.now();
            const renderTime = now - this.interpolationDelay;
            
            // Find two states to interpolate between
            let state0 = null;
            let state1 = null;
            
            for (let i = 0; i < this.stateBuffer.length - 1; i++) {
                if (this.stateBuffer[i].timestamp <= renderTime && 
                    this.stateBuffer[i + 1].timestamp >= renderTime) {
                    state0 = this.stateBuffer[i];
                    state1 = this.stateBuffer[i + 1];
                    break;
                }
            }
            
            if (state0 && state1) {
                // Interpolate
                const t = (renderTime - state0.timestamp) / (state1.timestamp - state0.timestamp);
                
                // Apply interpolated state to game
                if (game.balls[0]) {
                    game.balls[0].x = Utils.lerp(state0.state.ball.x, state1.state.ball.x, t);
                    game.balls[0].y = Utils.lerp(state0.state.ball.y, state1.state.ball.y, t);
                }
                
                // Update opponent paddle (player 1 if we're player 2)
                const opponentPaddle = this.playerId === 'p1' ? game.paddle2 : game.paddle1;
                opponentPaddle.y = Utils.lerp(
                    state0.state.opponentPaddle.y,
                    state1.state.opponentPaddle.y,
                    t
                );
                
                // Update scores
                game.player1.score = state1.state.score.p1;
                game.player2.score = state1.state.score.p2;
                
                // Remove old states
                this.stateBuffer = this.stateBuffer.filter(s => s.timestamp >= renderTime - 1000);
            }
        }, 16); // ~60fps
    }

    // Send data to server
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    showError(message) {
        console.error('Network error:', message);
        Utils.showToast(`Network Error: ${message}`, 5000);
    }

    disconnect() {
        if (this.ws) {
            clearInterval(this.pingInterval);
            clearInterval(this.stateUpdateInterval);
            this.ws.close();
            this.ws = null;
            this.connected = false;
            this.roomCode = null;
        }
    }
}

// Create network manager instance
const networkManager = new NetworkManager();
