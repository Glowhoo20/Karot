/**
 * app.js - Modern Gamified Version
 * Core application logic for Karot game with achievements and leaderboard
 */
document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        words: JSON.parse(localStorage.getItem('k_words')) || ['elma', 'şey', 'bu'],
        players: JSON.parse(localStorage.getItem('k_players')) || [],
        isPlaying: false
    };

    // UI Elements
    const UI = {
        wordList: document.getElementById('forbidden-words-list'),
        playerList: document.getElementById('player-list'),
        transcriptFlow: document.getElementById('transcript-flow'),
        startBtn: document.getElementById('start-btn'),
        micPulse: document.getElementById('mic-pulse'),
        micText: document.getElementById('mic-text'),
        volumeBar: document.getElementById('volume-bar'),
        flash: document.getElementById('flash-overlay'),
        debugStatus: document.getElementById('debug-status'),
        debugTimer: document.getElementById('debug-timer'),
        achievementsList: document.getElementById('achievements-list'),
        leaderboardList: document.getElementById('leaderboard-list'),
        achievementProgress: document.getElementById('achievement-progress'),
        achievementTotal: document.getElementById('achievement-total'),
        statLevel: document.getElementById('stat-level'),
        statStreak: document.getElementById('stat-streak'),
        statAccuracy: document.getElementById('stat-accuracy'),
        statWords: document.getElementById('stat-words')
    };

    // Persistence
    const save = () => {
        localStorage.setItem('k_words', JSON.stringify(state.words));
        localStorage.setItem('k_players', JSON.stringify(state.players));
    };

    // Render Lists
    const render = () => {
        UI.wordList.innerHTML = state.words.map((w, i) => `
            <div class="glass-card p-3 rounded-xl flex justify-between items-center">
                <span class="font-bold text-sm uppercase truncate">${w}</span>
                <button onclick="window.app.delWord(${i})" class="text-slate-600 px-2">×</button>
            </div>
        `).join('');

        UI.playerList.innerHTML = state.players.map((p, i) => `
            <div class="glass-card p-4 rounded-2xl flex justify-between items-center">
                <div>
                    <div class="text-[10px] text-slate-500 font-bold uppercase">Oyuncu</div>
                    <div class="text-lg font-black">${p.name}</div>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="text-center bg-red-500/10 px-3 py-1 rounded-lg">
                        <div class="text-[8px] text-red-500 font-bold">CEZA</div>
                        <div class="text-xl font-mono text-red-500">${p.score}</div>
                    </div>
                    <button onclick="window.app.addPenalty(${i})" class="bg-red-500 text-white w-10 h-10 rounded-xl flex items-center justify-center active:scale-95">+</button>
                </div>
            </div>
        `).join('');
    };

    // Alert with effects
    const triggerAlert = (word = null) => {
        // Flash effect
        if (UI.flash) {
            UI.flash.style.opacity = '0.4';
            setTimeout(() => { UI.flash.style.opacity = '0'; }, 200);
        }
        
        // Particle explosion at center
        if (window.Effects) {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            window.Effects.createParticleExplosion(centerX, centerY, '#ef4444', 30);
        }
        
        // Sound effect
        if (window.playSound) {
            window.playSound('error');
        } else {
            // Fallback sound
            const beep = new AudioContext();
            const osc = beep.createOscillator();
            const g = beep.createGain();
            osc.connect(g);
            g.connect(beep.destination);
            osc.frequency.value = 400;
            g.gain.setValueAtTime(0.1, beep.currentTime);
            osc.start();
            osc.stop(beep.currentTime + 0.15);
        }
        
        // Record forbidden hit
        if (window.GameManager) {
            window.GameManager.recordForbiddenHit();
        }
    };

    // Exposed API
    window.app = {
        delWord: (i) => {
            state.words.splice(i, 1);
            save();
            render();
        },
        addPenalty: (i) => {
            state.players[i].score++;
            save();
            render();
            triggerAlert();
            
            // Add to leaderboard when game ends
            // This will be called manually by user, so we don't auto-add here
        }
    };

    // --- Transcript Logic ---
    let currentLine = null; // The live interim line element
    let currentInterimText = ''; // Track current interim text
    let interimTimer = null; // Timer for auto-finalization
    const detectedInSession = new Set();

    const checkForbidden = (text) => {
        const lower = text.toLowerCase();
        for (const word of state.words) {
            if (lower.includes(word) && !detectedInSession.has(word + ':' + text)) {
                detectedInSession.add(word + ':' + text);
                triggerAlert(word);
                
                // Record word detection
                if (window.GameManager) {
                    window.GameManager.recordWordDetected();
                }
                
                return word;
            }
        }
        
        // Record success (no forbidden word)
        if (text.trim() && window.GameManager) {
            window.GameManager.recordSuccess();
        }
        
        return null;
    };

    const highlightForbidden = (text) => {
        let html = text;
        state.words.forEach(w => {
            const regex = new RegExp(`(${w})`, 'gi');
            html = html.replace(regex, '<span class="text-red-500 font-bold bg-red-500/20 px-1 rounded">$1</span>');
        });
        return html;
    };

    const showInterim = (text) => {
        // Clear auto-finalize timer
        clearTimeout(interimTimer);

        // Remove placeholder if exists
        const placeholder = UI.transcriptFlow.querySelector('.text-slate-600');
        if (placeholder) placeholder.remove();

        // Check forbidden
        checkForbidden(text);

        // Create or update live line
        if (!currentLine) {
            currentLine = document.createElement('p');
            currentLine.className = 'text-blue-400 italic opacity-70';
            UI.transcriptFlow.appendChild(currentLine);
        }
        currentLine.innerHTML = highlightForbidden(text) + '<span class="animate-pulse">|</span>';
        currentInterimText = text;

        // Scroll to bottom
        UI.transcriptFlow.parentElement.scrollTop = UI.transcriptFlow.parentElement.scrollHeight;

        // Set auto-finalize timer (if no update for 1.2 seconds, finalize - daha hızlı yanıt için)
        interimTimer = setTimeout(() => {
            if (currentInterimText) {
                console.log("[App] Auto-finalize:", currentInterimText);
                finalizeLine(currentInterimText);
            }
        }, 1200); // 2 saniyeden 1.2 saniyeye düşürüldü - daha hızlı görünüm
    };

    const finalizeLine = (text) => {
        // Clear timer
        clearTimeout(interimTimer);

        // Check forbidden
        checkForbidden(text);

        // Remove current interim line
        if (currentLine) {
            currentLine.remove();
            currentLine = null;
        }
        currentInterimText = '';

        // Remove placeholder if exists
        const placeholder = UI.transcriptFlow.querySelector('.text-slate-600');
        if (placeholder) placeholder.remove();

        // Create timestamp
        const now = new Date();
        const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Create final line with timestamp
        const line = document.createElement('div');
        line.className = 'flex items-start gap-3';
        line.innerHTML = `
            <span class="text-slate-500 text-xs font-mono shrink-0">${timeStr}</span>
            <p class="text-white flex-1">${highlightForbidden(text)}</p>
        `;
        UI.transcriptFlow.appendChild(line);

        // Limit history to 10 to keep centered
        while (UI.transcriptFlow.children.length > 10) {
            UI.transcriptFlow.removeChild(UI.transcriptFlow.firstChild);
        }

        // Clear session detection
        detectedInSession.clear();
    };

    // --- Speech Service Bindings ---
    window.SpeechService.onInterim(showInterim);
    window.SpeechService.onFinal(finalizeLine);

    let startTime = 0;
    let timerInterval = null;

    window.SpeechService.onStatus((isActive) => {
        state.isPlaying = isActive;
        
        // Update game manager
        if (window.GameManager) {
            if (isActive) {
                window.GameManager.start();
            } else {
                window.GameManager.stop();
            }
        }

        // Update button
        UI.startBtn.classList.toggle('bg-emerald-500', !isActive);
        UI.startBtn.classList.toggle('bg-red-500', isActive);
        UI.startBtn.querySelector('#play-icon').classList.toggle('hidden', isActive);
        UI.startBtn.querySelector('#stop-icon').classList.toggle('hidden', !isActive);

        // Update mic indicator
        UI.micPulse.classList.toggle('mic-active', isActive);
        UI.micText.innerText = isActive ? 'OYUNDA' : 'KAPALI';
        UI.micText.classList.toggle('text-blue-500', isActive);

        // Update service info
        const serviceName = window.SpeechService.getCurrentService();
        const serviceDisplay = serviceName === 'google-cloud' ? 'GOOGLE CLOUD' : 
                              serviceName === 'web-speech' ? 'WEB SPEECH' : '-';
        const serviceEl = document.getElementById('debug-service');
        if (serviceEl) {
            serviceEl.textContent = `SERVİS: ${serviceDisplay}`;
            serviceEl.className = serviceName === 'google-cloud' ? 'text-yellow-400' : 
                                  serviceName === 'web-speech' ? 'text-blue-400' : 'text-slate-500';
        }

        // Update usage info (Google Cloud)
        const usageInfo = window.SpeechService.getUsageInfo();
        const usageEl = document.getElementById('usage-info');
        if (usageInfo && usageEl) {
            usageEl.classList.remove('hidden');
            document.getElementById('usage-minutes').textContent = `${usageInfo.minutes.toFixed(1)} dk`;
            document.getElementById('usage-remaining').textContent = `Kalan: ${usageInfo.remaining} dk (ücretsiz)`;
            
            if (!usageInfo.isFree) {
                document.getElementById('usage-remaining').textContent = 'ÜCRETLİ KULLANIM';
                document.getElementById('usage-remaining').className = 'text-xs text-red-500';
            }
        } else if (usageEl) {
            usageEl.classList.add('hidden');
        }

        // Debug
        if (isActive) {
            startTime = Date.now();
            UI.debugStatus.innerText = "DURUM: DİNLİYOR";
            UI.debugStatus.className = "text-green-500 font-bold";
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                UI.debugTimer.innerText = `SÜRE: ${((Date.now() - startTime) / 1000).toFixed(1)}s`;
                
                // Update usage periodically
                if (usageInfo) {
                    const currentUsage = window.SpeechService.getUsageInfo();
                    if (currentUsage) {
                        document.getElementById('usage-minutes').textContent = `${currentUsage.minutes.toFixed(1)} dk`;
                    }
                }
                
                // Update game stats
                if (window.GameManager) {
                    updateGameStats();
                }
            }, 100);
        } else {
            clearInterval(timerInterval);
            UI.debugStatus.innerText = "DURUM: DURDU";
            UI.debugStatus.className = "text-red-500 font-bold";
            
            // Final usage update
            if (usageInfo) {
                const finalUsage = window.SpeechService.getUsageInfo();
                if (finalUsage) {
                    document.getElementById('usage-minutes').textContent = `${finalUsage.minutes.toFixed(1)} dk`;
                    document.getElementById('usage-remaining').textContent = `Kalan: ${finalUsage.remaining} dk (ücretsiz)`;
                }
            }
        }
    });

    // Start/Stop Button
    UI.startBtn.onclick = async () => {
        if (state.isPlaying) {
            window.SpeechService.stop();
        } else {
            try {
                await window.SpeechService.start();
            } catch (error) {
                console.error("[App] Başlatma hatası:", error);
                alert("Konuşma tanıma başlatılamadı: " + error.message);
            }
        }
    };

    // Word Form
    document.getElementById('word-form').onsubmit = (e) => {
        e.preventDefault();
        const input = document.getElementById('word-input');
        const val = input.value.trim().toLowerCase();
        if (val && !state.words.includes(val)) {
            state.words.push(val);
            save();
            render();
        }
        input.value = '';
    };

    // Player Form
    document.getElementById('player-form').onsubmit = (e) => {
        e.preventDefault();
        const input = document.getElementById('player-input');
        const val = input.value.trim();
        if (val) {
            state.players.push({ name: val, score: 0 });
            save();
            render();
        }
        input.value = '';
    };

    // Reset Scores
    document.getElementById('reset-scores').onclick = () => {
        state.players.forEach(p => p.score = 0);
        save();
        render();
    };
    
    // Clear Leaderboard
    const clearLeaderboardBtn = document.getElementById('clear-leaderboard');
    if (clearLeaderboardBtn) {
        clearLeaderboardBtn.onclick = () => {
            if (confirm('Liderlik tablosunu temizlemek istediğinize emin misiniz?')) {
                if (window.LeaderboardManager) {
                    window.LeaderboardManager.clear();
                    renderLeaderboard();
                }
            }
        };
    }
    
    // Update Game Stats
    function updateGameStats() {
        if (!window.GameManager) return;
        
        const stats = window.GameManager.getStats();
        
        if (UI.statLevel) UI.statLevel.textContent = stats.level;
        if (UI.statStreak) UI.statStreak.textContent = stats.currentStreak;
        if (UI.statAccuracy) UI.statAccuracy.textContent = stats.accuracy.toFixed(0) + '%';
        if (UI.statWords) UI.statWords.textContent = stats.totalWordsDetected;
    }
    
    // Render Achievements
    window.renderAchievements = function() {
        if (!window.AchievementManager || !UI.achievementsList) return;
        
        const achievements = window.AchievementManager.getAchievements();
        const unlocked = window.AchievementManager.getUnlockedCount();
        const total = window.AchievementManager.getTotalCount();
        
        if (UI.achievementProgress) UI.achievementProgress.textContent = unlocked;
        if (UI.achievementTotal) UI.achievementTotal.textContent = total;
        
        UI.achievementsList.innerHTML = achievements.map(ach => {
            const progress = Math.min((ach.progress / ach.target) * 100, 100);
            return `
                <div class="glass-card p-4 rounded-xl ${ach.unlocked ? 'border-2 border-yellow-500' : 'opacity-60'}">
                    <div class="flex items-center space-x-3 mb-2">
                        <div class="text-3xl">${ach.icon}</div>
                        <div class="flex-1">
                            <div class="font-black text-sm">${ach.name}</div>
                            <div class="text-xs text-slate-400">${ach.description}</div>
                        </div>
                        ${ach.unlocked ? '<span class="text-yellow-500 text-xl">✓</span>' : ''}
                    </div>
                    <div class="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                        <div class="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
                    </div>
                    <div class="text-xs text-slate-500 mt-1 text-right">${ach.progress}/${ach.target}</div>
                </div>
            `;
        }).join('');
    };
    
    // Render Leaderboard
    window.renderLeaderboard = function() {
        if (!window.LeaderboardManager || !UI.leaderboardList) return;
        
        const entries = window.LeaderboardManager.getLeaderboard();
        
        if (entries.length === 0) {
            UI.leaderboardList.innerHTML = '<p class="text-slate-600 text-center py-8">Henüz liderlik kaydı yok</p>';
            return;
        }
        
        UI.leaderboardList.innerHTML = entries.map((entry, index) => `
            <div class="glass-card p-4 rounded-xl flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center font-black text-sm">
                        ${index + 1}
                    </div>
                    <div>
                        <div class="font-black">${entry.playerName}</div>
                        <div class="text-xs text-slate-400">${entry.date}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-xl font-black text-red-500">${entry.score}</div>
                    <div class="text-xs text-slate-500">Seviye ${entry.level} • %${entry.accuracy.toFixed(0)}</div>
                </div>
            </div>
        `).join('');
    };
    
    // Achievement unlock handler
    window.addEventListener('achievementUnlocked', (e) => {
        const achievement = e.detail;
        
        // Show toast
        if (window.showToast) {
            window.showToast(`🎉 ${achievement.name} başarımı açıldı!`, 'success', 4000);
        }
        
        // Confetti effect
        if (window.Effects) {
            window.Effects.createConfetti(100);
        }
        
        // Sound
        if (window.playSound) {
            window.playSound('levelup');
        }
        
        // Re-render achievements
        renderAchievements();
    });
    
    // Game stats update handler
    if (window.GameManager) {
        window.GameManager.onStateChange((stats) => {
            updateGameStats();
            
            // Update achievements
            if (window.AchievementManager) {
                window.AchievementManager.updateFromGameStats(stats);
            }
        });
        
        window.GameManager.onLevelUp((level) => {
            // Level up effects
            if (window.Effects) {
                window.Effects.createConfetti(50);
            }
            
            if (window.showToast) {
                window.showToast(`🎊 Seviye ${level}'e ulaştınız!`, 'success', 3000);
            }
            
            if (window.playSound) {
                window.playSound('levelup');
            }
        });
    }

    // Initial Render
    render();
    renderAchievements();
    renderLeaderboard();
    updateGameStats();
});
