# RETRO PONG 🎮

A mobile-first, retro-themed Pong game with synthwave aesthetics, power-ups, and online multiplayer.

## ✨ Features

### Core Gameplay
- **Classic Pong mechanics** with modern enhancements
- **5 Game Modes**:
  - **Classic**: Pure Pong action
  - **Arcade**: Power-ups enabled
  - **Time Attack**: Score as much as possible in 90 seconds
  - **Chaos**: Multi-ball madness with faster speed ramps
  - **Survival**: One life, ever-increasing difficulty

### Mobile-First Design
- Touch-optimized controls (drag paddle or tap zones)
- Works seamlessly on iPhone, Android, tablets, and desktop
- Prevents accidental scrolling/zooming during gameplay
- Responsive design with automatic canvas scaling
- Handles orientation changes gracefully

### Retro Aesthetic
- **Synthwave color palette** (neon pink, cyan, purple, yellow)
- Optional **CRT and glow effects**
- Glitch text animations
- Pixel-perfect arcade typography
- Optimized for 60fps on mobile devices

### Audio System
- Retro sound effects using Web Audio API
- Procedurally generated sounds (paddle hit, wall hit, score, power-ups)
- Mute toggle with localStorage persistence
- Respects mobile autoplay restrictions

### Control Schemes
1. **Drag Paddle**: Touch and drag along screen edges
2. **Tap Zones**: Tap upper/lower areas to move paddle
3. **Keyboard**: W/S for Player 1, Arrow keys for Player 2
4. All controls are user-selectable in settings

### Power-Up System
Six exciting power-ups with visual indicators:
- **Paddle Grow/Shrink**: Temporary size changes
- **Multi-Ball**: Spawn additional balls
- **Slow-Mo**: Slow down time
- **Speed Boost**: Increase ball speed
- **Shield**: Protect your goal temporarily

### Multiplayer Options
- **Local Multiplayer**: Two players on same device
- **Online Multiplayer**: Real-time head-to-head via WebSockets
  - Create/join rooms with 6-character codes
  - Latency compensation and state interpolation
  - Reconnection handling
  - Server-authoritative architecture

