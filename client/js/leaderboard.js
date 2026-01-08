// Leaderboard Manager
class LeaderboardManager {
    constructor() {
        this.serverUrl = window.location.origin;
        this.localLeaderboard = this.loadLocalLeaderboard();
        this.currentTab = 'classic';
    }

    // Load local leaderboard from localStorage
    loadLocalLeaderboard() {
        const saved = Utils.loadFromStorage('localLeaderboard', {
            classic: [],
            arcade: []
        });
        return saved;
    }

    // Save local leaderboard to localStorage
    saveLocalLeaderboard() {
        Utils.saveToStorage('localLeaderboard', this.localLeaderboard);
    }

    // Check if score qualifies for high score
    checkHighScore(score, mode) {
        // Check local leaderboard
        const localScores = this.localLeaderboard[mode] || [];
        const isLocalHighScore = localScores.length < 10 || score > localScores[localScores.length - 1].score;
        
        if (isLocalHighScore) {
            this.showNameEntry(score, mode);
        }
    }

    // Show name entry form
    showNameEntry(score, mode) {
        const nameEntry = document.getElementById('name-entry');
        nameEntry.classList.remove('hidden');
        
        const input = document.getElementById('player-name-input');
        const submitBtn = document.getElementById('submit-score-btn');
        
        // Load saved name if exists
        const savedName = Utils.loadFromStorage('playerName', '');
        input.value = savedName;
        
        submitBtn.onclick = () => {
            const name = input.value.trim() || 'Anonymous';
            Utils.saveToStorage('playerName', name);
            
            this.submitScore(name, score, mode);
            nameEntry.classList.add('hidden');
        };
    }

    // Submit score to both local and server leaderboards
    async submitScore(name, score, mode) {
        // Add to local leaderboard
        this.addToLocalLeaderboard(name, score, mode);
        
        // Try to submit to server
        try {
            await this.submitToServer(name, score, mode);
        } catch (error) {
            console.error('Failed to submit to server:', error);
        }
    }

    // Add score to local leaderboard
    addToLocalLeaderboard(name, score, mode) {
        if (!this.localLeaderboard[mode]) {
            this.localLeaderboard[mode] = [];
        }
        
        this.localLeaderboard[mode].push({
            name: name,
            score: score,
            timestamp: Date.now()
        });
        
        // Sort by score descending
        this.localLeaderboard[mode].sort((a, b) => b.score - a.score);
        
        // Keep only top 50
        this.localLeaderboard[mode] = this.localLeaderboard[mode].slice(0, 50);
        
        this.saveLocalLeaderboard();
    }

    // Submit score to server
    async submitToServer(name, score, mode) {
        const response = await fetch(`${this.serverUrl}/api/leaderboard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                score: score,
                mode: mode,
                timestamp: Date.now()
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit score');
        }
        
        return response.json();
    }

    // Fetch leaderboard from server
    async fetchServerLeaderboard(mode) {
        try {
            const response = await fetch(`${this.serverUrl}/api/leaderboard/${mode}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch leaderboard');
            }
            
            return response.json();
        } catch (error) {
            console.error('Failed to fetch server leaderboard:', error);
            return [];
        }
    }

    // Display leaderboard
    async displayLeaderboard(mode = 'classic') {
        this.currentTab = mode;
        const listElement = document.getElementById('leaderboard-list');
        listElement.innerHTML = '<p class="loading-text">Loading...</p>';
        
        let scores = [];
        
        if (mode === 'local') {
            // Show local leaderboard (combined classic and arcade)
            const classic = this.localLeaderboard.classic || [];
            const arcade = this.localLeaderboard.arcade || [];
            scores = [...classic, ...arcade].sort((a, b) => b.score - a.score).slice(0, 50);
        } else {
            // Try to fetch from server, fallback to local
            scores = await this.fetchServerLeaderboard(mode);
            
            if (scores.length === 0) {
                scores = this.localLeaderboard[mode] || [];
            }
        }
        
        // Render leaderboard
        this.renderLeaderboard(scores, listElement);
    }

    // Render leaderboard entries
    renderLeaderboard(scores, container) {
        if (scores.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 20px;">No scores yet. Be the first!</p>';
            return;
        }
        
        const savedName = Utils.loadFromStorage('playerName', '');
        
        container.innerHTML = scores.map((entry, index) => {
            const isPlayer = entry.name === savedName;
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
            
            return `
                <div class="leaderboard-entry ${isPlayer ? 'highlight' : ''}">
                    <span class="rank">${medal} ${rank}</span>
                    <span class="player-name">${this.escapeHtml(entry.name)}</span>
                    <span class="score">${entry.score}</span>
                </div>
            `;
        }).join('');
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Get player rank
    getPlayerRank(mode) {
        const savedName = Utils.loadFromStorage('playerName', '');
        if (!savedName) return null;
        
        const scores = this.localLeaderboard[mode] || [];
        const index = scores.findIndex(entry => entry.name === savedName);
        
        return index === -1 ? null : index + 1;
    }

    // Clear local leaderboard (for testing)
    clearLocalLeaderboard() {
        this.localLeaderboard = { classic: [], arcade: [] };
        this.saveLocalLeaderboard();
    }
}

// Create leaderboard manager instance
const leaderboardManager = new LeaderboardManager();
