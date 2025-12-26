/**
 * app.js - Mobile First Core
 */
document.addEventListener('DOMContentLoaded', () => {
    const state = {
        words: JSON.parse(localStorage.getItem('k_words')) || ['elma', 'şey', 'bu'],
        players: JSON.parse(localStorage.getItem('k_players')) || [],
        isPlaying: false,
    };

    const UI = {
        wordList: document.getElementById('forbidden-words-list'),
        playerList: document.getElementById('player-list'),
        transcript: document.getElementById('transcript-flow'),
        startBtn: document.getElementById('start-btn'),
        micPulse: document.getElementById('mic-pulse'),
        micText: document.getElementById('mic-text'),
        volume: document.getElementById('volume-bar'),
        flash: document.getElementById('flash-overlay')
    };

    let audioCtx, analyser, dataArray;

    const save = () => {
        localStorage.setItem('k_words', JSON.stringify(state.words));
        localStorage.setItem('k_players', JSON.stringify(state.players));
    };

    const render = () => {
        UI.wordList.innerHTML = state.words.map((w, i) => `
            <div class="glass-card p-3 rounded-xl flex justify-between items-center">
                <span class="font-bold text-sm uppercase truncate">${w}</span>
                <button onclick="window.app.delW(${i})" class="text-slate-600 px-2">×</button>
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
                    <button onclick="window.app.addP(${i})" class="bg-red-500 text-white w-10 h-10 rounded-xl flex items-center justify-center active:scale-95">+</button>
                </div>
            </div>
        `).join('');
    };

    // Exposed API for onclick
    window.app = {
        delW: (i) => { state.words.splice(i, 1); save(); render(); },
        addP: (i) => {
            state.players[i].score++;
            save();
            render();
            triggerAlert();
        }
    };

    const triggerAlert = () => {
        UI.flash.style.opacity = '0.4';
        document.body.classList.add('shake');
        const beep = audioCtx || new AudioContext();
        const osc = beep.createOscillator();
        const g = beep.createGain();
        osc.connect(g); g.connect(beep.destination);
        osc.frequency.value = 600;
        g.gain.setValueAtTime(0.1, beep.currentTime);
        osc.start(); osc.stop(beep.currentTime + 0.15);

        setTimeout(() => {
            UI.flash.style.opacity = '0';
            document.body.classList.remove('shake');
        }, 200);
    };

    const startMic = async () => {
        if (!audioCtx) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioCtx = new AudioContext();
                analyser = audioCtx.createAnalyser();
                const source = audioCtx.createMediaStreamSource(stream);
                dataArray = new Uint8Array(analyser.frequencyBinCount);
                source.connect(analyser);

                const updateVolume = () => {
                    if (!state.isPlaying) { UI.volume.style.width = '0%'; return; }
                    analyser.getByteFrequencyData(dataArray);
                    let avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
                    UI.volume.style.width = Math.min(100, avg * 10) + '%';
                    requestAnimationFrame(updateVolume);
                };
                updateVolume();
            } catch (e) { alert("Mikrofon erişimi reddedildi."); }
        }
    };

    UI.startBtn.onclick = () => {
        startMic();
        if (state.isPlaying) window.SpeechService.stop();
        else window.SpeechService.start();
    };

    window.SpeechService.setOnStatusChange((lis) => {
        state.isPlaying = lis;
        UI.startBtn.classList.toggle('bg-emerald-500', !lis);
        UI.startBtn.classList.toggle('bg-red-500', lis);
        UI.startBtn.querySelector('#play-icon').classList.toggle('hidden', lis);
        UI.startBtn.querySelector('#stop-icon').classList.toggle('hidden', !lis);
        UI.micPulse.classList.toggle('mic-active', lis);
        UI.micText.innerText = lis ? 'OYUNDA' : 'KAPALI';
        UI.micText.classList.toggle('text-blue-500', lis);
    });

    const detectedWordsInCurrentSegment = new Set();

    const appendToTranscript = (text, isInterim = false) => {
        if (!text) return;

        // Vurgulama
        let html = text;
        let isForbidden = false;
        state.words.forEach(w => {
            const reg = new RegExp(`(${w}[\\w]*)`, 'gi');
            if (reg.test(text)) {
                isForbidden = true;
                html = html.replace(reg, '<span class="forbidden-hit">$1</span>');
            }
        });

        if (isForbidden && !detectedWordsInCurrentSegment.has(text)) {
            detectedWordsInCurrentSegment.add(text);
            triggerAlert();
        }

        if (isInterim) {
            let intEl = UI.transcript.querySelector('.interim');
            if (!intEl) {
                intEl = document.createElement('p');
                intEl.className = 'interim text-blue-400 italic p-3 opacity-80 animate-pulse';
                UI.transcript.appendChild(intEl);
            }
            intEl.innerHTML = html + '...';
        } else {
            // Final mesaj geldiğinde geçiciyi temizle ve kalıcı yap
            const intEl = UI.transcript.querySelector('.interim');
            if (intEl) intEl.remove();

            // İlk mesajı temizle
            const firstMsg = UI.transcript.querySelector('.text-slate-600');
            if (firstMsg) firstMsg.remove();

            UI.transcript.querySelectorAll('.transcript-new').forEach(el => el.classList.replace('transcript-new', 'transcript-old'));

            const p = document.createElement('p');
            p.className = 'transcript-new';
            p.innerHTML = html;
            UI.transcript.appendChild(p);

            // Sınırla
            while (UI.transcript.children.length > 20) {
                UI.transcript.removeChild(UI.transcript.firstChild);
            }
        }

        // Kaydır
        setTimeout(() => {
            const container = UI.transcript.parentElement;
            container.scrollTop = container.scrollHeight;
        }, 50);
    };

    window.SpeechService.setOnResult((final, interim) => {
        if (interim) appendToTranscript(interim, true);
        if (final) {
            detectedWordsInCurrentSegment.clear();
            appendToTranscript(final, false);
        }
    });

    document.getElementById('word-form').onsubmit = (e) => {
        e.preventDefault();
        const val = document.getElementById('word-input').value.trim().toLowerCase();
        if (val && !state.words.includes(val)) {
            state.words.push(val);
            save(); render();
            document.getElementById('word-input').value = '';
        }
    };

    document.getElementById('player-form').onsubmit = (e) => {
        e.preventDefault();
        const val = document.getElementById('player-input').value.trim();
        if (val) {
            state.players.push({ name: val, score: 0 });
            save(); render();
            document.getElementById('player-input').value = '';
        }
    };

    document.getElementById('reset-scores').onclick = () => {
        state.players.forEach(p => p.score = 0);
        save(); render();
    };

    render();
});
