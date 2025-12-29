/**
 * speech-wrapper.js - Unified Speech Service Wrapper
 * - Tries Google Cloud Speech-to-Text first
 * - Falls back to Web Speech API if Cloud fails
 * - Maintains same interface for app.js
 */
class SpeechServiceWrapper {
    constructor() {
        this.cloudService = null;
        this.webService = null;
        this.currentService = null;
        this.useCloud = true;
        this.fallbackToWeb = true;

        // Callbacks
        this.onInterimCallback = null;
        this.onFinalCallback = null;
        this.onStatusCallback = null;

        // Initialize services
        this._initServices();
    }

    _initServices() {
        // Initialize Web Speech API service (always available)
        if (typeof SpeechService !== 'undefined') {
            this.webService = window.SpeechService;
        } else {
            // Load speech.js if not already loaded
            console.warn("[Wrapper] Web Speech API servisi bulunamadı");
        }

        // Initialize Google Cloud service
        if (typeof SpeechCloudService !== 'undefined') {
            this.cloudService = new SpeechCloudService();
        } else {
            console.warn("[Wrapper] Google Cloud servisi bulunamadı");
        }
    }

    setApiKey(key) {
        if (this.cloudService) {
            this.cloudService.setApiKey(key);
            console.log("[Wrapper] Google Cloud API key ayarlandı");
        } else {
            console.error("[Wrapper] Google Cloud servisi mevcut değil");
        }
    }

    setGain(value) {
        if (this.currentService && typeof this.currentService.setGain === 'function') {
            this.currentService.setGain(value);
        }
    }

    async start() {
        // Öncelik: Web Speech API (Native ve daha hızlı)
        // Eğer native API çalışmazsa veya desteklenmezse Cloud'a geç
        if (this.webService) {
            try {
                console.log("[Wrapper] Web Speech API özelliği kontrol ediliyor...");
                // Browser desteği kontrolü
                if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                    throw new Error("Browser desteklemiyor");
                }

                console.log("[Wrapper] Web Speech API ile başlatılıyor...");
                this.currentService = this.webService;
                this._setupCallbacks(this.webService);

                // Web Speech API senkron başlar, await gerekmez ama try/catch için sarıyoruz
                await new Promise((resolve, reject) => {
                    try {
                        this.webService.start();
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                return;
            } catch (error) {
                console.warn("[Wrapper] Web Speech API başlatılamadı, Google Cloud deneniyor:", error);
                // Fallback to Cloud below
            }
        }

        // Fallback: Google Cloud Speech API
        if (this.cloudService && this.cloudService.apiKey) {
            try {
                console.log("[Wrapper] Google Cloud ile başlatılıyor (Fallback)...");
                this.currentService = this.cloudService;
                await this._setupCallbacks(this.cloudService);
                await this.cloudService.start();
                return;
            } catch (error) {
                console.error("[Wrapper] Google Cloud başlatma hatası:", error);
                throw error;
            }
        } else if (!this.webService) {
            throw new Error("Hiçbir konuşma tanıma servisi bulunamadı");
        } else {
            // Web service failed and no cloud key
            throw new Error("Web Speech API çalışmadı ve Google Cloud anahtarı yok");
        }
    }

    stop() {
        if (this.currentService) {
            this.currentService.stop();
            this.currentService = null;
        }
    }

    _setupCallbacks(service) {
        if (this.onInterimCallback) {
            service.onInterim(this.onInterimCallback);
        }
        if (this.onFinalCallback) {
            service.onFinal(this.onFinalCallback);
        }
        if (this.onStatusCallback) {
            service.onStatus(this.onStatusCallback);
        }
    }

    onInterim(cb) {
        this.onInterimCallback = cb;
        if (this.currentService) {
            this.currentService.onInterim(cb);
        }
    }

    onFinal(cb) {
        this.onFinalCallback = cb;
        if (this.currentService) {
            this.currentService.onFinal(cb);
        }
    }

    onStatus(cb) {
        this.onStatusCallback = cb;
        if (this.currentService) {
            this.currentService.onStatus(cb);
        }
    }

    getUsageInfo() {
        if (this.cloudService && typeof this.cloudService.getUsageInfo === 'function') {
            return this.cloudService.getUsageInfo();
        }
        return null;
    }

    getCurrentService() {
        if (this.currentService === this.cloudService) {
            return 'google-cloud';
        } else if (this.currentService === this.webService) {
            return 'web-speech';
        }
        return null;
    }

    enableCloud(enabled) {
        this.useCloud = enabled;
    }

    enableFallback(enabled) {
        this.fallbackToWeb = enabled;
    }
}

// Create global instance
window.SpeechService = new SpeechServiceWrapper();

