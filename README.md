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
- **Veri Yönetimi** — tüm veriyi JSON (tam yedek) veya CSV (kitaplık tablosu) olarak dışa aktarma; sürüm kontrollü içe aktarma (önizleme + birleştir/değiştir seçimi); örnek veri yükleme; tüm yerel veriyi silme (onaylı).
- **Kendi TMDB anahtarın** — Ayarlar'dan kendi ücretsiz TMDB anahtarını gir; bu tarayıcıda saklanır, kaydederken canlı doğrulanır ve yedeklerine dahil edilir.
- **Google Drive'a yedekleme** — kendi Google hesabınla bağlan, tüm verini tek tıkla kendi Drive'ındaki (yalnızca bu uygulamanın erişebildiği) bir dosyaya yedekle ya da oradan geri yükle. Sunucusuz, tamamen istemci taraflı.
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

## Google Drive'a Yedekleme (opsiyonel)

Ayarlar'daki **Google Drive yedekleme**, kullanıcının kendi Google hesabına bağlanıp verisini kendi Drive'ına yedeklemesini/geri yüklemesini sağlar. Bu, "Google ile giriş yapıp veriyi bir depoya yükleme" fikrinin **sunucusuz** karşılığıdır: GitHub'a yazmak GitHub'ın kendi token'ını gerektirdiğinden (Google kimliği GitHub'ı yetkilendiremez) ve GitHub'ın OAuth değişimi tarayıcıdan doğrudan yapılamadığından, yedekleme hedefi olarak — statik bir sitenin sunucusuz gerçekleştirebildiği — Google Drive seçildi.

**Nasıl çalışır:**

