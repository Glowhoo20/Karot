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
            console.log("Ses tanıma başlatıldı. (tr-TR)");
        };

        this.recognition.onend = () => {
            console.log("Ses tanıma oturumu kapandı.");
            // Eğer isListening true ise ve kullanıcı durdurmadıysa otomatik restart
            if (this.isListening) {
                console.log("300ms içinde otomatik yeniden başlatılıyor...");
                setTimeout(() => {
                    if (this.isListening) {
                        try {
                            this.recognition.start();
                        } catch (e) {
                            console.error("Yeniden başlatma hatası:", e);
                        }
                    }
                }, 300);
            } else {
                if (this.onStatusChangeCallback) this.onStatusChangeCallback(false);
            }
        };

        this.recognition.onerror = (event) => {
            // 'no-speech' hatası sessizlikte normaldir ve onend ile restart edilir.
            if (event.error === 'no-speech') return;

            console.error("Konuşma tanıma hatası: ", event.error);
            if (event.error === 'not-allowed') {
                this.isListening = false;
                alert("Mikrofon erişimine izin verilmedi. Lütfen adres çubuğundaki kilit ikonuna tıklayıp izni kontrol edin.");
                if (this.onStatusChangeCallback) this.onStatusChangeCallback(false);
            }
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (this.onResultCallback) {
                this.onResultCallback(finalTranscript, interimTranscript);
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
