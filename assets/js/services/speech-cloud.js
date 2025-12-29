/**
 * speech-cloud.js - Google Cloud Speech-to-Text Streaming API
 * - Real-time streaming recognition
 * - Lower latency than Web Speech API
 * - Cost tracking
 */
class SpeechCloudService {
    constructor() {
        this.isListening = false;
        this.onInterimCallback = null;
        this.onFinalCallback = null;
        this.onStatusCallback = null;

        // API Configuration
        this.apiKey = null; // Will be set via setApiKey()
        this.apiUrl = 'https://speech.googleapis.com/v1/speech:recognize';
        
        // Audio processing
        this.audioContext = null;
        this.mediaStream = null;
        this.processor = null;
        this.gainNode = null;
        this.gainValue = 1.0;

        // Streaming state
        this.streamingRequest = null;
        this.audioBuffer = [];
        this.isStreaming = false;
        this.streamId = null;
        this.finalizeTimer = null;
        this.chunkInterval = null;

        // Text accumulation
        this.accumulatedText = '';
        this.lastInterim = '';
        this.lastInterimTime = 0;

        // Cost tracking
        this.sessionStartTime = 0;
        this.totalUsageSeconds = 0;
        this.monthlyUsageKey = 'k_gcloud_monthly_usage';
        this.monthlyUsageDateKey = 'k_gcloud_monthly_date';
        
        // Initialize monthly tracking
        this._initMonthlyTracking();
    }

    setApiKey(key) {
        this.apiKey = key;
        console.log("[Cloud] API key ayarlandı");
    }

    setGain(value) {
        this.gainValue = parseFloat(value);
        if (this.gainNode) {
            this.gainNode.gain.value = this.gainValue;
            console.log("[Cloud] Gain ayarlandı:", this.gainValue);
        }
    }

    _initMonthlyTracking() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const storedDate = localStorage.getItem(this.monthlyUsageDateKey);
        
