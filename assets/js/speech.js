/**
 * Speech Recognition Module
 * Handles Web Speech API initialization, events, and lifecycle.
 */

class SpeechService {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.onResultCallback = null;
        this.onStatusChangeCallback = null;
        this.lang = 'tr-TR';

        this.init();
    }

    init() {
        if (!('webkitSpeechRecognition' in window) && !('speechRecognition' in window)) {
            alert("Üzgünüz, tarayıcınız Speech API'yi desteklemiyor. Lütfen Chrome veya Edge kullanın.");
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.lang;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.recognition.onstart = () => {
            this.isListening = true;
            if (this.onStatusChangeCallback) this.onStatusChangeCallback(true);
            console.log("Speech recognition started (TR)");
        };

        this.recognition.onend = () => {
            console.log("Speech recognition session ended.");
            if (this.isListening) {
                console.log("Auto-restarting in 300ms...");
                setTimeout(() => {
                    if (this.isListening) {
                        try {
                            // Mobilde dili her seferinde tekrar set etmek daha güvenli
                            this.recognition.lang = this.lang;
                            this.recognition.start();
                        } catch (e) {
                            console.error("Restart error:", e);
                        }
                    }
                }, 300);
            } else {
                if (this.onStatusChangeCallback) this.onStatusChangeCallback(false);
            }
        };

        this.recognition.onerror = (event) => {
            if (event.error === 'no-speech') return;
            console.error("Speech Error:", event.error);
            if (event.error === 'not-allowed') {
                this.isListening = false;
                alert("Mikrofon izni gerekli! Lütfen tarayıcı ayarlarından mikrofonu açın.");
                if (this.onStatusChangeCallback) this.onStatusChangeCallback(false);
            }
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            // Mobilde sonuçlar bazen toplu gelebilir, resultIndex üzerinden güvenli döngü
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            console.log("Result received:", { final: finalTranscript, interim: interimTranscript });

            if (this.onResultCallback) {
                // Callback'e boş olmayan veriyi gönder
                if (finalTranscript || interimTranscript) {
                    this.onResultCallback(finalTranscript, interimTranscript);
                }
            }
        };
    }

    start() {
        if (this.recognition && !this.isListening) {
            this.recognition.start();
        }
    }

    stop() {
        if (this.recognition && this.isListening) {
            this.isListening = false;
            this.recognition.stop();
        }
    }

    setOnResult(callback) {
        this.onResultCallback = callback;
    }

    setOnStatusChange(callback) {
        this.onStatusChangeCallback = callback;
    }
}

// Global instance için export (veya browser ortamında doğrudan erişim)
window.SpeechService = new SpeechService();
