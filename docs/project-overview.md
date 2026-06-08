# NimTask — Project Overview

Dokumentasi ini membahas struktur dan fondasi teknis proyek **NimTask** (nama di `package.json` tertulis `freelance`). Fokus dokumentasi adalah struktur folder, file, teknologi, konfigurasi Vite, dependensi, dan entry point aplikasi. Pembahasan detail tentang database/Supabase tidak termasuk di sini.

---

## 1. Ringkasan Project

NimTask adalah aplikasi web **freelance marketplace** yang mempertemukan dua peran utama:

- **Customer** — pihak yang membutuhkan jasa.
- **Freelancer** — pihak yang menawarkan jasa.

Aplikasi dibangun sebagai **Multi-Page Application (MPA)** dengan pendekatan vanilla — tanpa framework frontend modern (React/Vue/Svelte). Logika UI disusun dalam modul-modul ES Module yang dilayani oleh Vite.

Nama internal proyek di `package.json` adalah `freelance`, namun secara dokumentasi dan identitas produk disebut **NimTask**.

---

## 2. Tujuan Aplikasi

Tujuan aplikasi (berdasarkan struktur halaman dan modul yang tersedia):

1. **Autentikasi pengguna** — login & signup dengan dua role (`customer` / `freelancer`).
2. **Manajemen layanan (services)** — freelancer dapat membuat, memperbarui, dan menonaktifkan layanan.
3. **Pemesanan (booking/order)** — customer dapat memesan layanan freelancer dan melacak status order.
4. **Profil pengguna** — pengelolaan data profil per-role.
5. **Komunikasi realtime** — chat antara customer dan freelancer.
6. **Dashboard per-role** — tampilan berbeda untuk customer dan freelancer (termasuk halaman income untuk freelancer).

---

## 3. Teknologi yang Digunakan

| Layer | Teknologi | Keterangan |
|---|---|---|
| Build tool / Dev server | **Vite** `^8.0.10` | Bundler, HMR, dev server di port `5173`. |
| Bahasa | **JavaScript (ES Modules)** | Vanilla JS, tidak ada framework UI. |
| Markup & Styling | **HTML5 + CSS3** | File HTML terpisah per halaman, CSS dipisah per modul. |
| Backend Client | **`@supabase/supabase-js`** `^2.105.2` | Digunakan untuk auth, database, storage, dan realtime (detail skema tidak dibahas di sini). |
| Package type | `type: "module"` | Proyek dikonfigurasi sebagai ESM. |

> Catatan: Tidak ditemukan framework frontend (React, Vue, dll.), tidak ada TypeScript, tidak ada bundler alternatif, dan tidak ada CSS preprocessor.

---

## 4. Struktur Folder

```
ba project 1.2/
├── .env                          # Variabel lingkungan (Supabase URL & key)
├── .gitignore
├── index.html                    # Entry HTML root (iframe ke src/index.html)
├── package.json                  # Metadata & dependensi proyek
├── package-lock.json
├── vite.config.js                # Konfigurasi build Vite (multi-entry)
├── supabase-schema.sql           # (Tidak dibahas di dokumen ini)
├── TODO.md
├── CODEBASE_REVIEW.md
├── DATABASE_REVIEW.md
├── DATABASE_REVIEW_2.md
├── public/
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── main.js                   # Entry JS minimal untuk Vite (dev mode)
    ├── index.html                # Halaman utama (landing)
    ├── home.html                 # Halaman home
    ├── login.html                # Halaman login
    ├── signup.html               # Halaman registrasi
    ├── dashboard.html            # Dashboard utama (router role)
    ├── customer-dashboard.html   # Dashboard khusus customer
    ├── freelancer-dashboard.html # Dashboard khusus freelancer
    ├── freelancer-income.html    # Halaman income freelancer
    ├── profile.html              # Halaman profil
    ├── chat.html                 # Halaman chat/realtime messaging
    ├── assets/
    │   ├── favicon.svg
    │   ├── icons.svg
    │   ├── logo.svg
    │   └── vite.svg
    ├── css/
    │   ├── style.css             # Global styles
    │   ├── dashboard.css         # Styles dashboard
    │   ├── navigation.css        # Styles navigasi/sidebar
    │   ├── profile.css           # Styles profil
    │   └── chat.css              # Styles chat
    └── js/
        ├── supabase.js           # Inisialisasi client Supabase
        ├── auth.js               # Modul autentikasi
        ├── service.js            # CRUD layanan freelancer
        ├── booking.js            # Manajemen order/booking
        ├── profile.js            # Manajemen profil
        ├── chat.js               # Modul chat realtime
        ├── realtime.js           # Helper realtime subscriptions
        ├── notifications.js      # Notifikasi UI
        ├── toast.js              # Komponen toast/feedback
        ├── animation.js          # Efek animasi UI
        ├── navigation.js         # Logika navigasi/sidebar
        ├── dashboardCustomer.js  # Logika dashboard customer
        ├── dashboardFreelancer.js# Logika dashboard freelancer
        ├── income.js             # Logika halaman income
        └── orderUtils.js         # Utilitas order
```

