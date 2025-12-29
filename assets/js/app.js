/**
 * app.js - Clean Rewrite v3.0
 * Core application logic for Karot game.
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
        debugTimer: document.getElementById('debug-timer')
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

    // Alert (beep + flash)
    const triggerAlert = () => {
        UI.flash.style.opacity = '0.4';
        const beep = new AudioContext();
        const osc = beep.createOscillator();
        const g = beep.createGain();
        osc.connect(g);
        g.connect(beep.destination);
        osc.frequency.value = 600;
        g.gain.setValueAtTime(0.1, beep.currentTime);
        osc.start();
        osc.stop(beep.currentTime + 0.15);
        setTimeout(() => { UI.flash.style.opacity = '0'; }, 200);
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
                triggerAlert();
                return word;
            }
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

        // Set auto-finalize timer (if no update for 2 seconds, finalize)
        interimTimer = setTimeout(() => {
            if (currentInterimText) {
                console.log("[App] Auto-finalize:", currentInterimText);
                finalizeLine(currentInterimText);
            }
        }, 2000);
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

        // Update button
        UI.startBtn.classList.toggle('bg-emerald-500', !isActive);
        UI.startBtn.classList.toggle('bg-red-500', isActive);
        UI.startBtn.querySelector('#play-icon').classList.toggle('hidden', isActive);
        UI.startBtn.querySelector('#stop-icon').classList.toggle('hidden', !isActive);

        // Update mic indicator
        UI.micPulse.classList.toggle('mic-active', isActive);
        UI.micText.innerText = isActive ? 'OYUNDA' : 'KAPALI';
        UI.micText.classList.toggle('text-blue-500', isActive);

        // Debug
        if (isActive) {
            startTime = Date.now();
            UI.debugStatus.innerText = "DURUM: DİNLİYOR";
            UI.debugStatus.className = "text-green-500 font-bold";
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                UI.debugTimer.innerText = `SÜRE: ${((Date.now() - startTime) / 1000).toFixed(1)}s`;
            }, 100);
        } else {
            clearInterval(timerInterval);
            UI.debugStatus.innerText = "DURUM: DURDU";
            UI.debugStatus.className = "text-red-500 font-bold";
        }
    });

    // Start/Stop Button
    UI.startBtn.onclick = () => {
        if (state.isPlaying) {
            window.SpeechService.stop();
        } else {
            window.SpeechService.start();
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

    // Initial Render
    render();
});
