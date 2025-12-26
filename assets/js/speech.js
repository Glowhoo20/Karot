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
            alert("Speech API bu tarayıcıda desteklenmiyor. Lütfen Chrome kullanın.");
            return;
        }
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.lang;

        this.recognition.onstart = () => {
            console.log("Speech API: Başlatıldı");
            this.isListening = true;
            if (this.onStatusChangeCallback) this.onStatusChangeCallback(true);
        };

        this.recognition.onend = () => {
            console.log("Speech API: Oturum kapandı");
            if (this.isListening) {
                console.log("Speech API: Otomatik yeniden başlatılıyor...");
                setTimeout(() => {
                    if (this.isListening) {
                        try {
                            this.recognition.start();
                        } catch (e) {
                            console.error("Speech API: Başlatma hatası:", e);
                        }
                    }
                }, 500);
            } else {
                if (this.onStatusChangeCallback) this.onStatusChangeCallback(false);
            }
        };

        this.recognition.onerror = (event) => {
            console.error("Speech API Hatası:", event.error);
            if (event.error === 'not-allowed') {
                this.isListening = false;
                alert("Mikrofon izni engellenmiş. Lütfen adres çubuğundan izni açın.");
            }
        };

        this.recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) final += transcript;
                else interim += transcript;
            }

            if (final || interim) {
                console.log("Speech API Sonuç:", { final, interim });
                if (this.onResultCallback) this.onResultCallback(final, interim);
            }
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
