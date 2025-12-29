/**
 * speech.js - v5.0 Clean
 * - Proactive restart every 25s to prevent "fatigue"
 * - Aggressive interim preservation on restart
 * - Faster watchdog
 */
class SpeechService {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.onInterimCallback = null;
        this.onFinalCallback = null;
        this.onStatusCallback = null;

        // Kelime takibi
        this.lastInterim = '';
        this.lastInterimTime = 0;
        this.accumulatedText = '';

        // Zamanlama
        this.lastActivityTime = 0;
        this.sessionStartTime = 0;
        this.watchdogInterval = null;
        this.proactiveRestartInterval = null;

        // Restart kontrolü
        this.isRestarting = false;
        this.lastRestartTime = 0;
        this.consecutiveRestarts = 0;
        this.maxConsecutiveRestarts = 5;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech API desteklenmiyor. Lütfen Chrome kullanın.");
            return;
        }

        this.SpeechRecognition = SpeechRecognition;
    }

    _create() {
        const recognition = new this.SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'tr-TR';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            this.sessionStartTime = Date.now();
            this.lastActivityTime = Date.now();
            if (this.onStatusCallback) this.onStatusCallback(true);
        };

        recognition.onend = () => {
            this._saveInterimAsAccumulated();

            if (this.isListening && !this.isRestarting) {
                const timeSinceLastRestart = Date.now() - this.lastRestartTime;
                if (timeSinceLastRestart < 500) {
                    this.consecutiveRestarts++;
                } else {
                    this.consecutiveRestarts = 0;
                }

                let delay = 150;
                if (this.consecutiveRestarts >= this.maxConsecutiveRestarts) {
                    delay = 2000;
                    this.consecutiveRestarts = 0;
                }

                setTimeout(() => {
                    if (this.isListening) this._start();
                }, delay);
            } else if (!this.isListening) {
                this._finalizeAccumulated();
                if (this.onStatusCallback) this.onStatusCallback(false);
            }
        };

        recognition.onerror = (e) => {
            if (e.error === 'aborted') return;

            if (e.error === 'not-allowed') {
                this.isListening = false;
                alert("Mikrofon izni gerekli!");
                if (this.onStatusCallback) this.onStatusCallback(false);
            } else if (e.error === 'no-speech') {
                this.lastActivityTime = Date.now();
            }
        };

        recognition.onresult = (event) => {
            this.lastActivityTime = Date.now();

            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;

                if (result.isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }

            if (final) {
                const fullText = this._combineWithAccumulated(final);
                this.accumulatedText = '';
                this.lastInterim = '';
                if (this.onFinalCallback) this.onFinalCallback(fullText.trim());
            }

            if (interim) {
                this.lastInterim = interim;
                this.lastInterimTime = Date.now();
                const displayText = this._combineWithAccumulated(interim);
                if (this.onInterimCallback) {
                    this.onInterimCallback(displayText);
                }
            }
        };

        recognition.onsoundstart = () => {
            this.lastActivityTime = Date.now();
        };

        recognition.onaudiostart = () => {
            this.lastActivityTime = Date.now();
        };

        return recognition;
    }

    _saveInterimAsAccumulated() {
        if (this.lastInterim) {
            this.accumulatedText = this._combineWithAccumulated(this.lastInterim);
            this.lastInterim = '';
        }
    }

    _combineWithAccumulated(newText) {
        if (!this.accumulatedText) return newText;

        const accLower = this.accumulatedText.toLowerCase().trim();
        const newLower = newText.toLowerCase().trim();

        if (newLower.startsWith(accLower)) {
            return newText;
        }

        const accWords = this.accumulatedText.trim().split(/\s+/);
        const newWords = newText.trim().split(/\s+/);

        for (let overlap = Math.min(3, accWords.length); overlap > 0; overlap--) {
            const accEnd = accWords.slice(-overlap).join(' ').toLowerCase();
            const newStart = newWords.slice(0, overlap).join(' ').toLowerCase();

            if (accEnd === newStart) {
                return this.accumulatedText.trim() + ' ' + newWords.slice(overlap).join(' ');
            }
        }

        return this.accumulatedText.trim() + ' ' + newText.trim();
    }

    _finalizeAccumulated() {
        if (this.accumulatedText) {
            if (this.onFinalCallback) this.onFinalCallback(this.accumulatedText.trim());
            this.accumulatedText = '';
        }
    }

    _startWatchdog() {
        clearInterval(this.watchdogInterval);

        this.watchdogInterval = setInterval(() => {
            if (!this.isListening) {
                clearInterval(this.watchdogInterval);
                return;
            }

            const timeSinceActivity = Date.now() - this.lastActivityTime;

            if (timeSinceActivity > 8000) {
                this._forceRestart();
            }
        }, 3000);
    }

    _startProactiveRestart() {
        clearInterval(this.proactiveRestartInterval);

        this.proactiveRestartInterval = setInterval(() => {
            if (!this.isListening) {
                clearInterval(this.proactiveRestartInterval);
                return;
            }

            const sessionDuration = Date.now() - this.sessionStartTime;

            if (sessionDuration > 25000) {
                this._forceRestart();
            }
        }, 5000);
    }

    _forceRestart() {
        if (this.isRestarting) return;

        this._saveInterimAsAccumulated();

        this.isRestarting = true;
        this.lastRestartTime = Date.now();

        if (this.recognition) {
            try { this.recognition.abort(); } catch (e) { }
        }
        this.lastActivityTime = Date.now();

        setTimeout(() => {
            this.isRestarting = false;
            if (this.isListening) this._start();
        }, 200);
    }

    _start() {
        if (this.isRestarting) return;

        try {
            if (this.recognition) {
                try { this.recognition.abort(); } catch (e) { }
            }
            this.recognition = this._create();
            this.recognition.start();
            this.lastActivityTime = Date.now();
            this.lastRestartTime = Date.now();
        } catch (e) {
            setTimeout(() => {
                if (this.isListening && !this.isRestarting) this._start();
            }, 300);
        }
    }

    start() {
        this.isListening = true;
        this.accumulatedText = '';
        this.lastInterim = '';
        this.isRestarting = false;
        this.consecutiveRestarts = 0;
        this._start();
        this._startWatchdog();
        this._startProactiveRestart();
    }

    stop() {
        this.isListening = false;
        clearInterval(this.watchdogInterval);
        clearInterval(this.proactiveRestartInterval);

        this._saveInterimAsAccumulated();
        this._finalizeAccumulated();

        if (this.recognition) {
            try { this.recognition.stop(); } catch (e) { }
        }
    }

    onInterim(cb) { this.onInterimCallback = cb; }
    onFinal(cb) { this.onFinalCallback = cb; }
    onStatus(cb) { this.onStatusCallback = cb; }
}

window.SpeechService = new SpeechService();
