/**
 * Main Application Logic (Mobile Redesign)
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const state = {
        forbiddenWords: JSON.parse(localStorage.getItem('karot_words')) || ['elma', 'bu', 'yani', 'şey'],
        players: JSON.parse(localStorage.getItem('karot_players')) || [],
        isPlaying: false,
    };

    // --- DOM Elements ---
    const elements = {
        wordForm: document.getElementById('word-form'),
        wordInput: document.getElementById('word-input'),
        wordsList: document.getElementById('forbidden-words-list'),
        playerForm: document.getElementById('player-form'),
        playerInput: document.getElementById('player-input'),
        playerList: document.getElementById('player-list'),
        startBtn: document.getElementById('start-btn'),
        playIcon: document.getElementById('play-icon'),
        stopIcon: document.getElementById('stop-icon'),
        transcriptFlow: document.getElementById('transcript-flow'),
        micPulse: document.getElementById('mic-pulse'),
        micText: document.getElementById('mic-text'),
        flashOverlay: document.getElementById('flash-overlay'),
        resetScores: document.getElementById('reset-scores'),
        volumeBar: document.getElementById('volume-bar'),
    };

    // --- Audio Analysis (Visualizer) ---
    let audioContext, analyser, microphone, javascriptNode;

    const setupVolumeMeter = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            microphone = audioContext.createMediaStreamSource(stream);
            javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

            analyser.smoothingTimeConstant = 0.8;
            analyser.fftSize = 1024;
            microphone.connect(analyser);
            analyser.connect(javascriptNode);
            javascriptNode.connect(audioContext.destination);

            javascriptNode.onaudioprocess = () => {
                const array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(array);
                let values = array.reduce((a, b) => a + b, 0);
                const average = values / array.length;
                if (elements.volumeBar) elements.volumeBar.style.width = Math.min(100, average * 3) + '%';
            };
        } catch (e) {
            console.error("Mic access error:", e);
        }
    };

    // --- Audio Feedback (Beep) ---
    const playBeep = () => {
        try {
            const ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.className = 'osc';
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } catch (e) { }
    };

    // --- UI Rendering ---
    const saveState = () => {
        localStorage.setItem('karot_words', JSON.stringify(state.forbiddenWords));
        localStorage.setItem('karot_players', JSON.stringify(state.players));
    };

    const renderWords = () => {
        elements.wordsList.innerHTML = state.forbiddenWords.map((word, index) => `
            <div class="glass p-3 rounded-xl flex justify-between items-center animate-fadeIn">
                <span class="font-bold text-sm truncate mr-2">${word}</span>
                <button onclick="removeWord(${index})" class="text-slate-500"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
        `).join('');
    };

    const renderPlayers = () => {
        elements.playerList.innerHTML = state.players.map((player, index) => `
            <div class="glass p-4 rounded-2xl flex justify-between items-center group">
                <div>
                    <div class="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Oyuncu</div>
                    <div class="text-xl font-extrabold text-white">${player.name}</div>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="text-center">
                        <div class="text-[10px] text-red-500 font-bold uppercase tracking-widest">Ceza</div>
                        <div class="text-2xl font-mono text-red-500">${player.score}</div>
                    </div>
                    <button onclick="addPenalty(${index})" class="bg-red-500/20 text-red-500 p-3 rounded-xl active:bg-red-500 active:text-white transition-colors">
                        <svg class="w-6 h-6" fill="6" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    </button>
                    <button onclick="removePlayer(${index})" class="text-slate-600 ml-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>
        `).join('');
    };

    // --- Game Logic ---
    let detectedWordsInCurrentSegment = new Set();
    const triggerFlash = () => {
        elements.flashOverlay.style.opacity = '0.3';
        document.body.classList.add('shake');
        setTimeout(() => {
            elements.flashOverlay.style.opacity = '0';
            document.body.classList.remove('shake');
        }, 200);
    };

    window.removeWord = (index) => { state.forbiddenWords.splice(index, 1); saveState(); renderWords(); };
    window.removePlayer = (index) => { state.players.splice(index, 1); saveState(); renderPlayers(); };
    window.addPenalty = (index) => { state.players[index].score++; saveState(); renderPlayers(); triggerFlash(); playBeep(); };

    const appendToTranscript = (text, isInterim = false) => {
        if (!text) return;
        let highlighted = text;
        state.forbiddenWords.forEach(word => {
            const regex = new RegExp(`(${word}[\\w]*)`, 'gi');
            highlighted = highlighted.replace(regex, '<span class="forbidden-hit">$1</span>');
        });

        if (isInterim) {
            let interim = elements.transcriptFlow.querySelector('.interim-msg');
            if (!interim) {
                interim = document.createElement('p');
                interim.className = 'interim-msg text-accent italic text-lg opacity-80';
                elements.transcriptFlow.appendChild(interim);
            }
            interim.innerHTML = highlighted + '...';
        } else {
            const interim = elements.transcriptFlow.querySelector('.interim-msg');
            if (interim) interim.remove();

            elements.transcriptFlow.querySelectorAll('.transcript-new').forEach(el => el.classList.replace('transcript-new', 'transcript-old'));

            const msg = document.createElement('p');
            msg.className = 'transcript-new';
            msg.innerHTML = highlighted;
            elements.transcriptFlow.appendChild(msg);

            while (elements.transcriptFlow.children.length > 20) elements.transcriptFlow.removeChild(elements.transcriptFlow.firstChild);
        }
        elements.transcriptFlow.parentElement.scrollTop = elements.transcriptFlow.parentElement.scrollHeight;
    };

    // --- Event Listeners ---
    elements.wordForm.onsubmit = (e) => {
        e.preventDefault();
        const val = elements.wordInput.value.trim();
        if (val && !state.forbiddenWords.includes(val)) {
            state.forbiddenWords.push(val);
            elements.wordInput.value = '';
            saveState();
            renderWords();
        }
    };

    elements.playerForm.onsubmit = (e) => {
        e.preventDefault();
        const val = elements.playerInput.value.trim();
        if (val) {
            state.players.push({ name: val, score: 0 });
            elements.playerInput.value = '';
            saveState();
            renderPlayers();
        }
    };

    elements.resetScores.onclick = () => {
        state.players.forEach(p => p.score = 0);
        saveState();
        renderPlayers();
    };

    elements.startBtn.onclick = async () => {
        if (!audioContext) await setupVolumeMeter();
        if (state.isPlaying) window.SpeechService.stop();
        else window.SpeechService.start();
    };

    window.SpeechService.setOnStatusChange((listening) => {
        state.isPlaying = listening;
        elements.micPulse.className = listening ? 'w-2.5 h-2.5 rounded-full mic-active' : 'w-2.5 h-2.5 rounded-full bg-slate-600';
        elements.micText.innerText = listening ? 'LİVE' : 'KAPALI';
        elements.micText.className = listening ? 'text-[10px] font-bold uppercase tracking-widest text-accent' : 'text-[10px] font-bold uppercase tracking-widest text-slate-400';

        elements.startBtn.className = listening ? 'w-20 h-20 rounded-full bg-danger flex items-center justify-center shadow-xl shadow-danger/20' : 'w-20 h-20 rounded-full bg-success flex items-center justify-center shadow-xl shadow-success/20';
        elements.playIcon.classList.toggle('hidden', listening);
        elements.stopIcon.classList.toggle('hidden', !listening);
    });

    window.SpeechService.setOnResult((final, interim) => {
        if (interim) {
            // Check words during interim
            state.forbiddenWords.forEach(word => {
                if (new RegExp(`\\b${word}`, 'i').test(interim)) {
                    if (!detectedWordsInCurrentSegment.has(word)) {
                        detectedWordsInCurrentSegment.add(word);
                        triggerFlash();
                        playBeep();
                    }
                }
            });
            appendToTranscript(interim, true);
        }
        if (final) {
            detectedWordsInCurrentSegment.clear();
            appendToTranscript(final, false);
        }
    });

    renderWords();
    renderPlayers();
});
