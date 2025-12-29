/**
 * leaderboard.js - Leaderboard system
 */

class LeaderboardManager {
    constructor() {
        this.entries = [];
        this.maxEntries = 10;
        this._loadLeaderboard();
    }
    
    _loadLeaderboard() {
        const saved = localStorage.getItem('k_leaderboard');
        if (saved) {
            try {
                this.entries = JSON.parse(saved);
            } catch (e) {
                console.error('[Leaderboard] Load error:', e);
            }
        }
    }
    
    _saveLeaderboard() {
        try {
            localStorage.setItem('k_leaderboard', JSON.stringify(this.entries));
        } catch (e) {
            console.error('[Leaderboard] Save error:', e);
        }
    }
    
    addEntry(playerName, score, stats) {
        const entry = {
            id: Date.now().toString(),
            playerName,
            score,
            level: stats.level || 1,
            accuracy: stats.accuracy || 0,
            streak: stats.bestStreak || 0,
            wordsDetected: stats.totalWordsDetected || 0,
            timestamp: Date.now(),
            date: new Date().toLocaleDateString('tr-TR')
        };
        
        this.entries.push(entry);
        
        // Sort by score (descending)
        this.entries.sort((a, b) => b.score - a.score);
        
        // Keep only top entries
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(0, this.maxEntries);
        }
        
        this._saveLeaderboard();
        return entry;
    }
    
    getLeaderboard() {
        return this.entries;
    }
    
    getTopPlayers(count = 5) {
        return this.entries.slice(0, count);
    }
    
    getPlayerRank(playerName) {
        const index = this.entries.findIndex(e => e.playerName === playerName);
        return index >= 0 ? index + 1 : null;
    }
    
    clear() {
        this.entries = [];
        this._saveLeaderboard();
    }
}

// Create global instance
window.LeaderboardManager = new LeaderboardManager();

