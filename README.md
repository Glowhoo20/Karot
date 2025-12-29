# 🥕 Karot - Yasaklı Kelime Oyunu

Karot, gerçek zamanlı konuşma tanıma teknolojisi kullanarak yasaklı kelimeleri tespit eden interaktif bir oyun uygulamasıdır. Oyuncular konuşurken belirlenen yasaklı kelimeleri kullanmamaya çalışırlar ve her hata için ceza puanı alırlar.

## 🎮 Oyun Nasıl Oynanır?

1. **Yasaklı Kelimeleri Belirleyin**: "YASAKLI" sekmesinden oyunda kullanılması yasak olan kelimeleri ekleyin.
2. **Oyuncuları Ekleyin**: "SKORLAR" sekmesinden oyuncuları ekleyin.
3. **Oyunu Başlatın**: "DİNLE" sekmesinde yeşil başlat butonuna basın.
4. **Konuşun**: Mikrofonunuz açıkken konuşmaya başlayın.
5. **Yasaklı Kelime Tespiti**: Sistem yasaklı kelimeleri otomatik olarak tespit eder ve kırmızı bir uyarı gösterir.
6. **Ceza Puanı**: Yasaklı kelime tespit edildiğinde, ilgili oyuncuya ceza puanı ekleyin.

## ✨ Özellikler

- 🎤 **Gerçek Zamanlı Konuşma Tanıma**: 
  - Google Cloud Speech-to-Text (hızlı, yüksek doğruluk)
  - Web Speech API (fallback, ücretsiz)
  - Otomatik servis seçimi ve fallback mekanizması
- 🚫 **Yasaklı Kelime Tespiti**: Otomatik kelime tespiti ve vurgulama
- 📊 **Skor Takibi**: Oyuncu bazlı ceza puanı takibi
- 🎮 **Oyunlaştırma**: 
  - Seviye sistemi ve deneyim puanları
  - Başarım rozetleri (6 farklı başarım)
  - Liderlik tablosu
  - İstatistik dashboard
- 🎨 **Modern UI**: 
  - Dark/Light mode toggle
  - Glassmorphism tasarım
  - Smooth animasyonlar ve efektler
  - Partikül efektleri ve confetti
- 📱 **Mobil Uyumlu**: Responsive tasarım
- 🔊 **Ses Kontrolü**: Mikrofon gain ayarı
- 💾 **Yerel Depolama**: Ayarlar ve veriler tarayıcıda saklanır
- 💰 **Maliyet Takibi**: Google Cloud kullanım takibi ve limit uyarıları
- 🔒 **Güvenli API Key Yönetimi**: Config dosyası ile profesyonel yapılandırma

## 🛠️ Teknolojiler

- **HTML5**: Yapısal iskelet
- **Tailwind CSS**: Stil framework'ü
- **Vanilla JavaScript**: Saf JavaScript ile geliştirilmiş
- **Google Cloud Speech-to-Text API**: Hızlı ve doğru konuşma tanıma (öncelikli)
- **Web Speech API**: Konuşma tanıma (fallback)
- **Web Audio API**: Ses işleme ve gain kontrolü
- **LocalStorage**: Veri kalıcılığı
- **Node.js**: Build script'leri için (opsiyonel)

## 📋 Gereksinimler

- **Modern bir web tarayıcı** (Chrome, Edge, Safari önerilir)
- **Mikrofon erişimi** (oyun için zorunlu)
- **HTTPS bağlantısı** (veya localhost) - Web Speech API için gerekli
- **Google Cloud API Key** (opsiyonel, daha hızlı performans için önerilir)
  - Ücretsiz tier: Aylık 60 dakika
  - Kurulum için `docs/API_KEY_SETUP.md` dosyasına bakın
- **Python 3.x** veya **Node.js** (yerel sunucu için)

## 🚀 Kurulum ve Çalıştırma

> **💡 Hızlı Başlangıç:** Detaylı adımlar için [QUICKSTART.md](QUICKSTART.md) dosyasına bakın.

### Hızlı Başlangıç

