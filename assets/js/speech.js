/**
 * speech.js - Enhanced for Mobile & Vercel
 */
class SpeechService {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.lang = 'tr-TR';
        this.onResultCallback = null;
        this.onStatusChangeCallback = null;
        this.init();
    }

    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech API bu tarayıcıda desteklenmiyor.");
            return;
        }
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.lang;

        this.recognition.onstart = () => {
            this.isListening = true;
            if (this.onStatusChangeCallback) this.onStatusChangeCallback(true);
        };

        this.recognition.onend = () => {
            if (this.isListening) {
                setTimeout(() => {
                    if (this.isListening) {
                        try {
                            this.recognition.start();
                        } catch (e) {
                            console.log("Auto-restart failed, will try again on next event.");
                        }
                    }
                }, 400);
            } else {
                if (this.onStatusChangeCallback) this.onStatusChangeCallback(false);
            }
        };

        this.recognition.onerror = (event) => {
            if (event.error === 'no-speech') return;
            console.error("Speech Error:", event.error);
        };

        this.recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript;
                else interim += event.results[i][0].transcript;
            }
            if (this.onResultCallback) this.onResultCallback(final, interim);
        };
    }

    start() {
        this.isListening = true;
        try { this.recognition.start(); } catch (e) { }
    }

    stop() {
        this.isListening = false;
        try { this.recognition.stop(); } catch (e) { }
    }

    setOnResult(cb) { this.onResultCallback = cb; }
    setOnStatusChange(cb) { this.onStatusChangeCallback = cb; }
}

window.SpeechService = new SpeechService();