        if (storedDate) {
            const stored = new Date(storedDate);
            if (stored.getMonth() !== currentMonth || stored.getFullYear() !== currentYear) {
                // New month, reset usage
                localStorage.setItem(this.monthlyUsageKey, '0');
                localStorage.setItem(this.monthlyUsageDateKey, now.toISOString());
            }
        } else {
            localStorage.setItem(this.monthlyUsageDateKey, now.toISOString());
            localStorage.setItem(this.monthlyUsageKey, '0');
        }
    }

    _getMonthlyUsage() {
        return parseFloat(localStorage.getItem(this.monthlyUsageKey) || '0');
    }

    _addUsage(seconds) {
        const current = this._getMonthlyUsage();
        const newTotal = current + seconds;
        localStorage.setItem(this.monthlyUsageKey, newTotal.toString());
        
        // Check if approaching free tier limit (60 minutes = 3600 seconds)
        if (newTotal > 3300) { // 55 minutes warning
            console.warn("[Cloud] Aylık kullanım limitine yaklaşılıyor:", (newTotal / 60).toFixed(1), "dakika");
        }
        
        return newTotal;
    }

    _getUsageInfo() {
        const usage = this._getMonthlyUsage();
        const minutes = (usage / 60).toFixed(1);
        const freeMinutes = 60;
        const remaining = Math.max(0, freeMinutes - usage / 60);
        return {
            used: usage,
            minutes: parseFloat(minutes),
            remaining: remaining.toFixed(1),
            isFree: usage < 3600
        };
    }

    async _startAudioCapture() {
        try {
            // Get microphone stream
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000
            });

            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            // Gain control
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = this.gainValue;
            source.connect(this.gainNode);

            // Create script processor for audio chunks
            // Note: ScriptProcessorNode is deprecated but still widely supported
            // For production, consider using AudioWorkletNode instead
            const bufferSize = 4096;
            this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
            this.processor.onaudioprocess = (e) => {
                if (this.isStreaming) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const int16Array = this._convertFloat32ToInt16(inputData);
                    this._sendAudioChunk(int16Array);
                }
            };

            this.gainNode.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            console.log("[Cloud] Ses yakalama başladı");
        } catch (e) {
            console.error("[Cloud] Ses yakalama hatası:", e);
            throw e;
        }
    }

    _convertFloat32ToInt16(float32Array) {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return int16Array;
    }

    async _startStreaming() {
        if (!this.apiKey) {
            throw new Error("API key ayarlanmamış!");
        }

        // Check monthly usage limit
        const usage = this._getUsageInfo();
        if (!usage.isFree) {
            console.warn("[Cloud] Ücretsiz kullanım limiti aşıldı. Devam ediliyor ama ücretlendirme başlayacak.");
        }

        this.isStreaming = true;
        this.streamId = Date.now().toString();
        this.sessionStartTime = Date.now();
        this.audioBuffer = [];

        // Start chunk-based recognition
        this._processAudioChunks();
    }

    _processAudioChunks() {
        if (!this.isStreaming) return;

        // Collect audio for 1.5 seconds, then send for recognition
        // Store interval ID for cleanup
        this.chunkInterval = setInterval(() => {
            if (!this.isStreaming) {
                clearInterval(this.chunkInterval);
                this.chunkInterval = null;
                return;
            }

            if (this.audioBuffer.length > 0) {
                const audioChunk = this._mergeAudioBuffer();
                this._recognizeChunk(audioChunk);
                this.audioBuffer = [];
            }
        }, 1500); // Send every 1.5 seconds for near real-time
    }

    _mergeAudioBuffer() {
        // Merge all buffered audio chunks
        const totalLength = this.audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
        const merged = new Int16Array(totalLength);
        let offset = 0;
        
        for (const chunk of this.audioBuffer) {
            merged.set(chunk, offset);
            offset += chunk.length;
        }
        
        return merged;
    }

    async _recognizeChunk(audioData) {
        if (!this.isStreaming || audioData.length === 0) return;

        const config = {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'tr-TR',
            enableAutomaticPunctuation: false,
            model: 'latest_long'
        };

        const audioContent = this._arrayBufferToBase64(audioData.buffer);
        
        const request = {
            config: config,
            audio: {
                content: audioContent
            }
        };

        try {
            const url = `https://speech.googleapis.com/v1/speech:recognize?key=${this.apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const data = await response.json();
            this._handleRecognitionResponse(data);
        } catch (error) {
            console.error("[Cloud] Recognition hatası:", error);
            // Don't retry immediately, continue with next chunk
        }
    }

    _sendAudioChunk(audioData) {
        if (!this.isStreaming) return;
        
        // Buffer audio data
        this.audioBuffer.push(audioData);
        
        // Limit buffer size (keep last 2 seconds)
        const maxBufferSize = 32000; // ~2 seconds at 16kHz
        if (this.audioBuffer.length > 2) {
            this.audioBuffer.shift();
        }
    }

    _arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    _handleRecognitionResponse(response) {
        if (!response.results || response.results.length === 0) {
            return;
        }

        for (const result of response.results) {
            if (result.alternatives && result.alternatives.length > 0) {
                const transcript = result.alternatives[0].transcript;
                // Note: REST API returns final results only (no interim results support)
                // We show as interim first for real-time feel, then finalize
                
                if (transcript.trim()) {
                    const displayText = this._combineWithAccumulated(transcript);
                    
                    // Show as interim first (for real-time feel)
                    if (this.onInterimCallback) {
                        this.onInterimCallback(displayText);
                    }
                    
                    // Then finalize after a short delay
                    clearTimeout(this.finalizeTimer);
                    this.finalizeTimer = setTimeout(() => {
                        const fullText = this._combineWithAccumulated(transcript);
                        this.accumulatedText = '';
                        this.lastInterim = '';
                        if (this.onFinalCallback) {
                            this.onFinalCallback(fullText.trim());
                        }
                    }, 500); // Short delay for better UX
                }
            }
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

    async start() {
        if (this.isListening) {
            console.warn("[Cloud] Zaten dinleniyor");
            return;
        }

        if (!this.apiKey) {
            throw new Error("Google Cloud API key ayarlanmamış! Lütfen setApiKey() metodunu kullanın.");
        }

        try {
            this.isListening = true;
            this.accumulatedText = '';
            this.lastInterim = '';
            
            await this._startAudioCapture();
            await this._startStreaming();
            
            if (this.onStatusCallback) {
                this.onStatusCallback(true);
            }
            
            console.log("[Cloud] Dinleme başladı");
        } catch (error) {
            console.error("[Cloud] Başlatma hatası:", error);
            this.isListening = false;
            if (this.onStatusCallback) {
                this.onStatusCallback(false);
            }
            throw error;
        }
    }

    stop() {
        this.isListening = false;
        this.isStreaming = false;

        // Clear intervals and timers
        if (this.chunkInterval) {
            clearInterval(this.chunkInterval);
            this.chunkInterval = null;
        }
        
        if (this.finalizeTimer) {
            clearTimeout(this.finalizeTimer);
            this.finalizeTimer = null;
        }

        // Calculate usage
        if (this.sessionStartTime > 0) {
            const sessionSeconds = (Date.now() - this.sessionStartTime) / 1000;
            this._addUsage(sessionSeconds);
            this.sessionStartTime = 0;
        }

        // Stop audio processing
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }

        if (this.gainNode) {
            this.gainNode.disconnect();
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        // Finalize accumulated text
        if (this.accumulatedText) {
            if (this.onFinalCallback) {
                this.onFinalCallback(this.accumulatedText.trim());
            }
            this.accumulatedText = '';
        }

        if (this.onStatusCallback) {
            this.onStatusCallback(false);
        }

        console.log("[Cloud] Dinleme durduruldu");
    }

    onInterim(cb) { this.onInterimCallback = cb; }
    onFinal(cb) { this.onFinalCallback = cb; }
    onStatus(cb) { this.onStatusCallback = cb; }

    getUsageInfo() {
        return this._getUsageInfo();
    }
}