1. **Projeyi klonlayın veya indirin:**
```bash
git clone <repository-url>
cd Karot
```

2. **Google Cloud API Key'i yapılandırın (opsiyonel, daha hızlı performans için önerilir):**
```bash
# Windows PowerShell:
Copy-Item assets\js\config\config.js.example assets\js\config\config.js

# Linux/Mac:
cp assets/js/config/config.js.example assets/js/config/config.js
```

Ardından `assets/js/config/config.js` dosyasını açın ve API key'inizi ekleyin:
```javascript
const GOOGLE_CLOUD_API_KEY = 'AIzaSy...'; // API key'iniz
```

> **Not:** API key yoksa otomatik olarak Web Speech API kullanılacaktır.

3. **Projeyi çalıştırın:**

**Python ile (Önerilen):**
```bash
python -m http.server 8000
```

**Node.js ile:**
```bash
npx http-server -p 8000
```

**npm script ile (Önerilen - Otomatik Python/Node.js seçimi):**
```bash
npm run dev
```

> **Not:** `npm run dev` komutu otomatik olarak Python varsa Python'ı, yoksa Node.js http-server'ı kullanır.

4. **Tarayıcıda açın:**
```
http://localhost:8000
```

### 📝 Çalıştırma Adımları

1. **Mikrofon izni verin:** Tarayıcı mikrofon erişimi isteyecektir, izin verin.

2. **Yasaklı kelimeleri ekleyin:** "YASAKLI" sekmesinden oyunda kullanılması yasak olan kelimeleri ekleyin.

3. **Oyuncuları ekleyin:** "SKORLAR" sekmesinden oyuncuları ekleyin.

4. **Oyunu başlatın:** "DİNLE" sekmesinde yeşil başlat butonuna tıklayın.

5. **Konuşun:** Mikrofonunuz açıkken konuşmaya başlayın. Sistem yasaklı kelimeleri otomatik tespit edecektir.

6. **Başarımları takip edin:** "ROZETLER" sekmesinden başarımlarınızı görüntüleyin.

7. **Liderlik tablosunu kontrol edin:** "LİDERLİK" sekmesinden en iyi oyuncuları görüntüleyin.

8. **İstatistikleri görüntüleyin:** "SKORLAR" sekmesinde oyun istatistiklerinizi (seviye, seri, doğruluk) takip edin.

### 🌐 Production Deploy

**Vercel'e Deploy:**

1. Vercel hesabınıza giriş yapın
2. Projeyi Vercel'e bağlayın:
```bash
vercel
```

Veya GitHub'a push yaptıktan sonra Vercel dashboard'dan projeyi import edin.

**Not**: Vercel'de `config.js` dosyasını environment variable olarak ekleyebilir veya direkt dosya olarak deploy edebilirsiniz.

**Diğer Platformlar:**
- **Netlify:** Drag & drop ile deploy edebilirsiniz
- **GitHub Pages:** `gh-pages` branch'i oluşturup push edin
- **Heroku:** Static site olarak deploy edebilirsiniz

## 📖 Kullanım Kılavuzu

### Yasaklı Kelime Ekleme

1. Alt menüden "YASAKLI" sekmesine gidin
2. Input alanına yasaklı kelimeyi yazın
3. "+" butonuna tıklayın
4. Kelimeyi silmek için kelime kartındaki "×" butonuna tıklayın

### Oyuncu Ekleme ve Skor Takibi

1. Alt menüden "SKORLAR" sekmesine gidin
2. Input alanına oyuncu adını yazın
3. "+" butonuna tıklayın
4. Yasaklı kelime tespit edildiğinde, oyuncu kartındaki "+" butonuna tıklayarak ceza puanı ekleyin
5. Tüm skorları sıfırlamak için "Skorları Sıfırla" butonuna tıklayın

### Oyunu Başlatma

1. "DİNLE" sekmesine gidin
2. Yeşil başlat butonuna tıklayın
3. Mikrofon izni verin (tarayıcı izin isteyecektir)
4. Konuşmaya başlayın
5. Sistem yasaklı kelimeleri otomatik tespit edecektir
6. Durdurmak için kırmızı durdur butonuna tıklayın