---

## 5. Penjelasan File Penting

### 5.1 File Root (Konfigurasi Proyek)

| File | Fungsi |
|---|---|
| `index.html` | HTML root di level proyek. Saat ini memuat sebuah `<iframe>` penuh yang mengarah ke `src/index.html`. Berfungsi sebagai shell loader. |
| `package.json` | Mendefinisikan nama proyek (`freelance`), skrip `dev`/`build`/`preview`, dan daftar dependensi. |
| `vite.config.js` | Konfigurasi Vite: `base: './'`, multi-entry input, dev server port `5173`. |
| `.env` | Menyimpan kredensial Supabase (tidak dibahas detail di sini). |
| `public/` | Aset statis yang disajikan langsung oleh Vite (favicon, ikon). |

### 5.2 Entry & Halaman HTML di `src/`

| File | Peran |
|---|---|
| `src/index.html` | Halaman landing — entry utama aplikasi sesuai konfigurasi Vite (`main`). |
| `src/main.js` | Entry JavaScript minimal agar Vite tidak error di dev mode (hanya `console.log`). |
| `src/login.html` | Halaman login (Vite entry: `login`). |
| `src/signup.html` | Halaman registrasi (Vite entry: `signup`). |
| `src/dashboard.html` | Dashboard — Vite entry `dashboard`; route per-role dilakukan di sini. |
| `src/profile.html` | Halaman profil (Vite entry: `profile`). |
| `src/chat.html` | Halaman chat realtime (Vite entry: `chat`). |
| `src/home.html`, `customer-dashboard.html`, `freelancer-dashboard.html`, `freelancer-income.html` | Halaman turunan untuk variasi tampilan per-role. |

### 5.3 Modul JavaScript di `src/js/`

| File | Tanggung Jawab |
|---|---|
| `supabase.js` | Inisialisasi & ekspor client Supabase. |
| `auth.js` | Login, signup, logout, restore session. |
| `service.js` | CRUD data layanan freelancer. |
| `booking.js` | Pembuatan order, render daftar order, update status. |
| `profile.js` | Ambil & ubah data profil. |
| `chat.js` | Logika chat (kirim pesan, render bubble, attachment). |
| `realtime.js` | Abstraksi subscription realtime Supabase. |
| `notifications.js` | Sistem notifikasi in-app. |
| `toast.js` | Utilitas komponen toast (feedback singkat). |
| `animation.js` | Efek animasi UI (fade-in, slide-down). |
| `navigation.js` | Logika navigasi/sidebar. |
| `dashboardCustomer.js` | Orkestrasi UI dashboard untuk role customer. |
| `dashboardFreelancer.js` | Orkestrasi UI dashboard untuk role freelancer. |
| `income.js` | Perhitungan & tampilan data income freelancer. |
| `orderUtils.js` | Utilitas bersama untuk order. |

### 5.4 Stylesheet di `src/css/`

| File | Cakupan |
|---|---|
| `style.css` | Style global. |
| `dashboard.css` | Style khusus dashboard. |
| `navigation.css` | Style navigasi/sidebar. |
| `profile.css` | Style halaman profil. |
| `chat.css` | Style halaman chat. |

### 5.5 Aset di `src/assets/`

`favicon.svg`, `icons.svg`, `logo.svg`, `vite.svg` — aset visual yang diimpor oleh modul HTML/JS.

---

## 6. Entry Point Frontend

NimTask memiliki **dua lapis entry point** yang perlu dipahami:

### 6.1 Entry pada level root (saat dijalankan)

- File: `index.html` (root proyek).
- Berisi satu `<iframe>` yang memuat `src/index.html` dengan style `100vw × 100vh` dan tanpa border.
- Title: `freelance`.
- Favicon: `/favicon.svg` (dari folder `public/`).

