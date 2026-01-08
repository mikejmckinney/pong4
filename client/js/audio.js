// Audio System using Web Audio API
class AudioManager {
    constructor() {
        this.context = null;
        this.enabled = true;
        this.initialized = false;
        this.sounds = {};
    }

    // Initialize audio context (must be called after user interaction)
    async init() {
        if (this.initialized) return;
        
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.enabled = localStorage.getItem('soundEnabled') !== 'false';
            this.initialized = true;
            
            // Generate all sound effects
            this.generateSounds();
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
            this.enabled = false;
        }
    }

    // Generate retro sound effects programmatically
    generateSounds() {
        // These are parameters for each sound - we'll generate them on-the-fly
        this.sounds = {
            paddleHit: { freq: 220, duration: 0.1, type: 'square' },
            wallHit: { freq: 440, duration: 0.08, type: 'triangle' },
            score: { freq: [523, 659, 784], duration: 0.15, type: 'sine' },
            powerUp: { freq: [392, 523, 659, 784], duration: 0.1, type: 'square' },
            menuClick: { freq: 880, duration: 0.05, type: 'square' },
            gameOver: { freq: [392, 349, 330, 294], duration: 0.2, type: 'sawtooth' },
            countdown: { freq: 1046, duration: 0.1, type: 'sine' }
        };
    }

    // Play a sound effect
    play(soundName) {
        if (!this.enabled || !this.initialized || !this.context) return;

        const sound = this.sounds[soundName];
        if (!sound) return;

        const now = this.context.currentTime;
        
        if (Array.isArray(sound.freq)) {
            // Play sequence of notes
            sound.freq.forEach((freq, index) => {
                this.playTone(freq, sound.duration, sound.type, now + (index * sound.duration));
            });
        } else {
            // Play single tone
            this.playTone(sound.freq, sound.duration, sound.type, now);
        }
    }

    // Generate and play a tone
    playTone(frequency, duration, type, startTime) {
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        // Envelope for smoother sound
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    // Toggle sound on/off
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('soundEnabled', this.enabled);
        return this.enabled;
    }

    // Set enabled state
    setEnabled(enabled) {
        this.enabled = enabled;
        localStorage.setItem('soundEnabled', enabled);
    }

    // Check if sound is enabled
    isEnabled() {
        return this.enabled;
    }
}

// Export singleton instance
const audioManager = new AudioManager();
