// Retro Pong Server
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const Database = require('better-sqlite3');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.PORT || 3000;
const MAX_SUBMISSIONS_PER_MINUTE = 5; // Rate limiting: max score submissions per minute
const VALID_GAME_MODES = ['classic', 'arcade', 'timeattack', 'chaos', 'survival'];
const LEADERBOARD_MODES = ['classic', 'arcade'];

// Initialize database
const db = new Database('./pong.db');
initDatabase();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Rate limiting middleware
const rateLimits = new Map();

function rateLimitMiddleware(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimits.has(ip)) {
        rateLimits.set(ip, []);
    }
    
    const requests = rateLimits.get(ip);
    const recentRequests = requests.filter(time => now - time < 60000); // Last minute
    
    if (recentRequests.length >= 60) { // 60 requests per minute
        return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
    
    // Push current timestamp to the filtered array and update the map
    recentRequests.push(now);
    rateLimits.set(ip, recentRequests);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) {
        for (const [key, value] of rateLimits.entries()) {
            if (value.every(time => now - time > 300000)) { // 5 minutes old
                rateLimits.delete(key);
            }
        }
    }
    
    next();
}

// Apply rate limiting to API routes
app.use('/api', rateLimitMiddleware);

// In-memory game rooms
const rooms = new Map();
const playerRooms = new Map();

// Rate limiting map for score submissions
const submissionRates = new Map();

