/**
 * Main Application Logic
 * Manages game state, UI updates, and coordination between modules.
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
                let values = 0;
                for (let i = 0; i < array.length; i++) values += array[i];
                const average = values / array.length;
                if (elements.volumeBar) elements.volumeBar.style.width = Math.min(100, average * 2) + '%';
            };
        } catch (e) {
            console.error("Mikrofon erişim hatası (Visualizer):", e);
        }
    };

    // --- Audio Feedback (Beep) ---
    const playBeep = () => {
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gain = context.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, context.currentTime);
            oscillator.connect(gain);
            gain.connect(context.destination);

            gain.gain.setValueAtTime(0, context.currentTime);
            gain.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.1);
            gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.3);

            oscillator.start();
            oscillator.stop(context.currentTime + 0.3);
        } catch (e) {
            console.error("Audio error:", e);
        }
    };

    // --- UI Update Helpers ---
    const saveState = () => {
        localStorage.setItem('karot_words', JSON.stringify(state.forbiddenWords));
        localStorage.setItem('karot_players', JSON.stringify(state.players));
    };

    const renderWords = () => {
        elements.wordsList.innerHTML = state.forbiddenWords.map((word, index) => `
            <div class="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 group">
                <span class="text-slate-200 font-medium">${word}</span>
                <button onclick="removeWord(${index})" class="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        `).join('');
    };

    const renderPlayers = () => {
        elements.playerList.innerHTML = state.players.map((player, index) => `
            <div class="player-card bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 flex flex-col space-y-2">
                <div class="flex justify-between items-center">
                    <span class="font-bold text-slate-100">${player.name}</span>
                    <button onclick="removePlayer(${index})" class="text-slate-600 hover:text-red-500 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div class="flex justify-between items-center bg-slate-900/50 rounded-lg px-3 py-2">
                    <span class="text-xs text-slate-400 uppercase">Ceza Puanı</span>
                    <span class="penalty-count text-xl font-mono">${player.score}</span>
                </div>
                <button onclick="addPenalty(${index})" class="w-full bg-slate-700/50 hover:bg-red-900/30 text-xs py-1.5 rounded transition-all text-slate-300">
                    +1 Ceza
                </button>
            </div>
        `).join('');
    };

    // --- Game Actions ---
    window.removeWord = (index) => {
        state.forbiddenWords.splice(index, 1);
        saveState();
        renderWords();
    };

    window.removePlayer = (index) => {
        state.players.splice(index, 1);
        saveState();
        renderPlayers();
    };

    window.addPenalty = (index) => {
        state.players[index].score += 1;
        saveState();
        renderPlayers();
        triggerFlash();
        playBeep();
    };

    const triggerFlash = () => {
        elements.flashOverlay.style.opacity = '0.3';
        document.body.classList.add('shake');
        setTimeout(() => {
            elements.flashOverlay.style.opacity = '0';
            document.body.classList.remove('shake');
        }, 150);
    };

    // --- Detection & Transcript Flow ---
    let detectedWordsInCurrentSegment = new Set();

    const checkForbiddenWords = (text, isFinal = false) => {
        if (!text) return;
        const normalizedText = text.toLowerCase();
        let found = false;

        state.forbiddenWords.forEach(word => {
            const normalizedWord = word.toLowerCase();
            const regex = new RegExp(`\\b${normalizedWord}`, 'i');

            if (regex.test(normalizedText)) {
                if (!detectedWordsInCurrentSegment.has(normalizedWord)) {
                    detectedWordsInCurrentSegment.add(normalizedWord);
                    found = true;
                }
            }
        });

        if (found) {
            triggerFlash();
            playBeep();
        }

        if (isFinal) {
            detectedWordsInCurrentSegment.clear();
        }
    };

    const appendToTranscript = (text, isInterim = false) => {
        if (!text) return;

        // Vurgulama işlemi
        let highlightedText = text;
        state.forbiddenWords.forEach(word => {
            const regex = new RegExp(`(${word}[\\w]*)`, 'gi');
            highlightedText = highlightedText.replace(regex, '<span class="forbidden-hit text-red-500 font-bold">$1</span>');
        });

        if (isInterim) {
            let interimEl = elements.transcriptFlow.querySelector('.interim-msg');
            if (!interimEl) {
                interimEl = document.createElement('p');
                interimEl.className = 'interim-msg text-blue-400 italic text-lg mb-2';
                elements.transcriptFlow.appendChild(interimEl);
            }
            interimEl.innerHTML = highlightedText + '...';
        } else {
            // Geçiciyi temizle
            const interimEl = elements.transcriptFlow.querySelector('.interim-msg');
            if (interimEl) interimEl.remove();

            // Eskileri sönükleştir
            elements.transcriptFlow.querySelectorAll('.transcript-new').forEach(el => {
                el.classList.replace('transcript-new', 'transcript-old');
            });

            // Yeniyi ekle
            const messageEl = document.createElement('p');
            messageEl.className = 'transcript-new p-3 rounded-lg bg-slate-800/40 border-l-4 border-blue-500 mb-3 text-lg';
            messageEl.innerHTML = highlightedText;
            elements.transcriptFlow.appendChild(messageEl);

            // Sınırla ve kaydır
            while (elements.transcriptFlow.children.length > 20) {
                elements.transcriptFlow.removeChild(elements.transcriptFlow.firstChild);
            }
        }

        elements.transcriptFlow.parentElement.scrollTop = elements.transcriptFlow.parentElement.scrollHeight;
    };

    // --- Input Handling ---
    elements.wordForm.onsubmit = (e) => {
        e.preventDefault();
        const word = elements.wordInput.value.trim();
        if (word && !state.forbiddenWords.includes(word)) {
            state.forbiddenWords.push(word);
            elements.wordInput.value = '';
            saveState();
            renderWords();
        }
    };

    elements.playerForm.onsubmit = (e) => {
        e.preventDefault();
        const name = elements.playerInput.value.trim();
        if (name) {
            state.players.push({ name, score: 0 });
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

    // --- Speech Event Handlers ---
    elements.startBtn.onclick = () => {
        if (state.isPlaying) {
            window.SpeechService.stop();
        } else {
            window.SpeechService.start();
        }
    };

    window.SpeechService.setOnStatusChange((isListening) => {
        state.isPlaying = isListening;
        if (isListening) {
            elements.startBtn.innerText = 'Durdur';
            elements.startBtn.classList.replace('bg-green-600', 'bg-red-600');
            elements.micPulse.classList.add('mic-active');
            elements.micText.innerText = 'DINLENIYOR...';
            // KRİTİK: Buradaki innerHTML temizleme kaldırıldı, böylece sistem her restart olduğunda geçmiş silinmez.
        } else {
            elements.startBtn.innerText = 'Oyun Başlat';
            elements.startBtn.classList.replace('bg-red-600', 'bg-green-600');
            elements.micPulse.classList.remove('mic-active');
            elements.micText.innerText = 'MIKROFON DEVRE DIŞI';
        }
    });

    window.SpeechService.setOnResult((final, interim) => {
        if (interim) {
            checkForbiddenWords(interim, false);
            appendToTranscript(interim, true);
        }
        if (final) {
            checkForbiddenWords(final, true);
            appendToTranscript(final, false);
        }
    });

    // --- Initial Render ---
    renderWords();
    renderPlayers();
});