```html
<iframe src="/src/index.html" style="width:100vw; height:100vh; border:none;"></iframe>
```

### 6.2 Entry pada level Vite (saat build)

- File: `src/index.html` dideklarasikan sebagai entry `main` di `vite.config.js`.
- Mengacu pada modul-modul di `src/js/*.js` dan stylesheet di `src/css/*.css`.

> Implikasi: Untuk pengembangan lokal (`npm run dev`), Vite melayani semua entry yang dideklarasikan di `vite.config.js`. Untuk preview/production, setiap entry HTML akan di-bundle menjadi file output terpisah.

### 6.3 Skrip npm

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan dev server Vite (port `5173`) dengan HMR. |
| `npm run build` | Mem-bundle semua entry HTML/JS ke direktori `dist/`. |
| `npm run preview` | Menjalankan server statis untuk hasil build. |

---

## 7. Konfigurasi Build (Vite)

File `vite.config.js`:

```js
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: 'src/index.html',
        login: 'src/login.html',
        signup: 'src/signup.html',
        dashboard: 'src/dashboard.html',
        profile: 'src/profile.html',
        chat: 'src/chat.html'
      }
    }
  },
  server: {
    port: 5173
  }
})
```

### 7.1 Opsi `base`

- `base: './'` → Aset dirujuk dengan path relatif.
- Cocok untuk deployment ke subdirectory atau static hosting tanpa konfigurasi path khusus.

### 7.2 Multi-entry (Rollup `input`)

Vite di sini dikonfigurasi untuk membundle **enam halaman HTML** sebagai entry terpisah:

| Kunci | File Sumber | Halaman |
|---|---|---|
| `main` | `src/index.html` | Landing / home |
| `login` | `src/login.html` | Login |
| `signup` | `src/signup.html` | Signup |
| `dashboard` | `src/dashboard.html` | Dashboard |
| `profile` | `src/profile.html` | Profil |
| `chat` | `src/chat.html` | Chat |

Setiap entry akan menjadi HTML bundle terpisah pada output `dist/`. Pendekatan ini mencerminkan arsitektur **Multi-Page Application (MPA)**.

### 7.3 Dev Server

- Port: `5173` (default Vite).
- HMR aktif otomatis untuk setiap file di `src/`.

### 7.4 Dependensi

`package.json`:

```json
"devDependencies": {
  "vite": "^8.0.10"
},
"dependencies": {
  "@supabase/supabase-js": "^2.105.2"
}
```

- **Vite** adalah satu-satunya `devDependency`.
- **`@supabase/supabase-js`** adalah satu-satunya `runtime dependency` (meskipun hanya dipakai di sisi frontend, ditempatkan di `dependencies`).

---

## 8. Catatan Tambahan tentang Arsitektur

- **Tidak ada framework UI** — render & state dilakukan secara manual di modul-modul JS.
- **Tidak ada router frontend** — navigasi adalah perpindahan halaman penuh via `<a href>`.
- **ES Modules** — modul `src/js/*.js` saling ber-interaksi lewat `import`/`export`.
- **State sederhana** — `localStorage` (`authUser`) digunakan untuk menyimpan sesi user.
- **Akses fungsi via `window`** — beberapa fungsi diekspos ke `window` agar dapat dipanggil dari handler inline HTML.
- **File HTML tambahan di `src/`** (`home.html`, `customer-dashboard.html`, `freelancer-dashboard.html`, `freelancer-income.html`) tidak dideklarasikan sebagai entry Vite; kemungkinan diakses langsung atau sebagai halaman turunan.

---

## 9. Ringkasan Singkat

- **Tipe:** Multi-Page Application berbasis Vite + Vanilla JS.
- **Build tool:** Vite `^8.0.10` (multi-entry, base relatif, port `5173`).
- **Dependensi runtime:** `@supabase/supabase-js` `^2.105.2`.
- **Entry root:** `index.html` (iframe → `src/index.html`).
- **Entry build Vite:** `src/index.html` (`main`) + 5 entry lain (`login`, `signup`, `dashboard`, `profile`, `chat`).
- **Struktur utama:** `src/{js,css,assets}` + beberapa file `.html` di `src/`.
- **Pendekatan styling:** CSS per-halaman, tanpa preprocessor.

Dokumen ini hanya mencakup fondasi proyek. Pembahasan detail tentang lapisan data, skema database, dan integrasi Supabase akan dibahas pada dokumen terpisah.