- Google Identity Services'in istemci taraflı token akışı kullanılır (`google.accounts.oauth2`) — client secret yok, backend yok.
- İstenen kapsam yalnızca `drive.file`: uygulama **sadece kendi oluşturduğu** `movie-tracker-backup.json` dosyasını görebilir, kullanıcının Drive'ındaki başka hiçbir dosyaya erişemez.
- Erişim jetonu yalnızca bellekte (sekme/oturum ömrü boyunca) tutulur; hiçbir zaman IndexedDB'ye ya da dışa aktarılan bir yedeğe yazılmaz. Jeton süresi dolduğunda (~1 saat) bir sonraki yedekleme/geri yükleme işleminde Google tekrar kısa bir onay ister.
- Yedekleme, aynı `buildExportBundle()`/`applyImport()` mantığını (yerel JSON dışa/içe aktarmayla birebir aynı format ve birleştir/değiştir onay ekranı) kullanır — iki yol da tek bir koddan geçer.
- Bağlandıktan sonra **elle yedekle demene gerek kalmaz**: kitaplık/puan/liste/profil değişiklikleri birkaç saniye içinde otomatik olarak (debounce'lu, sessizce) Drive'a yedeklenir (`src/services/autoSync.ts`). Erişim jetonu ~1 saat sonra sona erdiğinde ve tarayıcı (haklı olarak) bir tıklama olmadan açılan bir OAuth penceresini engellediğinde, uygulama sessizce başarısız olmak yerine tek seferlik, düşük profilli bir bildirim gösterir: "Google Drive bağlantısı yenilenmeli" + **Yeniden Bağlan** düğmesi (gerçek bir tıklama olduğu için engellenmez).

**Etkinleştirmek için (repo sahibi, tek seferlik):**

1. [Google Cloud Console](https://console.cloud.google.com/) → yeni proje (veya mevcut birini seç).
2. **APIs & Services → OAuth consent screen** → "External" tipini seç, uygulama adını doldur (Drive kapsamı hassas olmadığından doğrulama genelde gerekmez).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → uygulama tipi **Web application**.
4. **Authorized JavaScript origins** kısmına GitHub Pages adresini ekle: `https://KULLANICI_ADI.github.io` (yerel geliştirme için ayrıca `http://localhost:5173`).
5. Oluşan **Client ID**'yi kopyala (bu bir *secret* değildir — tarayıcı uygulamaları için Client ID'ler herkese açık olacak şekilde tasarlanmıştır).
6. GitHub reposunda **Settings → Secrets and variables → Actions → Variables** sekmesi → **New repository variable** → adı `GOOGLE_CLIENT_ID`, değeri kopyaladığın Client ID.

Bu değişken tanımlı değilse "Google Drive yedekleme" satırı Ayarlar'da devre dışı ("Kullanılamıyor") görünür ve Veri Yönetimi'ndeki kart hiç gösterilmez — özelliğin yokluğu uygulamanın geri kalanını hiçbir şekilde etkilemez.

## Veri Mimarisi

Uygulama **yerel öncelikli**dir: tüm kullanıcı verisi tarayıcının IndexedDB deposunda tutulur, hiçbir şey bir sunucuya gönderilmez.

```
src/services/storage/   # IndexedDB erişiminin YEGANE yeri (db.ts + repository.ts)
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
  "version": 2,
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

İçe aktarma sırasında dosya doğrulanır, sürümü kontrol edilir, kaç kayıt içerdiği önceden gösterilir ve **birleştir** (mevcut verinle harmanla) ya da **değiştir** (mevcut her şeyin yerine geç, onay ister) seçilir. `version` alanı şema değiştikçe otomatik göç için kullanılır — örneğin v1 → v2 geçişinde eksik olan `apiConfig` sessizce boş nesneye tamamlanır.

CSV dışa aktarma, kitaplığının tek bir tablo görünümünü (başlık, tür, durum, puan, tarihler) üretir — hızlı göz atma/paylaşım için; tam yedekleme için her zaman JSON kullanılmalı.

## Gelecekteki Bulut Senkronizasyonu Mimarisi

Bu sürüm **kasıtlı olarak** hesapsız çalışır; birincil depo her zaman yereldir (IndexedDB). Yukarıdaki **Google Drive'a Yedekleme** bunun istisnası değil, tamamlayıcısıdır: kullanıcı açıkça bağlanmadıkça hiçbir veri cihazdan çıkmaz, bağlandığında da yalnızca kendi Drive hesabına gider — paylaşılan bir arka uç veya hesap sistemi değildir.

Gerçek bir **hesap tabanlı** senkronizasyon (birden çok cihaz arasında otomatik, sürekli eşitleme; `UserSettings.dataMode: 'local' | 'cloud'` tipinde şimdiden yer ayrılmıştır) hâlâ bu sürümün kapsamı dışındadır. İleride eklenirse dokunulması gereken tek katman `src/services/storage/` olacaktır; store'lar ve component'ler değişmeden kalabilir. Planlanan olası yön: Google/Apple/e-posta ile kimlik doğrulama, ardından Supabase/Firebase gibi bir arka uca sürekli senkronizasyon.

## Gizlilik

- Movie Tracker'ın kendi bir sunucusu/arka ucu yoktur; her şey tarayıcının yerel IndexedDB deposunda tutulur.
- Analitik/izleme kodu yoktur.
- TMDB anahtarı yapılandırıldığında, yalnızca arama/keşif istekleri (film/dizi meta verisi) doğrudan tarayıcıdan TMDB'ye gider — kişisel izleme geçmişin asla bu isteklere dahil edilmez.
- Google Drive'a bağlandığında, uygulama yalnızca kendi oluşturduğu tek bir yedek dosyasını görebilir (`drive.file` kapsamı) — Drive'ındaki başka hiçbir dosyaya erişemez. Erişim jetonu yalnızca o oturumda, bellekte tutulur; hiçbir yere yazılmaz.
- Kendi TMDB anahtarını girersen, bu anahtar dışa aktardığın yedeklere dahil edilir (senin tercihinle) — bu yedek dosyalarını paylaşmamaya dikkat et.
- Verilerin her zaman senindir: tek tıkla tam dışa aktarma her zaman kullanılabilir, hesap kilidi yoktur.

## Proje Yapısı

```
src/
  api/         # Ham TMDB istemcisi (yalnızca services/ tarafından kullanılır)
  components/  # ui/ (tasarım sistemi), media/ (poster kartları, raylar), nav/, stats/, discover/, settings/
  data/        # Örnek katalog, tür sabitleri, örnek veri tohumlama mantığı
  hooks/       # Paylaşılan davranışlar (izleme aksiyonları, debounce, klavye kısayolları...)
  layouts/     # AppLayout (üst bar + kenar çubuğu + alt gezinme + önyükleme)
  pages/       # Rota başına bir sayfa bileşeni
  services/    # MovieService/TVService/SearchService + depolama katmanı
  store/       # Zustand store'ları (kitaplık, puanlar, listeler, profil, medya önbelleği)
  types/       # Alan modelleri ve dışa/içe aktarma şeması
  utils/       # Saf yardımcı fonksiyonlar (ilerleme hesaplama, istatistikler, tema, vb.)
```

## Bilinen Kapsam Dışı / Yol Haritası

Aşağıdakiler mimari olarak öngörülmüştür ama bu sürümde uygulanmamıştır:

- Takvim görünümü (yayın takvimi)
- Oyuncu/yönetmen detay sayfaları ve favori kişi takibi
- Onboarding sihirbazı
- Hesap tabanlı, çok cihazlı sürekli bulut senkronizasyonu (Google Drive'a manuel/tek dosya yedekleme zaten uygulandı — bkz. yukarısı)
- Trakt/Letterboxd/TV Time'dan içe aktarma

## Katkı

Bu bir kişisel proje şablonudur; yine de PR'lar açıksa: `npm run lint` ve `npm run build` komutlarının hatasız geçtiğinden emin ol, yeni bileşenlerde mevcut tasarım sistemini (`src/components/ui`) kullan ve depolama katmanına asla component'lerden doğrudan erişme — her zaman `src/services` üzerinden geç.

## Tasarım Sistemi Notu

Bu proje `.claude/skills/` altında iki Claude Code skill kaynağı içerir (geliştirme sürecinde kullanıldı):

- **[taste-skill](https://github.com/Leonxlnx/taste-skill)** — anti-slop frontend skill'leri (`design-taste-frontend`, `minimalist-ui`, `industrial-brutalist-ui`, `brandkit`, görsel üretim varyantları vb.). `skills-lock.json` içinde takip edilir; `npx skills update` ile güncellenir.
- **[awesome-design-md](https://github.com/VoltAgent/awesome-design-md)** — 70'ten fazla gerçek dünya `DESIGN.md` dosyasından oluşan katalog (Spotify, Pinterest, Apple, Stripe...), `.claude/skills/awesome-design-md/SKILL.md` olarak sarmalandı.

Bu klasörler uygulamanın çalışması için gerekli değildir; yalnızca gelecekteki geliştirme oturumları için tasarım referansı olarak tutulur.
