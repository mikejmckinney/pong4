// Main Application Entry Point
(function() {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        console.log('Initializing Retro Pong...');
        
        // Initialize audio on first user interaction
        initAudioOnInteraction();
        
        // Hide loading screen after a short delay
        setTimeout(() => {
            uiManager.hideLoading();
        }, 2000);
        
        // Setup keyboard controls for game
        setupGameKeyboardControls();
        
        // Prevent accidental page navigation
        preventAccidentalNavigation();
        
        // Handle visibility changes (pause on tab switch)
        handleVisibilityChange();
        
        // Setup performance monitoring
        if (Utils.isMobile()) {
            setupPerformanceMonitoring();
        }
        
        console.log('Retro Pong initialized successfully!');
    }

    function initAudioOnInteraction() {
        const events = ['click', 'touchstart', 'keydown'];
        
        const initAudio = () => {
            if (!audioManager.initialized) {
                audioManager.init();
                console.log('Audio initialized');
            }
        };
        
        events.forEach(event => {
            document.addEventListener(event, initAudio, { once: true });
        });
    }

    function setupGameKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (game.state !== 'playing') return;
            
            // Player 1 controls (W/S)
            if (e.key === 'w' || e.key === 'W') {
                game.paddle1.velocityY = -game.paddle1.speed;
            } else if (e.key === 's' || e.key === 'S') {
                game.paddle1.velocityY = game.paddle1.speed;
            }
            
            // Player 2 controls (Arrow keys) - for local multiplayer
            if (game.localMultiplayer) {
                if (e.key === 'ArrowUp') {
                    game.paddle2.velocityY = -game.paddle2.speed;
                    e.preventDefault();
                } else if (e.key === 'ArrowDown') {
                    game.paddle2.velocityY = game.paddle2.speed;
                    e.preventDefault();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (game.state !== 'playing') return;
            
            // Player 1 stop
            if (e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S') {
                game.paddle1.velocityY = 0;
            }
            
            // Player 2 stop
            if (game.localMultiplayer) {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    game.paddle2.velocityY = 0;
                }
            }
        });
    }

    function preventAccidentalNavigation() {
        // Prevent pull-to-refresh on mobile
        let lastTouchY = 0;
        
        document.addEventListener('touchstart', (e) => {
            lastTouchY = e.touches[0].clientY;
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            const touchY = e.touches[0].clientY;
            const touchYDelta = touchY - lastTouchY;
            lastTouchY = touchY;
            
            // Prevent pull-to-refresh if at top of page and scrolling down
            if (window.scrollY === 0 && touchYDelta > 0) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Prevent pinch-to-zoom
        document.addEventListener('gesturestart', (e) => {
            e.preventDefault();
        });
        
        // Prevent double-tap zoom
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Prevent context menu on long press
        document.addEventListener('contextmenu', (e) => {
            if (game.state === 'playing') {
                e.preventDefault();
            }
        });
    }

    function handleVisibilityChange() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && game.state === 'playing') {
                game.pause();
            }
        });
        
        // Also handle window blur
        window.addEventListener('blur', () => {
            if (game.state === 'playing') {
                game.pause();
            }
        });
    }

    function setupPerformanceMonitoring() {
        let frameCount = 0;
        let lastFpsUpdate = performance.now();
        let fps = 60;
        
        function updateFPS() {
            frameCount++;
            const now = performance.now();
            
            if (now - lastFpsUpdate >= 1000) {
                fps = Math.round(frameCount * 1000 / (now - lastFpsUpdate));
                frameCount = 0;
                lastFpsUpdate = now;
                
                // Warn if FPS drops below 30
                if (fps < 30) {
                    console.warn(`Low FPS detected: ${fps}`);
                    
                    // Automatically disable effects if performance is poor
                    if (game.settings.glowEffect) {
                        console.log('Disabling glow effect to improve performance');
                        game.settings.glowEffect = false;
                        document.getElementById('glow-effect').checked = false;
                    }
                }
            }
            
            if (game.state === 'playing') {
                requestAnimationFrame(updateFPS);
            }
        }
        
        // Start monitoring when game starts
        const originalStart = game.start.bind(game);
        game.start = function(...args) {
            originalStart(...args);
            frameCount = 0;
            lastFpsUpdate = performance.now();
            updateFPS();
        };
    }

    // Expose game to window for debugging
    if (typeof window !== 'undefined') {
        window.game = game;
        window.audioManager = audioManager;
        window.networkManager = networkManager;
        window.leaderboardManager = leaderboardManager;
        window.uiManager = uiManager;
    }

    // Service Worker for offline support (optional enhancement)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Uncomment to enable service worker
            // navigator.serviceWorker.register('/sw.js')
            //     .then(reg => console.log('Service Worker registered'))
            //     .catch(err => console.log('Service Worker registration failed'));
        });
    }

    // Log mobile device info for debugging
    if (Utils.isMobile()) {
        console.log('Mobile device detected');
        console.log('User Agent:', navigator.userAgent);
        console.log('Screen size:', window.screen.width, 'x', window.screen.height);
        console.log('Viewport size:', window.innerWidth, 'x', window.innerHeight);
        console.log('Orientation:', Utils.getOrientation());
        console.log('Touch points:', navigator.maxTouchPoints);
    }
})();
