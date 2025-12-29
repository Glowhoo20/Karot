/**
 * speech.js - v3.2 with Audio Recording for Debug
 */
class SpeechService {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.onInterimCallback = null;
        this.onFinalCallback = null;
        this.onStatusCallback = null;
        this.lastInterim = '';
        this.lastActivityTime = 0;
        this.watchdogInterval = null;

        // Audio recording for debug
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioStream = null;

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
        recognition.maxAlternatives = 3;

        recognition.onstart = () => {
            console.log("[Speech] Başladı");
            this.lastInterim = '';
            this.lastActivityTime = Date.now();
            if (this.onStatusCallback) this.onStatusCallback(true);
        };

        recognition.onend = () => {
            console.log("[Speech] Bitti");

            if (this.lastInterim && this.onFinalCallback) {
                console.log("[Speech] Kayıp kelime kurtarıldı:", this.lastInterim);
                this.onFinalCallback(this.lastInterim.trim());
                this.lastInterim = '';
            }

            if (this.isListening) {
                console.log("[Speech] Yeniden başlatılıyor...");
                setTimeout(() => {
                    if (this.isListening) this._start();
                }, 100);
            } else {
                if (this.onStatusCallback) this.onStatusCallback(false);
            }
        };

        recognition.onerror = (e) => {
            console.error("[Speech] Hata:", e.error);
            if (e.error === 'not-allowed') {
                this.isListening = false;
                alert("Mikrofon izni gerekli!");
                if (this.onStatusCallback) this.onStatusCallback(false);
            }
        };

        recognition.onresult = (event) => {
            this.lastActivityTime = Date.now();

            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }

            if (final) {
                this.lastInterim = '';
                if (this.onFinalCallback) this.onFinalCallback(final.trim());
            }
            if (interim) {
                this.lastInterim = interim;
                if (this.onInterimCallback) this.onInterimCallback(interim);
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

    async _startAudioRecording() {
        try {
            this.audioChunks = [];
            this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(this.audioStream, { mimeType: 'audio/webm' });

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.audioChunks.push(e.data);
                }
            };

            this.mediaRecorder.start(1000); // Collect data every 1 second
            console.log("[Audio] Kayıt başladı");
        } catch (e) {
            console.error("[Audio] Kayıt hatası:", e);
        }
    }

    _stopAudioRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            console.log("[Audio] Kayıt durduruldu");
        }
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
        }
    }

    downloadRecording() {
        if (this.audioChunks.length === 0) {
            alert("Kayıt bulunamadı!");
            return;
        }

        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `karot-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log("[Audio] Dosya indirildi");
    }

    _startWatchdog() {
        clearInterval(this.watchdogInterval);

        this.watchdogInterval = setInterval(() => {
            if (!this.isListening) {
                clearInterval(this.watchdogInterval);
                return;
            }

            const timeSinceActivity = Date.now() - this.lastActivityTime;

            if (timeSinceActivity > 15000) {
                console.log("[Speech] Watchdog: Yanıt yok, yeniden başlatılıyor...");
                this._forceRestart();
            }
        }, 5000);
    }

    _forceRestart() {
        if (this.recognition) {
            try { this.recognition.abort(); } catch (e) { }
        }
        this.lastActivityTime = Date.now();
        setTimeout(() => {
            if (this.isListening) this._start();
        }, 100);
    }

    _start() {
        try {
            if (this.recognition) {
                this.recognition.abort();
            }
            this.recognition = this._create();
            this.recognition.start();
            this.lastActivityTime = Date.now();
        } catch (e) {
            console.error("[Speech] Start error:", e);
            setTimeout(() => {
                if (this.isListening) this._start();
            }, 500);
        }
    }

    start() {
        this.isListening = true;
        this._start();
        this._startWatchdog();
        this._startAudioRecording();
    }

    stop() {
        this.isListening = false;
        clearInterval(this.watchdogInterval);
        if (this.recognition) {
            try { this.recognition.stop(); } catch (e) { }
        }
        this._stopAudioRecording();
    }

    onInterim(cb) { this.onInterimCallback = cb; }
    onFinal(cb) { this.onFinalCallback = cb; }
    onStatus(cb) { this.onStatusCallback = cb; }
}

window.SpeechService = new SpeechService();