### Leaderboard System
- **Global leaderboards** for Classic and Arcade modes
- **Local leaderboard** stored in localStorage as fallback
- Server-backed persistence with SQLite
- Rate limiting (5 submissions per minute)
- Basic anti-cheat validation
- Top 50 rankings with player highlights

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. **Clone or download the repository**
   ```bash
   git clone https://github.com/mikejmckinney/pong4.git
   cd pong4
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser**
   ```
   http://localhost:3000
   ```

That's it! The game is ready to play.

## 📁 Project Structure

```
pong4/
├── client/                 # Frontend assets
│   ├── index.html         # Main HTML file
│   ├── styles.css         # Synthwave styling
│   └── js/                # JavaScript modules
│       ├── audio.js       # Audio system
│       ├── game.js        # Game engine
│       ├── powerups.js    # Power-up system
│       ├── network.js     # Online multiplayer
│       ├── leaderboard.js # Leaderboard management
│       ├── ui.js          # UI management
│       ├── utils.js       # Utility functions
│       └── main.js        # Entry point
├── server/                # Backend
│   └── server.js          # Express + WebSocket server
├── package.json           # Dependencies
└── README.md             # This file
```

## 🎮 How to Play

### Single Player
1. Click **Single Player** from the main menu
2. Choose a game mode
3. Control your paddle with:
   - **Touch**: Drag along the left side (mobile)
   - **Keyboard**: W/S keys (desktop)
4. Beat the AI to win!

### Local Multiplayer
1. Click **Local Multiplayer**
2. Player 1 uses left side / W,S keys
3. Player 2 uses right side / Arrow keys
4. First to 11 points wins!

### Online Multiplayer
1. Click **Online Multiplayer**
2. **Create Room**: Get a 6-character code to share
3. **Join Room**: Enter your opponent's code
4. Wait for connection and play!

### Settings
- **Control Scheme**: Drag or Tap controls
- **Difficulty**: Easy, Medium, Hard AI
- **Paddle Size**: Small, Medium, Large
- **Ball Speed**: Slow, Medium, Fast
- **Visual Effects**: Toggle CRT and glow effects
- **Sound**: Mute/unmute audio

## 🏗️ Architecture

### Client Architecture
- **Modular JavaScript**: Separate files for different systems
- **Game Loop**: 60fps target with delta time normalization
- **State Management**: Centralized game state
- **Event-Driven UI**: Clean separation of concerns

### Server Architecture
- **Express.js**: HTTP server for static files and API
- **WebSocket (ws)**: Real-time bidirectional communication
- **SQLite**: Persistent leaderboard storage
- **Room-based system**: Isolated game sessions

### Online Multiplayer Design
- **Server-Authoritative**: Host client sends state, server validates
- **State Interpolation**: Smooth 100ms lag compensation
- **Client Prediction**: Responsive local input
- **Reconnection**: Automatic reconnect with exponential backoff
- **Anti-Cheat**: Server validates score ranges and rates

### Performance Optimizations
- **Efficient rendering**: Minimal canvas operations
- **Touch handling**: Passive event listeners where possible
- **Automatic quality adjustment**: Disables effects on low FPS
- **RequestAnimationFrame**: Smooth 60fps animation
- **Debounced resize**: Prevents excessive recalculations

## 🔒 Security & Anti-Cheat

### Server-Side Validation
- Score range validation (0-100 points)
- Rate limiting (5 submissions per minute per IP)
- IP hashing for privacy
- Input sanitization

### Recommendations for Production
- Add HTTPS/WSS for encrypted connections
- Implement JWT authentication for multiplayer
- Add replay verification for competitive play
- Use cloud database (PostgreSQL) instead of SQLite
- Implement more sophisticated anti-cheat heuristics
- Add CAPTCHA for leaderboard submissions

## 🧪 Testing Checklist

### Mobile Testing
- [x] Touch input reliability on iOS and Android
- [x] Portrait and landscape orientation support
- [x] No accidental scrolling during gameplay
- [x] No zoom on double-tap
- [x] Audio works after user interaction
- [x] Performance maintains 60fps on mid-range devices

### Desktop Testing
- [x] Keyboard controls work properly
- [x] Window resizing maintains aspect ratio
- [x] All game modes function correctly
- [x] Pause/resume works as expected

### Multiplayer Testing
- [x] Room creation and joining
- [x] State synchronization
- [x] Latency compensation
- [x] Reconnection handling
- [x] Player disconnect handling

### Leaderboard Testing
- [x] Score submission and retrieval
- [x] Rate limiting enforcement
- [x] Local fallback when offline
- [x] Score validation

## 🐛 Troubleshooting

### Audio Not Working
- Ensure you've interacted with the page (click/tap)
- Check that sound isn't muted in settings
- Try refreshing the page

### Connection Issues (Online Multiplayer)
- Ensure server is running
- Check firewall settings
- Verify WebSocket connection in browser console
- Try creating a new room

### Performance Issues
- Disable CRT and glow effects in settings
- Close other browser tabs
- Update to latest browser version
- Check device isn't in low-power mode

### Database Errors
- Delete `pong.db` and restart server to reset
- Ensure write permissions in server directory

## 🔧 Configuration

### Environment Variables
```bash
PORT=3000  # Server port (default: 3000)
```

### Game Settings
All settings are configurable in the Settings menu and persist in localStorage:
- Control scheme
- Difficulty
- Paddle size
- Ball speed
- Visual effects
- Audio preferences

## 📱 Browser Compatibility

### Fully Supported
- Chrome/Edge 90+
- Safari 14+
- Firefox 88+
- Mobile browsers (iOS Safari, Chrome Mobile)

### Required Features
- Canvas API
- Web Audio API
- WebSocket API
- localStorage
- Touch Events (mobile)

## 🚧 Future Enhancements

- [ ] Progressive Web App (PWA) with offline support
- [ ] Ranked competitive mode
- [ ] Tournament system
- [ ] Custom themes/skins
- [ ] Replay system
- [ ] Spectator mode
- [ ] Voice chat integration
- [ ] Controller/gamepad support (partial)
- [ ] AI difficulty learning
- [ ] Achievement system

## 📄 License

MIT License - See LICENSE file for details

## 👥 Credits

- Developed by: michael mckinney
- Inspired by classic Pong and synthwave aesthetics
- Built with vanilla JavaScript, no frameworks required!

## 🤝 Contributing

Contributions welcome! Please feel free to submit issues or pull requests.

---

**Enjoy the game! 🎮✨**