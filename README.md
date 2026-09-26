# Movie Tracker

Kişisel film ve dizi takip paneli. TV Time, Letterboxd, Trakt gibi uygulamalardan ilham alır ama kendi görsel kimliğine sahiptir: sinematik karanlık tema, tek kilitli amber aksan rengi, poster odaklı kartlar.

**Tamamen statik bir React uygulamasıdır** — sunucu gerektirmez, GitHub Pages'ten doğrudan yayınlanır ve verilerin tamamı kullanıcının tarayıcısında (IndexedDB) saklanır.

## Özellikler

- **Ana sayfa paneli** — Devam Et (kaldığın bölümden), son izlenenler, izleme listesi, son eklenenler, favori türler, senin için öneriler, haftanın popülerleri, hızlı istatistikler.
- **Film & dizi takibi** — izledim/izlemedim, tekrar izle, favori, izleme listesi, 0.5 adımlı yıldız puanlama, kişisel not.
- **Bölüm bazlı dizi takibi** — sezon/bölüm seçici, tek bölüm/sezon/tüm diziyi işaretleme, otomatik "sıradaki bölüm" hesaplama, sezon ve genel ilerleme yüzdesi.
- **Keşfet** — trend/popüler/en çok beğenilen/yeni çıkan/yakında kategorileri, tür/yıl/puan/tip filtreleri, film+dizi karışık veya ayrı ayrı görünüm (Filmler, Diziler sayfaları aynı bileşeni kullanır).
- **Arama** — film/dizi/kişi arası anlık arama, son aramalar geçmişi, ⌘K hızlı erişim paleti.
- **Kitaplığım** — tümü/film/dizi/izleniyor/tamamlandı/planlandı/bırakıldı/favoriler sekmeleri, çoklu sıralama, ızgara/liste görünümü.
- **İzleme Listesi** — öncelik seviyeleri (yüksek/orta/düşük), kişisel not, manuel sıralama, doğrudan izledim işaretleme.
- **İstatistikler** — toplam film/dizi/bölüm, toplam izleme süresi, ortalama puan (film/bölüm ayrı), tür dağılımı, puan dağılımı, aylık aktivite ve izleme süresi grafikleri (yıl filtresiyle).
- **Favoriler & Listeler** — favori film/dizi galerisi, sınırsız kişisel liste (oluştur/yeniden adlandır/sil/sırala).
- **Profil** — avatar, görünen ad, favori türler, favori yapımlar, üyelik özeti.
- **Veri Yönetimi** — tüm veriyi JSON (tam yedek) veya CSV (kitaplık tablosu) olarak dışa aktarma; sürüm kontrollü içe aktarma (önizleme + birleştir/değiştir seçimi); tüm veriyi her yerden silme (onaylı).
- **Kendi TMDB anahtarın** — Ayarlar'dan kendi ücretsiz TMDB anahtarını gir; kaydederken canlı doğrulanır, hesabınla diğer cihazlarına eşitlenir ve JSON dışa aktarmaya dahil edilir.
- **Google hesabıyla giriş + otomatik eşitleme** — bir kez Google ile giriş yaparsın; verin kendi Drive'ının gizli uygulama klasöründe tutulur ve tüm cihazların arasında arka planda, kayıt kayıt birleştirilerek eşitlenir. Çakışma sorusu yok, saatlik oturum kilidi yok, sunucu yok.
- **PWA** — yüklenebilir, çevrimdışı çalışan uygulama kabuğu, servis çalışanı önbellekleme.
- **Erişilebilirlik** — klavye kısayolları (⌘/Ctrl+K, /, W, L, D, S), odak halkaları, `prefers-reduced-motion` desteği, semantik HTML.

## Teknoloji Yığını

