/**
 * speech.js - v4.1 with Gain Control
 * - Proactive restart every 20s to prevent "fatigue"
 * - Aggressive interim preservation on restart
 * - Microphone gain control for better recognition
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
        this.accumulatedText = ''; // Biriken metin (cümle parçaları)

        // Zamanlama
        this.lastActivityTime = 0;
        this.sessionStartTime = 0;
        this.watchdogInterval = null;
        this.proactiveRestartInterval = null;

        // Audio recording for debug
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioStream = null;

        // Audio gain control
        this.audioContext = null;
        this.gainNode = null;
        this.sourceNode = null;
        this.destinationNode = null;
        this.gainValue = 1.0;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech API desteklenmiyor. Lütfen Chrome kullanın.");
            return;
        }

        this.SpeechRecognition = SpeechRecognition;
    }

    setGain(value) {
        this.gainValue = parseFloat(value);
        if (this.gainNode) {
            this.gainNode.gain.value = this.gainValue;
            console.log("[Audio] Gain ayarlandı:", this.gainValue);
        }
    }

    _create() {
        const recognition = new this.SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'tr-TR';
        recognition.maxAlternatives = 1; // Daha hızlı işleme için 1

        // Performans optimizasyonları
        // Daha sık interim sonuçları için ayarlar
        if (recognition.serviceURI) {
            // Bazı tarayıcılarda mevcut olmayabilir
        }

        recognition.onstart = () => {
            console.log("[Speech] Oturum başladı");
            this.sessionStartTime = Date.now();
            this.lastActivityTime = Date.now();
            if (this.onStatusCallback) this.onStatusCallback(true);
        };

        recognition.onend = () => {
            console.log("[Speech] Oturum bitti");

            // Bekleyen interim varsa kaydet
            this._saveInterimAsAccumulated();

            if (this.isListening) {
                console.log("[Speech] Otomatik yeniden başlatılıyor...");
                // Daha hızlı yeniden başlatma (50ms'den 10ms'ye düşürüldü)
                setTimeout(() => {
                    if (this.isListening) this._start();
                }, 10);
            } else {
                // Tamamen durduruldu, biriken metni finalize et
                this._finalizeAccumulated();
                if (this.onStatusCallback) this.onStatusCallback(false);
            }
        };

        recognition.onerror = (e) => {
            console.error("[Speech] Hata:", e.error);

            if (e.error === 'not-allowed') {
                this.isListening = false;
                alert("Mikrofon izni gerekli!");
                if (this.onStatusCallback) this.onStatusCallback(false);
            } else if (e.error === 'no-speech') {
                // Sessizlik algılandı, bu normaldir
                console.log("[Speech] Sessizlik algılandı");
                this.lastActivityTime = Date.now();
            } else if (e.error === 'aborted') {
                // Planlı kesinti, görmezden gel
            } else {
                // Diğer hatalar için yeniden başlat
                console.log("[Speech] Hata sonrası yeniden başlatılıyor...");
            }
        };

        recognition.onresult = (event) => {
            this.lastActivityTime = Date.now();

            let interim = '';
            let final = '';

            // Tüm sonuçları işle (daha hızlı işleme için)
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;

                if (result.isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }

            // Final sonuç geldi - öncelik ver
            if (final) {
                console.log("[Speech] Final:", final);
                // Biriken metin + yeni final
                const fullText = this._combineWithAccumulated(final);
                this.accumulatedText = '';
                this.lastInterim = '';
                if (this.onFinalCallback) this.onFinalCallback(fullText.trim());
            }

            // Interim güncelleme - her zaman göster (throttle yok, maksimum hız)
            if (interim) {
                this.lastInterim = interim;
                this.lastInterimTime = Date.now();

                // Biriken + interim göster - anında callback
                const displayText = this._combineWithAccumulated(interim);
                if (this.onInterimCallback) {
                    // Throttle yok - her interim sonucu anında göster
                    this.onInterimCallback(displayText);
                }
            }
        };

        recognition.onsoundstart = () => {
            this.lastActivityTime = Date.now();
        };

        recognition.onsoundend = () => {
            // Ses bitti, biriken interim'i kaydet
            console.log("[Speech] Ses bitti");
        };

        recognition.onaudiostart = () => {
            this.lastActivityTime = Date.now();
        };

        return recognition;
    }

    // Interim sonucu birikmiş metne ekle
    _saveInterimAsAccumulated() {
        if (this.lastInterim) {
            console.log("[Speech] Interim kaydediliyor:", this.lastInterim);
            this.accumulatedText = this._combineWithAccumulated(this.lastInterim);
            this.lastInterim = '';
        }
    }

    // Metinleri akıllıca birleştir
    _combineWithAccumulated(newText) {
        if (!this.accumulatedText) return newText;

        // Eğer yeni metin birikmiş metinle başlıyorsa, sadece yeniyi kullan
        const accLower = this.accumulatedText.toLowerCase().trim();
        const newLower = newText.toLowerCase().trim();

        if (newLower.startsWith(accLower)) {
            return newText;
        }

        // Örtüşme kontrolü - son kelimeleri karşılaştır
        const accWords = this.accumulatedText.trim().split(/\s+/);
        const newWords = newText.trim().split(/\s+/);

        // Son 3 kelimeyle örtüşme ara
        for (let overlap = Math.min(3, accWords.length); overlap > 0; overlap--) {
            const accEnd = accWords.slice(-overlap).join(' ').toLowerCase();
            const newStart = newWords.slice(0, overlap).join(' ').toLowerCase();

            if (accEnd === newStart) {
                // Örtüşme bulundu, birleştir
                return this.accumulatedText.trim() + ' ' + newWords.slice(overlap).join(' ');
            }
        }

        // Örtüşme yok, basitçe birleştir
        return this.accumulatedText.trim() + ' ' + newText.trim();
    }

    // Biriken metni finalize et
    _finalizeAccumulated() {
        if (this.accumulatedText) {
            console.log("[Speech] Biriken metin finalize ediliyor:", this.accumulatedText);
            if (this.onFinalCallback) this.onFinalCallback(this.accumulatedText.trim());
            this.accumulatedText = '';
        }
    }

    async _startAudioRecording() {
        try {
            this.audioChunks = [];
            this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Web Audio API ile gain kontrolü
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.sourceNode = this.audioContext.createMediaStreamSource(this.audioStream);
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = this.gainValue;

            // Destination for recording (processed audio)
            this.destinationNode = this.audioContext.createMediaStreamDestination();

            // Connect: source -> gain -> destination
            this.sourceNode.connect(this.gainNode);
            this.gainNode.connect(this.destinationNode);

            // Use the processed stream for recording
            const processedStream = this.destinationNode.stream;
            this.mediaRecorder = new MediaRecorder(processedStream, { mimeType: 'audio/webm' });

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.audioChunks.push(e.data);
                }
            };

            this.mediaRecorder.start(1000);
            console.log("[Audio] Kayıt başladı (Gain:", this.gainValue + "x)");
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
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
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

        // Watchdog (her 3 saniye kontrol)
        this.watchdogInterval = setInterval(() => {
            if (!this.isListening) {
                clearInterval(this.watchdogInterval);
                return;
            }

            const timeSinceActivity = Date.now() - this.lastActivityTime;

            // 8 saniye yanıt yoksa yeniden başlat (Daha esnek)
            if (timeSinceActivity > 8000) {
                console.log("[Speech] Watchdog: Yanıt yok, yeniden başlatılıyor...");
                this._forceRestart();
            }
        }, 3000); // Kontrol sıklığı 3s
    }

    _startProactiveRestart() {
        clearInterval(this.proactiveRestartInterval);

        // Her 25 saniyede proaktif yeniden başlatma (Daha kararlı)
        this.proactiveRestartInterval = setInterval(() => {
            if (!this.isListening) {
                clearInterval(this.proactiveRestartInterval);
                return;
            }

            const sessionDuration = Date.now() - this.sessionStartTime;

            // 25 saniyeden uzun süren oturumları yenile
            if (sessionDuration > 25000) {
                console.log("[Speech] Proaktif yeniden başlatma (yorgunluk önleyici)");
                this._forceRestart();
            }
        }, 5000); // Kontrol sıklığı 5s
    }

    _forceRestart() {
        // Önce bekleyen interim'i kaydet
        this._saveInterimAsAccumulated();

        if (this.recognition) {
            try { this.recognition.abort(); } catch (e) { }
        }
        this.lastActivityTime = Date.now();
        // Daha hızlı restart (50ms'den 10ms'ye)
        setTimeout(() => {
            if (this.isListening) this._start();
        }, 10);
    }

    _start() {
        try {
            if (this.recognition) {
                try { this.recognition.abort(); } catch (e) { }
            }
            this.recognition = this._create();
            this.recognition.start();
            this.lastActivityTime = Date.now();
        } catch (e) {
            console.error("[Speech] Start error:", e);
            // Hata durumunda daha hızlı retry (300ms'den 100ms'ye)
            setTimeout(() => {
                if (this.isListening) this._start();
            }, 100);
        }
    }

    start() {
        this.isListening = true;
        this.accumulatedText = '';
        this.lastInterim = '';
        this._start();
        this._startWatchdog();
        this._startProactiveRestart();
        this._startAudioRecording();
    }

    stop() {
        this.isListening = false;
        clearInterval(this.watchdogInterval);
        clearInterval(this.proactiveRestartInterval);
        clearTimeout(this.silenceTimer);

        // Bekleyen tüm metni finalize et
        this._saveInterimAsAccumulated();
        this._finalizeAccumulated();

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

