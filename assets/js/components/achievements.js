/**
 * achievements.js - Achievement system
 */

class AchievementManager {
    constructor() {
        this.achievements = [
            {
                id: 'first_word',
                name: 'İlk Adım',
                description: 'İlk yasaklı kelimeyi tespit et',
                icon: '🎯',
                unlocked: false,
                progress: 0,
                target: 1
            },
            {
                id: 'word_master',
                name: 'Kelime Ustası',
                description: '10 yasaklı kelime tespit et',
                icon: '🏆',
                unlocked: false,
                progress: 0,
                target: 10
            },
            {
                id: 'perfect_game',
                name: 'Mükemmel Oyun',
                description: 'Hatasız bir oyun tamamla',
                icon: '⭐',
                unlocked: false,
                progress: 0,
                target: 1
            },
            {
                id: 'hour_warrior',
                name: 'Saat Savaşçısı',
                description: 'Toplam 1 saat oyun oyna',
                icon: '⏰',
                unlocked: false,
                progress: 0,
                target: 3600 // seconds
            },
            {
                id: 'streak_king',
                name: 'Seri Kralı',
                description: '10 ardışık başarılı kelime',
                icon: '🔥',
                unlocked: false,
                progress: 0,
                target: 10
            },
            {
                id: 'level_10',
                name: 'Seviye 10',
                description: 'Seviye 10\'a ulaş',
                icon: '💎',
                unlocked: false,
                progress: 0,
                target: 10
            }
        ];
        
        this._loadAchievements();
    }
    
    _loadAchievements() {
        const saved = localStorage.getItem('k_achievements');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.achievements = parsed;
            } catch (e) {
                console.error('[Achievements] Load error:', e);
            }
        }
    }
    
    _saveAchievements() {
        try {
            localStorage.setItem('k_achievements', JSON.stringify(this.achievements));
        } catch (e) {
            console.error('[Achievements] Save error:', e);
        }
    }
    
    updateProgress(achievementId, amount = 1) {
        const achievement = this.achievements.find(a => a.id === achievementId);
        if (!achievement || achievement.unlocked) return false;
        
        achievement.progress += amount;
        
        if (achievement.progress >= achievement.target) {
            achievement.unlocked = true;
            achievement.progress = achievement.target;
            this._saveAchievements();
            this._notifyUnlock(achievement);
            return true;
        }
        
        this._saveAchievements();
        return false;
    }
    
    updateFromGameStats(stats) {
        // Update achievements based on game stats
        this.updateProgress('first_word', stats.totalForbiddenHits > 0 ? 1 : 0);
        this.updateProgress('word_master', stats.totalForbiddenHits);
        this.updateProgress('perfect_game', stats.totalForbiddenHits === 0 && stats.totalWordsDetected > 0 ? 1 : 0);
        this.updateProgress('hour_warrior', Math.floor(stats.sessionDuration));
        this.updateProgress('streak_king', stats.currentStreak);
        this.updateProgress('level_10', stats.level);
    }
    
    getAchievements() {
        return this.achievements;
    }
    
    getUnlockedCount() {
        return this.achievements.filter(a => a.unlocked).length;
    }
    
    getTotalCount() {
        return this.achievements.length;
    }
    
    _notifyUnlock(achievement) {
        // Trigger unlock event
        const event = new CustomEvent('achievementUnlocked', {
            detail: achievement
        });
        window.dispatchEvent(event);
    }
    
    reset() {
        this.achievements.forEach(a => {
            a.unlocked = false;
            a.progress = 0;
        });
        this._saveAchievements();
    }
}

// Create global instance
window.AchievementManager = new AchievementManager();