### Debug Özellikleri

Sol üst köşedeki debug panelinde:
- **DURUM**: Sistem durumu (BEKLİYOR, DİNLİYOR, DURDU)
- **SÜRE**: Dinleme süresi
- **SERVİS**: Kullanılan servis (GOOGLE CLOUD veya WEB SPEECH)
- **KULLANIM**: Google Cloud kullanım bilgisi (sadece Google Cloud kullanıldığında)
  - Kullanılan dakika
  - Kalan ücretsiz dakika
- **GAİN**: Mikrofon ses seviyesi ayarı (1x - 5x)
- **Sesi İndir**: Kaydedilen sesi indirme (debug amaçlı, sadece Web Speech API)

## 🎯 Nasıl Çalışır?

1. **Konuşma Tanıma**: 
   - Sistem önce Google Cloud Speech-to-Text API'yi dener (API key varsa)
   - Başarısız olursa otomatik olarak Web Speech API'ye geçer
   - Her iki servis de sürekli olarak mikrofon girişini dinler ve konuşmayı metne çevirir
2. **Kelime Tespiti**: Sistem, tanınan metni yasaklı kelime listesiyle karşılaştırır.
3. **Uyarı Sistemi**: Yasaklı kelime tespit edildiğinde:
   - Ekran kırmızı bir flash efekti gösterir
   - Sesli bir uyarı (beep) çalar
   - Kelime kırmızı renkle vurgulanır
4. **Performans**: Google Cloud API, Web Speech API'den daha hızlı ve doğru sonuçlar verir.

## 🔧 Teknik Detaylar

### Google Cloud Speech-to-Text (Öncelikli)
- **API**: Google Cloud Speech-to-Text REST API
- **Dil**: Türkçe (`tr-TR`)
- **Format**: LINEAR16, 16kHz sample rate
- **Chunk-based Recognition**: Her 1.5 saniyede bir audio chunk gönderilir
- **Maliyet**: Aylık 60 dakika ücretsiz, sonrası $0.016/dakika

### Web Speech API (Fallback)
- **Speech Recognition**: `webkitSpeechRecognition` API kullanılıyor
- **Dil**: Türkçe (`tr-TR`)
- **Sürekli Dinleme**: `continuous: true`
- **Interim Results**: Geçici sonuçlar gösteriliyor
- **Otomatik Yeniden Başlatma**: 10 saniyede bir proaktif restart
- **Watchdog**: 5 saniye yanıt yoksa otomatik restart

## 📝 Notlar

- Web Speech API sadece HTTPS veya localhost üzerinde çalışır
- Chrome ve Edge tarayıcıları en iyi desteği sağlar
- Mikrofon izni gereklidir
- İlk yüklemede varsayılan yasaklı kelimeler: "elma", "şey", "bu"
- API key yönetimi için `config.js` dosyası kullanılır (güvenlik için, .gitignore'da)

## 🐛 Bilinen Sorunlar

- Bazı tarayıcılarda Web Speech API desteği sınırlı olabilir
- Uzun süreli dinleme oturumlarında performans düşüşü olabilir (otomatik restart ile çözülmüştür)
- Google Cloud API key yoksa otomatik olarak Web Speech API kullanılır

## 📄 Lisans

Bu proje açık kaynaklıdır ve özgürce kullanılabilir.

## 👨‍💻 Geliştirici Notları

- Proje vanilla JavaScript ile geliştirilmiştir, herhangi bir framework bağımlılığı yoktur
- Tailwind CSS CDN üzerinden yüklenmektedir
- Tüm veriler localStorage'da saklanmaktadır
- Vercel'e deploy için `vercel.json` yapılandırma dosyası mevcuttur
- API key yönetimi için `config.js` dosyası kullanılmaktadır (güvenlik için `.gitignore`'da)
- Modüler klasör yapısı: `services/`, `components/`, `utils/`, `config/`
