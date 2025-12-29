# 🚀 Hızlı Başlangıç

Karot projesini hızlıca çalıştırmak için aşağıdaki adımları takip edin.

## Adımlar

### 1. Projeyi İndirin

```bash
git clone <repository-url>
cd Karot
```

Veya ZIP olarak indirip açın.

### 2. (Opsiyonel) API Key Yapılandırın

Daha hızlı performans için Google Cloud API key ekleyebilirsiniz:

**Windows PowerShell:**
```powershell
Copy-Item assets\js\config\config.js.example assets\js\config\config.js
```

**Linux/Mac:**
```bash
cp assets/js/config/config.js.example assets/js/config/config.js
```

Ardından `assets/js/config/config.js` dosyasını açın ve API key'inizi ekleyin:
```javascript
const GOOGLE_CLOUD_API_KEY = 'AIzaSy...'; // API key'iniz
```

> **Not:** API key yoksa otomatik olarak Web Speech API kullanılacaktır.

### 3. Projeyi Çalıştırın

```bash
npm run dev
```

Bu komut otomatik olarak:
- Python varsa Python HTTP server kullanır
- Python yoksa Node.js http-server kullanır
- Port 8000'de başlatır

### 4. Tarayıcıda Açın

```
http://localhost:8000
```

## Hızlı Test

1. Mikrofon izni verin
2. "DİNLE" sekmesinde yeşil başlat butonuna tıklayın
3. Konuşmaya başlayın!

## Sorun mu Yaşıyorsunuz?

Detaylı bilgi için [README.md](README.md) dosyasına bakın.