// Initialize database schema
function initDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS leaderboard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            score INTEGER NOT NULL,
            mode TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            ip_hash TEXT,
            verified BOOLEAN DEFAULT 0
        );
        
        CREATE INDEX IF NOT EXISTS idx_mode_score ON leaderboard(mode, score DESC);
        CREATE INDEX IF NOT EXISTS idx_timestamp ON leaderboard(timestamp DESC);
    `);
    
    console.log('Database initialized');
}

// Generate unique room code
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    do {
        code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (rooms.has(code));
    return code;
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    console.log('New client connected');
    const playerId = generatePlayerId();
    
    ws.playerId = playerId;
    ws.isAlive = true;
    
    ws.on('pong', () => {
        ws.isAlive = true;
    });
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (error) {
            console.error('Error parsing message:', error);
            ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
        }
    });
    
    ws.on('close', () => {
        console.log('Client disconnected:', playerId);
        handleDisconnect(ws);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Heartbeat to detect broken connections
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
            console.log('Terminating inactive connection');
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(heartbeatInterval);
});

// Handle WebSocket messages
function handleMessage(ws, data) {
    switch (data.type) {
        case 'create-room':
            handleCreateRoom(ws, data);
            break;
            
        case 'join-room':
            handleJoinRoom(ws, data);
            break;
            
        case 'leave-room':
            handleLeaveRoom(ws, data);
            break;
            
        case 'start-game':
            handleStartGame(ws, data);
            break;
            
        case 'player-input':
            handlePlayerInput(ws, data);
            break;
            
        case 'game-state':
            handleGameState(ws, data);
            break;
            
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: data.timestamp }));
            break;
            
        default:
            console.log('Unknown message type:', data.type);
    }
}

function handleCreateRoom(ws, data) {
    const roomCode = generateRoomCode();
    const room = {
        code: roomCode,
        host: ws.playerId,
        players: [ws.playerId],
        mode: data.mode || 'classic',
        state: 'waiting',
        createdAt: Date.now()
    };
    
    rooms.set(roomCode, room);
    playerRooms.set(ws.playerId, roomCode);
    
    ws.send(JSON.stringify({
        type: 'room-created',
        roomCode: roomCode,
        playerId: ws.playerId
    }));
    
    console.log(`Room created: ${roomCode}`);
}

function handleJoinRoom(ws, data) {
    const roomCode = data.roomCode.toUpperCase();
    
    // Validate room code format (6 uppercase alphanumeric characters)
    if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid room code format' }));
        return;
    }
    
    const room = rooms.get(roomCode);
    
    if (!room) {
        ws.send(JSON.stringify({ type: 'error', error: 'Room not found' }));
        return;
    }
    
    if (room.players.length >= 2) {
        ws.send(JSON.stringify({ type: 'error', error: 'Room is full' }));
        return;
    }
    
    if (room.state !== 'waiting') {
        ws.send(JSON.stringify({ type: 'error', error: 'Game already in progress' }));
        return;
    }
    
    room.players.push(ws.playerId);
    playerRooms.set(ws.playerId, roomCode);
    
    ws.send(JSON.stringify({
        type: 'room-joined',
        roomCode: roomCode,
        playerId: ws.playerId
    }));
    
    // Notify host that player joined
    broadcastToRoom(roomCode, {
        type: 'player-joined',
        playerId: ws.playerId
    }, ws.playerId);
    
    console.log(`Player ${ws.playerId} joined room ${roomCode}`);
}

function handleLeaveRoom(ws, data) {
    const roomCode = playerRooms.get(ws.playerId);
    if (roomCode) {
        removePlayerFromRoom(ws.playerId, roomCode);
    }
}

function handleStartGame(ws, data) {
    const room = rooms.get(data.roomCode);
    if (!room) return;
    
    if (room.host !== ws.playerId) {
        ws.send(JSON.stringify({ type: 'error', error: 'Only host can start the game' }));
        return;
    }
    
    if (room.players.length < 2) {
        ws.send(JSON.stringify({ type: 'error', error: 'Waiting for second player' }));
        return;
    }
    
    room.state = 'playing';
    
    broadcastToRoom(data.roomCode, {
        type: 'game-start',
        mode: room.mode
    });
    
    console.log(`Game started in room ${data.roomCode}`);
}

function handlePlayerInput(ws, data) {
    // Forward input to other player in room
    broadcastToRoom(data.roomCode, {
        type: 'player-input',
        playerId: ws.playerId,
        paddleY: data.paddleY,
        timestamp: data.timestamp
    }, ws.playerId);
}

function handleGameState(ws, data) {
    const room = rooms.get(data.roomCode);
    if (!room || room.host !== ws.playerId) return;
    
    // Host broadcasts authoritative game state
    broadcastToRoom(data.roomCode, {
        type: 'game-state',
        state: data.state,
        timestamp: data.timestamp
    }, ws.playerId);
}

function handleDisconnect(ws) {
    const roomCode = playerRooms.get(ws.playerId);
    if (roomCode) {
        removePlayerFromRoom(ws.playerId, roomCode);
        
        // Notify other players
        broadcastToRoom(roomCode, {
            type: 'player-left',
            playerId: ws.playerId
        });
    }
}

function removePlayerFromRoom(playerId, roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;
    
    room.players = room.players.filter(id => id !== playerId);
    playerRooms.delete(playerId);
    
    // Delete room if empty
    if (room.players.length === 0) {
        rooms.delete(roomCode);
        console.log(`Room ${roomCode} deleted (empty)`);
    } else if (room.host === playerId) {
        // Transfer host to remaining player
        room.host = room.players[0];
    }
}

function broadcastToRoom(roomCode, message, excludePlayerId = null) {
    const room = rooms.get(roomCode);
    if (!room) return;
    
    const messageStr = JSON.stringify(message);
    
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN &&
            room.players.includes(client.playerId) &&
            client.playerId !== excludePlayerId) {
            client.send(messageStr);
        }
    });
}

function generatePlayerId() {
    return 'p' + Math.random().toString(36).substring(2, 11);
}

// REST API for leaderboard
app.post('/api/leaderboard', (req, res) => {
    try {
        const { name, score, mode, timestamp } = req.body;
        
        // Validation
        if (!name || !score || !mode) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (typeof score !== 'number' || score < 0 || score > 100) {
            return res.status(400).json({ error: 'Invalid score' });
        }
        
        if (!LEADERBOARD_MODES.includes(mode)) {
            return res.status(400).json({ error: 'Invalid mode' });
        }
        
        // Rate limiting
        const ip = req.ip || req.connection.remoteAddress;
        const ipHash = hashIP(ip);
        const now = Date.now();
        
        if (!submissionRates.has(ipHash)) {
            submissionRates.set(ipHash, []);
        }
        
        const submissions = submissionRates.get(ipHash);
        const recentSubmissions = submissions.filter(time => now - time < 60000);
        
        if (recentSubmissions.length >= MAX_SUBMISSIONS_PER_MINUTE) {
            return res.status(429).json({ error: 'Rate limit exceeded. Please wait before submitting again.' });
        }
        
        recentSubmissions.push(now);
        submissionRates.set(ipHash, recentSubmissions);
        
        // Validate and sanitize player name
        const sanitizedName = name.trim();
        if (!sanitizedName || sanitizedName.length === 0 || /^\s*$/.test(sanitizedName)) {
            return res.status(400).json({ error: 'Invalid player name' });
        }
        
        // Anti-cheat: Basic score validation
        const verified = validateScore(score, mode);
        
        // Insert into database
        const stmt = db.prepare(`
            INSERT INTO leaderboard (name, score, mode, timestamp, ip_hash, verified)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
            sanitizedName.substring(0, 20),
            score,
            mode,
            timestamp || Date.now(),
            ipHash,
            verified ? 1 : 0
        );
        
        res.json({ success: true, id: result.lastInsertRowid });
        
    } catch (error) {
        console.error('Error saving score:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/leaderboard/:mode', (req, res) => {
    try {
        const mode = req.params.mode;
        
        if (!LEADERBOARD_MODES.includes(mode)) {
            return res.status(400).json({ error: 'Invalid mode' });
        }
        
        const stmt = db.prepare(`
            SELECT name, score, timestamp
            FROM leaderboard
            WHERE mode = ?
            ORDER BY score DESC, timestamp ASC
            LIMIT 50
        `);
        
        const scores = stmt.all(mode);
        res.json(scores);
        
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Simple score validation (can be enhanced)
function validateScore(score, mode) {
    // Basic checks - can be made more sophisticated
    if (score > 100) return false; // Suspiciously high
    if (score < 0) return false; // Invalid
    return true;
}

// Hash IP for privacy
function hashIP(ip) {
    return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

// Serve index.html for all routes (SPA) - with rate limiting
app.get('*', rateLimitMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Start server
server.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`  RETRO PONG SERVER`);
    console.log(`===========================================`);
    console.log(`  Server running on port ${PORT}`);
    console.log(`  http://localhost:${PORT}`);
    console.log(`===========================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        db.close();
        process.exit(0);
    });
});