| Katman | Seçim |
|---|---|
| Framework | React 18 + TypeScript (strict mode) |
| Derleme aracı | Vite 6 |
| Yönlendirme | React Router 7, `HashRouter` (bkz. [GitHub Pages notu](#neden-hashrouter)) |
| Stil | Tailwind CSS v4 |
| Bileşenler | Radix UI primitifleri üzerine özel tasarım sistemi |
| Durum yönetimi | Zustand |
| Yerel depolama | IndexedDB (`idb` paketi) |
| Grafikler | Recharts |
| İkonlar | lucide-react |
| PWA | vite-plugin-pwa |

## Kurulum

```bash
npm install
```

## Geliştirme

```bash
npm run dev       # http://localhost:5173
npm run lint       # ESLint
npm run build      # tip kontrolü + üretim derlemesi -> dist/
npm run preview    # üretim derlemesini yerelde önizle
```

Uygulama **hiçbir API anahtarı olmadan tamamen çalışır**: dahili, elle hazırlanmış bir örnek katalog (18 film, 6 dizi — gerçek bölüm verisiyle) kullanılır. Ayarlar sayfası hangi modda olduğunu ("TMDB bağlı" / "Çevrimdışı katalog") her zaman açıkça gösterir.

## API Yapılandırması (opsiyonel)

Gerçek, güncel film/dizi verisi için [The Movie Database (TMDB)](https://www.themoviedb.org/settings/api) üzerinden ücretsiz bir v3 API anahtarı alabilirsin.

**Yerel geliştirme için:**

```bash
cp .env.example .env.local
# .env.local içine gerçek anahtarını yaz:
# VITE_TMDB_API_KEY=xxxxxxxx
```

`.env.local` zaten `.gitignore` içinde — asla commit edilmez.

**Dağıtım (GitHub Pages) için:** anahtarı asla dosyaya yazma. Bunun yerine repository secret olarak ekle:

1. GitHub reposunda **Settings → Secrets and variables → Actions**
2. **New repository secret** → adı `TMDB_API_KEY`, değeri kendi anahtarın
3. `main` dalına her push'ta `.github/workflows/deploy.yml` bu secret'ı build sırasında `VITE_TMDB_API_KEY` olarak enjekte eder.

Statik + sunucusuz bir uygulama olduğundan, build'e gömülen her değer üretilen JS paketinde teknik olarak görünür olur (bu, istemci taraflı herkese açık API'ler için endüstri standardıdır — TMDB'nin kendi dokümantasyonu da istemci taraflı kullanıma izin verir). Secret olarak eklemenin faydası anahtarın **repo geçmişine hiç girmemesi**dir.

Anahtar olmadan uygulama sorunsuz şekilde örnek katalogla çalışmaya devam eder.

**Ya da her ziyaretçi kendi anahtarını girsin:** repo sahibi hiç `TMDB_API_KEY` eklemeden dağıtabilir; her ziyaretçi kendi ücretsiz anahtarını uygulama içinden **Ayarlar → Kendi TMDB API anahtarın** üzerinden girer. Bu anahtar:

- yalnızca o tarayıcının IndexedDB deposunda tutulur, hiçbir yerde/sunucuda toplanmaz;
- kaydedilmeden önce doğrudan TMDB'ye karşı test edilir (geçersizse anında bildirilir);
- build'e gömülü bir anahtar varsa bile onun önüne geçer (daha spesifik, daha yeni tercih olduğu için);
- kullanıcı isterse dışa aktardığı yedeklere de dahil edilir (bkz. aşağıdaki **Dışa/İçe Aktarma Formatı**) — bu yüzden **yedek dosyasını asla herkese açık paylaşma**.

## GitHub Pages'e Dağıtım

Repo, `.github/workflows/deploy.yml` içinde hazır bir GitHub Actions iş akışı içerir.

**Tek seferlik kurulum:**

1. GitHub reposunda **Settings → Pages**
2. **Source** olarak **GitHub Actions** seç
3. (Opsiyonel) Gerçek film verisi istiyorsan yukarıdaki gibi `TMDB_API_KEY` secret'ını ekle

Bundan sonra `main` dalına her push otomatik olarak derler ve `https://KULLANICI_ADI.github.io/REPO_ADI/` adresine yayınlar. İş akışını **Actions** sekmesinden elle de (`workflow_dispatch`) tetikleyebilirsin.

### Neden HashRouter?

Vite `base: './'` (göreli yol) ile yapılandırıldı, böylece derleme hangi alt dizine (`/REPO_ADI/`) yayınlanırsa yayınlansın hiçbir değişiklik gerekmez. Yönlendirme için `BrowserRouter` yerine bilinçli olarak `HashRouter` seçildi: URL'ler `#/film/123` şeklinde görünür ama bunun karşılığında GitHub Pages'te **hiçbir sunucu taraflı yeniden yazma kuralına ihtiyaç duymadan** her doğrudan link, yer imi ve sayfa yenilemesi %100 güvenilir şekilde çalışır. Bu, "depodan doğrudan yayınlanabilmeli" gereksinimini hiçbir ek yapılandırma riski almadan karşılamanın en sağlam yoludur.

## Google ile Giriş ve Drive Eşitlemesi

Uygulama **yerel önceliklidir**: her ekran cihazdaki IndexedDB'den çizilir, Google Drive ise arka planda eşitlenen bir kopyadır. Sunucu yoktur — her şey GitHub Pages'teki statik dosyalardan ve kullanıcının kendi Google hesabından ibarettir.

**Giriş (`src/services/auth/google.ts`):**

- OAuth 2.0 implicit akışı, **tam sayfa yönlendirmeyle** (popup yok, Google betiği yüklenmez — mobil tarayıcıların popup engelleme sorunları yaşanmaz). Google'ın yanıtı URL'nin `#` kısmında gelir; `src/main.tsx` bunu router çizilmeden önce işler ve adres çubuğundan siler.
- Dönen jeton `tokeninfo` ile doğrulanır: gerçekten bu uygulamaya (`aud`) verildiği, hangi hesaba ait olduğu ve Drive izninin işaretlenip işaretlenmediği kontrol edilir.
- **Hesap bağlantısı** (bu cihaz hangi hesaba ait) ile **erişim jetonu** (~1 saat) ayrı tutulur. Giriş ekranı yalnızca cihaz hiçbir hesaba bağlı değilse görünür; jetonun süresi dolması kimseyi dışarı atmaz.
- Jeton bittiğinde uygulama açılışta Google'a `prompt=none` ile **sessizce** gidip gelir (ekran yok, tıklama yok). Kullanıcı Google'dan çıkış yapmışsa bu başarısız olur; uygulama yerel veriyle çalışmaya devam eder ve üst çubukta "Bağlan" düğmesi çıkar. Sessiz deneme başarısız olursa 10 dakika tekrar denenmez (yönlendirme döngüsü olmaz).
- Refresh token kullanılmaz: bu, client secret tutan bir sunucu gerektirirdi.

**Eşitleme (`src/services/sync/`):**

- Verinin tamamı Drive'ın `appDataFolder`'ında (kullanıcının Drive'ında görünmeyen, yalnızca bu uygulamanın erişebildiği gizli klasör) tek bir gzip'li JSON dosyasıdır.
- Her kayıt (kitaplık girdisi, izleme kaydı, bölüm ilerlemesi, puan, not, liste, profil/ayarlar) kendi **saatini** taşır; silmeler iz (tombstone) bırakır. İki cihazın verisi kayıt kayıt birleştirilir: yeni olan kazanır, silmeler de diğer cihazlara ulaşır. Kullanıcıya "hangisini tutayım" diye hiç sorulmaz.
- Her eşitleme tek bir küçük metadata isteğiyle başlar (Drive'ın `version` alanı); değişiklik yoksa hiçbir şey indirilmez. Yerel değişiklikler 1,5 sn içinde, uygulamaya dönüldüğünde, bağlantı geri geldiğinde ve açıkken dakikada bir kontrol edilir.
- İki cihaz aynı anda yazarsa ve biri diğerinin üzerine yazarsa, kaybeden cihazın değişiklikleri kendi deposunda durduğu için bir sonraki turda geri yüklenir — sonuç yükleme sırasına bağlı değildir.
- "Tüm verimi sil" Drive'a yeni bir *epoch* ile boş bir kopya yazar; diğer cihazlar bunu görünce kendi kopyalarını yeniden yüklemek yerine siler.
- Önceki sürümün `movie-tracker-backup.json` yedeği, o sürümde `drive.file` izni verilmişse, hesabın ilk eşitlemesinde bir kereye mahsus içeri alınır (kayıtların kendi tarihleriyle — cihazdaki daha yeni sürümleri ezmez).

**Etkinleştirmek için (repo sahibi, tek seferlik):**

1. [Google Cloud Console](https://console.cloud.google.com/) → yeni proje (veya mevcut birini seç) ve **Google Drive API**'yi etkinleştir.
2. **Google Auth Platform → Branding**: uygulama adı, destek e-postası, ana sayfa (`https://KULLANICI_ADI.github.io/REPO_ADI/`) ve gizlilik politikası (`https://KULLANICI_ADI.github.io/REPO_ADI/privacy.html`) adreslerini doldur.
3. **Data Access**: `.../auth/userinfo.email` ve `.../auth/drive.appdata` kapsamlarını ekle (ikisi de hassas değildir, Google doğrulaması gerekmez). **Audience** kısmından uygulamayı "In production"a al.
4. **Clients → Create client** → uygulama tipi **Web application**:
   - **Authorized JavaScript origins**: `https://KULLANICI_ADI.github.io` (yerel geliştirme için ayrıca `http://localhost:5173`)
   - **Authorized redirect URIs**: `https://KULLANICI_ADI.github.io/REPO_ADI/` (sondaki `/` dahil, birebir; yerel için `http://localhost:5173/`)
5. Oluşan **Client ID**'yi kopyala (bu bir *secret* değildir — tarayıcı uygulamaları için Client ID'ler herkese açık olacak şekilde tasarlanmıştır).
6. GitHub reposunda **Settings → Secrets and variables → Actions → Variables** → **New repository variable** → adı `GOOGLE_CLIENT_ID`, değeri kopyaladığın Client ID.

Bu değişken tanımlı değilse giriş ekranı ve eşitleme tamamen devre dışı kalır ve uygulama yalnızca bu tarayıcıda çalışır.

## Veri Mimarisi

Kalıcı depo tarayıcının IndexedDB'sidir (hiçbir kullanıcı verisi bizim bir sunucumuza gitmez). Her yazma, aynı işlemde kaydın eşitleme saatini de (`syncClock` tablosu) yazar; Google Drive eşitlemesi yalnızca bu saatler üzerinden çalışır.

```
src/services/storage/   # IndexedDB erişiminin YEGANE yeri (db.ts + repository.ts)
src/services/auth/      # Google girişi (yönlendirmeli OAuth, sessiz yenileme)
src/services/sync/      # Drive istemcisi, gzip kodlama, eşitleme motoru
src/store/               # Zustand store'ları — repository.ts üzerinden okur/yazar,
                          # component'ler asla storage katmanına doğrudan dokunmaz
```

Bu ayrım bilinçli: depolama motoru ileride Supabase/Firebase gibi bir bulut arka ucuyla değiştirilmek istenirse, sadece `src/services/storage/` içindeki fonksiyonların gövdesi değişir — store'lar ve component'ler hiç etkilenmez.

### Film/Dizi Verisi Katmanı

```
src/api/tmdb/       # Ham TMDB istemcisi ve tip tanımları (sadece services/ tarafından kullanılır)
src/data/catalog/    # Dahili örnek katalog (TMDB anahtarı yokken kullanılır)
src/services/        # MovieService / TVService / SearchService / PeopleService —
                      # anahtar varsa TMDB'ye, yoksa örnek kataloğa şeffaf şekilde yönlenir
```

Component'ler her zaman `src/services` üzerinden konuşur; hangi kaynağın kullanıldığını bilmesi gerekmez.

## Dışa/İçe Aktarma Formatı

**Veri Yönetimi** sayfasından tüm veri, sürüm numaralı tek bir JSON dosyası olarak dışa aktarılabilir:

```json
{
  "version": 4,
  "exportedAt": "2026-09-19T12:00:00.000Z",
  "profile": { "displayName": "...", "favoriteGenreIds": [...] },
  "settings": { "theme": "dark", "...": "..." },
  "apiConfig": { "tmdbApiKey": "..." },
  "libraryEntries": [ { "mediaId": "...", "status": "completed", "isFavorite": true } ],
  "watchRecords": [ { "mediaId": "...", "watchedAt": "...", "runtimeMinutes": 148 } ],
  "episodeProgress": [ { "showId": "...", "seasonNumber": 3, "episodeNumber": 7, "watched": true } ],
  "ratings": [ { "mediaId": "...", "value": 4.5 } ],
  "reviews": [ { "mediaId": "...", "text": "..." } ],
  "lists": [ { "name": "En İyi 10 Filmim", "itemIds": [...] } ],
  "mediaCache": [ { "id": "...", "title": "...", "posterPath": "..." } ]
}
```

`mediaCache` alanı, izlediğin yapımların başlık/poster gibi bilgilerini de yedeğin içine dahil eder — böylece bir yedeği farklı bir tarayıcıya (TMDB anahtarı olmadan bile) geri yüklediğinde kitaplığın anlamsız ID'ler yerine gerçek başlıklarla görünür. `apiConfig.tmdbApiKey` alanı ise, sen Ayarlar'dan kendi anahtarını girdiysen, o anahtarı da taşır — **bu yüzden yedek dosyanı asla paylaşma veya herkese açık bir depoya yükleme.** İçe aktarma önizlemesi, yedeğin bir anahtar içerip içermediğini her zaman açıkça rozetle gösterir.

İçe aktarma sırasında dosya doğrulanır, sürümü kontrol edilir, kaç kayıt içerdiği önceden gösterilir ve **birleştir** (mevcut verinle harmanla) ya da **değiştir** (mevcut her şeyin yerine geç, onay ister) seçilir — yerel kitaplık zaten tamamen boşsa bu seçim anlamsız olduğundan atlanır ve yedek doğrudan içe aktarılır. **Birleştir** yalnızca eksik kayıtları ve dosyadaki daha yeni sürümleri ekler, hiçbir şeyi silmez ve daha yeni bir kaydı eskisiyle ezmez; **değiştir** dosyada olmayanları siler. İkisi de sıradan yerel değişiklik olarak kaydedilir, yani tüm cihazlara eşitlenir. `version` alanı şema değiştikçe otomatik göç için kullanılır — örneğin v1 yedeklerinde eksik olan `apiConfig` sessizce doldurulur.

CSV dışa aktarma, kitaplığının tek bir tablo görünümünü (başlık, tür, durum, puan, tarihler) üretir — hızlı göz atma/paylaşım için; tam yedekleme için her zaman JSON kullanılmalı.

## Gizlilik

- Movie Tracker'ın kendi bir sunucusu/arka ucu yoktur; her şey tarayıcının yerel IndexedDB deposunda tutulur.
- Analitik/izleme kodu yoktur.
- TMDB anahtarı yapılandırıldığında, yalnızca arama/keşif istekleri (film/dizi meta verisi) doğrudan tarayıcıdan TMDB'ye gider — kişisel izleme geçmişin asla bu isteklere dahil edilmez.
- Google hesabıyla giriş yapınca uygulama yalnızca e-posta adresini ve Drive'ının gizli uygulama klasörünü (`drive.appdata`) görebilir — Drive'ındaki diğer dosyalara erişemez. Erişim jetonu yalnızca tarayıcıda (`localStorage`) tutulur ve ~1 saatte geçersiz olur. Ayrıntılar: [`public/privacy.html`](public/privacy.html).
- Kendi TMDB anahtarını girersen, bu anahtar hesabınla diğer cihazlarına eşitlenir ve JSON dışa aktarmaya dahil edilir — o dosyayı paylaşmamaya dikkat et.
- Verilerin her zaman senindir: tek tıkla tam dışa aktarma her zaman kullanılabilir; "Tüm verimi sil" her şeyi Drive dahil her yerden kaldırır, "Çıkış yap" ise yalnızca bu cihazdaki kopyayı siler.

## Proje Yapısı

```
src/
  api/         # Ham TMDB istemcisi (yalnızca services/ tarafından kullanılır)
  components/  # ui/ (tasarım sistemi), media/ (poster kartları, raylar), nav/, stats/, discover/, settings/
  data/        # Örnek katalog ve tür sabitleri
  hooks/       # Paylaşılan davranışlar (izleme aksiyonları, debounce, klavye kısayolları...)
  layouts/     # AppLayout (üst bar + kenar çubuğu + alt gezinme + önyükleme)
  pages/       # Rota başına bir sayfa bileşeni
  services/    # MovieService/TVService/SearchService + depolama, giriş ve eşitleme katmanları
  store/       # Zustand store'ları (kitaplık, puanlar, listeler, profil, medya önbelleği)
  types/       # Alan modelleri ve dışa/içe aktarma şeması
  utils/       # Saf yardımcı fonksiyonlar (ilerleme hesaplama, istatistikler, tema, vb.)
```

## Bilinen Kapsam Dışı / Yol Haritası

Aşağıdakiler mimari olarak öngörülmüştür ama bu sürümde uygulanmamıştır:

- Takvim görünümü (yayın takvimi)
- Oyuncu/yönetmen detay sayfaları ve favori kişi takibi
- Onboarding sihirbazı
- Trakt/Letterboxd/TV Time'dan içe aktarma

## Katkı

Bu bir kişisel proje şablonudur; yine de PR'lar açıksa: `npm run lint` ve `npm run build` komutlarının hatasız geçtiğinden emin ol, yeni bileşenlerde mevcut tasarım sistemini (`src/components/ui`) kullan ve depolama katmanına asla component'lerden doğrudan erişme — her zaman `src/services` üzerinden geç.

## Tasarım Sistemi Notu

Bu proje `.claude/skills/` altında iki Claude Code skill kaynağı içerir (geliştirme sürecinde kullanıldı):

- **[taste-skill](https://github.com/Leonxlnx/taste-skill)** — anti-slop frontend skill'leri (`design-taste-frontend`, `minimalist-ui`, `industrial-brutalist-ui`, `brandkit`, görsel üretim varyantları vb.). `skills-lock.json` içinde takip edilir; `npx skills update` ile güncellenir.
- **[awesome-design-md](https://github.com/VoltAgent/awesome-design-md)** — 70'ten fazla gerçek dünya `DESIGN.md` dosyasından oluşan katalog (Spotify, Pinterest, Apple, Stripe...), `.claude/skills/awesome-design-md/SKILL.md` olarak sarmalandı.

Bu klasörler uygulamanın çalışması için gerekli değildir; yalnızca gelecekteki geliştirme oturumları için tasarım referansı olarak tutulur.
