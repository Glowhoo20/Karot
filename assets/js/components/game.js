/**
 * game.js - Game logic and state management
 */

class GameManager {
    constructor() {
        this.state = {
            isPlaying: false,
            startTime: null,
            sessionDuration: 0,
            totalWordsDetected: 0,
            totalForbiddenHits: 0,
            currentStreak: 0,
            bestStreak: 0,
            level: 1,
            experience: 0,
            experienceToNextLevel: 100
        };
        
        this.callbacks = {
            onStateChange: null,
            onLevelUp: null,
            onStreakUpdate: null
        };
        
        this._loadState();
    }
    
    _loadState() {
        const saved = localStorage.getItem('k_game_state');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.state = { ...this.state, ...parsed };
            } catch (e) {
                console.error('[Game] Load state error:', e);
            }
        }
    }
    
    _saveState() {
        try {
            localStorage.setItem('k_game_state', JSON.stringify(this.state));
        } catch (e) {
            console.error('[Game] Save state error:', e);
        }
    }
    
    start() {
        this.state.isPlaying = true;
        this.state.startTime = Date.now();
        this.state.sessionDuration = 0;
        this._notifyStateChange();
        this._saveState();
    }
    
    stop() {
        if (this.state.startTime) {
            this.state.sessionDuration = (Date.now() - this.state.startTime) / 1000;
        }
        this.state.isPlaying = false;
        this._notifyStateChange();
        this._saveState();
    }
    
    recordWordDetected() {
        this.state.totalWordsDetected++;
        this._saveState();
        this._notifyStateChange();
    }
    
    recordForbiddenHit() {
        this.state.totalForbiddenHits++;
        this.state.currentStreak = 0; // Reset streak on error
        this._saveState();
        this._notifyStateChange();
    }
    
    recordSuccess() {
        this.state.currentStreak++;
        if (this.state.currentStreak > this.state.bestStreak) {
            this.state.bestStreak = this.state.currentStreak;
        }
        
        // Add experience
        this.addExperience(10);
        
        this._saveState();
        this._notifyStateChange();
        
        if (this.callbacks.onStreakUpdate) {
            this.callbacks.onStreakUpdate(this.state.currentStreak);
        }
    }
    
    addExperience(amount) {
        this.state.experience += amount;
        
        // Check level up
        while (this.state.experience >= this.state.experienceToNextLevel) {
            this.state.experience -= this.state.experienceToNextLevel;
            this.state.level++;
            this.state.experienceToNextLevel = Math.floor(this.state.experienceToNextLevel * 1.5);
            
            if (this.callbacks.onLevelUp) {
                this.callbacks.onLevelUp(this.state.level);
            }
        }
        
        this._saveState();
        this._notifyStateChange();
    }
    
    getStats() {
        const accuracy = this.state.totalWordsDetected > 0 
            ? ((this.state.totalWordsDetected - this.state.totalForbiddenHits) / this.state.totalWordsDetected * 100).toFixed(1)
            : 100;
        
        return {
            ...this.state,
            accuracy: parseFloat(accuracy),
            currentSessionTime: this.state.isPlaying && this.state.startTime
                ? (Date.now() - this.state.startTime) / 1000
                : this.state.sessionDuration
        };
    }
    
    reset() {
        this.state = {
            isPlaying: false,
            startTime: null,
            sessionDuration: 0,
            totalWordsDetected: 0,
            totalForbiddenHits: 0,
            currentStreak: 0,
            bestStreak: this.state.bestStreak, // Keep best streak
            level: this.state.level, // Keep level
            experience: this.state.experience, // Keep experience
            experienceToNextLevel: this.state.experienceToNextLevel
        };
        this._saveState();
        this._notifyStateChange();
    }
    
    _notifyStateChange() {
        if (this.callbacks.onStateChange) {
            this.callbacks.onStateChange(this.getStats());
        }
    }
    
    onStateChange(cb) { this.callbacks.onStateChange = cb; }
    onLevelUp(cb) { this.callbacks.onLevelUp = cb; }
    onStreakUpdate(cb) { this.callbacks.onStreakUpdate = cb; }
}

// Create global instance
window.GameManager = new GameManager();

