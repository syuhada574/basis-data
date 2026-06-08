# NimTask — Deployment Guide

Panduan deployment untuk aplikasi NimTask. Mencakup environment setup, build process, dan konfigurasi production.

> **Cakupan:** Workflow development → production menggunakan Vite sebagai build tool.

---

## Daftar Isi

1. [Prerequisites](#1-prerequisites)
2. [Environment Variables](#2-environment-variables)
3. [Scripts](#3-scripts)
4. [Local Development](#4-local-development)
5. [Build Production](#5-build-production)
6. [Preview Build](#6-preview-build)
7. [Vite Configuration](#7-vite-configuration)
8. [Deployment ke Static Host](#8-deployment-ke-static-host)
9. [Troubleshooting](#9-troubleshooting)
10. [CI/CD Suggestions](#10-cicd-suggestions)

---

## 1. Prerequisites

| Tool | Versi Minimum | Keterangan |
|---|---|---|
| Node.js | 18.x atau lebih baru | Runtime untuk Vite & npm |
| npm | 9.x atau lebih baru | Package manager |
| Browser modern | Chrome 100+, Firefox 100+, Safari 15+ | Untuk ES Module + dynamic import |

**Cek versi:**

```bash
node --version
npm --version
```

---

## 2. Environment Variables

File: `.env` (di root project, **tidak** di-commit ke git).

### 2.1 Variabel yang Diperlukan

| Variable | Contoh | Wajib? | Keterangan |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `https://xyzabc.supabase.co` | Ya | URL project Supabase |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...long-jwt` | Ya | Anon public key dari Supabase |

### 2.2 Template `.env`

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

### 2.3 Cara Mendapatkan Nilai

1. Buka [Supabase Dashboard](https://app.supabase.com/)
2. Pilih project NimTask
3. **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Project API keys** → `anon public** → `VITE_SUPABASE_ANON_KEY`

### 2.4 Konvensi Penamaan

Vite hanya memuat env variables yang dimulai dengan prefix `VITE_`. Variabel lain diabaikan.

```js
// supabase.js
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### 2.5 Environment Multi-stage

Untuk development vs production, gunakan file `.env.development` dan `.env.production`:

```env
# .env.development
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=dev-anon-key

# .env.production
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod-anon-key
```

> **Catatan:** NimTask saat ini hanya menggunakan `.env` (satu stage). Multi-stage dapat ditambahkan jika diperlukan.

### 2.6 `.gitignore`

Pastikan `.env` ada di `.gitignore`:

```gitignore
.env
.env.local
.env.development
.env.production
```

---

## 3. Scripts

Definisi di `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

| Script | Perintah | Fungsi |
|---|---|---|
| `dev` | `npm run dev` | Jalankan dev server dengan HMR |
| `build` | `npm run build` | Build production ke folder `dist/` |
| `preview` | `npm run preview` | Jalankan static server untuk hasil build |

---

## 4. Local Development

### 4.1 Setup Pertama Kali

```bash
# 1. Clone repository
git clone <repo-url>
cd "ba project 1.2"

# 2. Install dependencies
npm install

# 3. Setup .env
cp .env.example .env
# Edit .env dengan Supabase URL & key

# 4. (Opsional) Apply database schema
# Lihat section Database Setup di bawah
```

### 4.2 Menjalankan Dev Server

```bash
npm run dev
```

**Output:**
```
  VITE v8.0.10  ready in 423 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.x:5173/
  ➜  press h + enter to show help
```

Dev server berjalan di **port 5173** (default Vite, sesuai `vite.config.js`).

### 4.3 Fitur Dev Mode

- **HMR** (Hot Module Replacement) — edit file → browser auto-reload
- **Source map** untuk debugging
- **Fast refresh** untuk perubahan cepat
- **Console.log** dari JS modules muncul di browser console

### 4.4 Testing Login Lokal

1. Buka `http://localhost:5173/`
2. Klik "Sign Up"
3. Buat akun baru (pilih role: customer atau freelancer)
4. Setelah signup, akan redirect ke dashboard sesuai role
5. Coba fitur sesuai role

### 4.5 Database Setup (Wajib untuk Full Functionality)

Pastikan schema database sudah di-apply di Supabase:

1. Buka **Supabase Dashboard** → **SQL Editor**
2. Buat query baru
3. Copy seluruh isi `supabase-schema.sql`
4. Run query
5. Verifikasi 9 tabel dibuat: `profiles`, `categories`, `services`, `orders`, `reviews`, `messages`, `project_progress`, `portfolio`, `notifications`

6. (Opsional) Buat RPC `get_user_rating`:

```sql
CREATE OR REPLACE FUNCTION get_user_rating(user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  avg_rating NUMERIC;
BEGIN
  SELECT AVG(rating)::NUMERIC(3,2) INTO avg_rating
  FROM reviews 
  WHERE reviewed_id = user_id;
  
  RETURN COALESCE(avg_rating, 0);
END;
$$ LANGUAGE plpgsql;
```

7. (Opsional) Enable realtime publication untuk tabel baru:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE project_progress, notifications;
```

8. (Wajib) Buat storage bucket `chat-attachments`:

Di Supabase Dashboard → **Storage** → **Create new bucket**:
- Name: `chat-attachments`
- Public bucket: `true` (atau set policy manual)

---

## 5. Build Production

### 5.1 Perintah

```bash
npm run build
```

### 5.2 Output

```
vite v8.0.10 building for production...
✓ 78 modules transformed.
dist/index.html                  0.42 kB │ gzip:  0.27 kB
dist/src/index.html              1.23 kB │ gzip:  0.71 kB
dist/src/login.html               0.87 kB │ gzip:  0.49 kB
dist/src/signup.html              1.05 kB │ gzip:  0.61 kB
dist/src/dashboard.html           0.39 kB │ gzip:  0.22 kB
dist/src/profile.html             0.65 kB │ gzip:  0.39 kB
dist/src/chat.html                0.92 kB │ gzip:  0.52 kB
dist/assets/index-abc123.css     12.45 kB │ gzip:  3.78 kB
dist/assets/index-def456.js      45.67 kB │ gzip: 14.23 kB
dist/assets/index-ghi789.js      23.45 kB │ gzip:  8.91 kB
dist/assets/favicon-xyz.svg       1.20 kB
dist/assets/icons-uvw.svg         2.34 kB
✓ built in 4.32s
```

### 5.3 Struktur Output `dist/`

```
dist/
├── index.html                      # Entry (iframe shell)
├── favicon.svg
├── icons.svg
├── assets/
│   ├── index-[hash].js             # Bundled JS
│   ├── index-[hash].css            # Bundled CSS
│   ├── index-[hash].js.map         # Source map
│   ├── favicon-[hash].svg
│   └── icons-[hash].svg
└── src/
    ├── index.html                  # Landing page
    ├── login.html
    ├── signup.html
    ├── dashboard.html
    ├── customer-dashboard.html
    ├── freelancer-dashboard.html
    ├── freelancer-income.html
    ├── profile.html
    ├── chat.html
    ├── home.html
    ├── assets/
    │   ├── favicon.svg
    │   ├── icons.svg
    │   ├── logo.svg
    │   └── vite.svg
    ├── css/
    │   ├── style.css
    │   ├── navigation.css
    │   ├── dashboard.css
    │   ├── chat.css
    │   └── profile.css
    └── js/
        ├── supabase-[hash].js
        ├── auth-[hash].js
        ├── service-[hash].js
        ├── ... (modul lainnya)
```

### 5.4 Multi-Entry Build

Karena Vite di-configure dengan `rollupOptions.input` untuk 6 entry HTML, **setiap HTML** akan di-bundle menjadi file output terpisah.

| Entry | File Output |
|---|---|
| `main` | `dist/src/index.html` + assets |
| `login` | `dist/src/login.html` + assets |
| `signup` | `dist/src/signup.html` + assets |
| `dashboard` | `dist/src/dashboard.html` + assets |
| `profile` | `dist/src/profile.html` + assets |
| `chat` | `dist/src/chat.html` + assets |

### 5.5 Optimasi

Vite otomatis:
- **Minify** JS dengan esbuild
- **Minify** CSS dengan esbuild
- **Tree-shake** unused code
- **Code-split** per entry
- **Hash filename** untuk cache-busting

---

## 6. Preview Build

Setelah build, test hasil build secara lokal:

```bash
npm run preview
```

**Output:**
```
  ➜  Local:   http://localhost:4173/
  ➜  Network: http://192.168.1.x:4173/
```

> **Catatan:** Port preview (4173) berbeda dari dev (5173). Ini adalah static file server, tidak ada HMR.

---

## 7. Vite Configuration

File: `vite.config.js`

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

### 7.1 Opsi `base: './'`

- Aset dirujuk dengan path **relatif**.
- Cocok untuk deployment ke subdirectory atau static hosting tanpa konfigurasi path khusus.
- Mis. `dist/assets/index-abc.js` di-refer sebagai `./assets/index-abc.js`.

### 7.2 Multi-entry `rollupOptions.input`

6 entry HTML di-bundle menjadi 6 output HTML.

### 7.3 Dev Server Port

`port: 5173` (default Vite). Override dengan `npm run dev -- --port=3000`.

---

## 8. Deployment ke Static Host

### 8.1 Netlify

**Setup via Netlify CLI:**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

**Atau via `netlify.toml`:**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

> **Catatan:** Redirect penting untuk SPA-like behavior (URL fallback ke index.html).

### 8.2 Vercel

**Setup via Vercel CLI:**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Atau via `vercel.json`:**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 8.3 GitHub Pages

1. Push `dist/` ke branch `gh-pages` (atau gunakan action):

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 8.4 Cloudflare Pages

1. Push ke Git repository
2. Di Cloudflare dashboard:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variables:** set `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`

### 8.5 Apache / Nginx (Self-hosted)

1. Upload `dist/` ke server.
2. Konfigurasi SPA fallback:

**Nginx:**
```nginx
server {
  listen 80;
  server_name yourdomain.com;
  root /var/www/nimtask/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

**Apache (.htaccess):**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### 8.6 Supabase Storage (untuk chat-attachments)

Pastikan bucket `chat-attachments` ada di Supabase:

1. **Storage** → **Create bucket**
2. Name: `chat-attachments`
3. Public: `true` (jika ingin URL publik)
4. Upload limit: 10MB (sesuai validasi client)

---

## 9. Troubleshooting

### 9.1 `VITE_SUPABASE_URL is undefined`

**Penyebab:** `.env` tidak ada atau variabel typo.

**Solusi:**
1. Pastikan `.env` ada di root.
2. Variable harus dimulai dengan `VITE_`.
3. Restart dev server (`npm run dev`).

### 9.2 Realtime tidak bekerja

**Penyebab:** Tabel belum ditambahkan ke `supabase_realtime` publication.

**Solusi:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages, orders, project_progress, notifications;
```

### 9.3 Chat attachments gagal upload

**Penyebab:** Bucket `chat-attachments` belum dibuat.

**Solusi:**
1. Buat bucket di Supabase Storage.
2. Set policy yang mengizinkan upload dari authenticated user.

### 9.4 `get_user_rating` RPC not found

**Penyebab:** RPC belum dibuat.

**Solusi:** Apply SQL RPC di Supabase SQL Editor (lihat Section 4.5 step 6).

### 9.5 Build gagal: "Could not resolve"

**Penyebab:** Import path salah.

**Solusi:**
1. Pastikan path import dimulai dengan `./` atau `../`.
2. Cek case-sensitivity (Linux/Mac berbeda).
3. Restart Vite.

### 9.6 `pnpm` lockfile conflict

NimTask menggunakan `package-lock.json` (npm). Jika menggunakan pnpm, hapus `pnpm-lock.yaml` atau jalankan `npm install` untuk regenerate `package-lock.json`.

### 9.7 CORS error di production

**Penyebab:** Domain frontend belum ditambahkan ke Supabase Auth allowed URLs.

**Solusi:**
1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. Tambahkan domain production (mis. `https://nimtask.netlify.app`)
3. Save

### 9.8 `index.html` iframe tidak memuat `src/index.html`

**Penyebab:** Base path salah atau path file issue.

**Solusi:** Pastikan `vite.config.js` `base: './'` dan routing bekerja.

---

## 10. CI/CD Suggestions

### 10.1 GitHub Actions (Basic)

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
```

### 10.2 Auto-deploy via Netlify

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  VITE_SUPABASE_URL = "https://your-project.supabase.co"
  VITE_SUPABASE_ANON_KEY = "your-key"
```

Aktifkan **auto-deploy** di Netlify dashboard untuk branch `main`.

### 10.3 Environment Secrets

Untuk CI/CD, simpan env secrets di:
- **GitHub:** Settings → Secrets and variables → Actions
- **Netlify:** Site settings → Environment variables
- **Vercel:** Project Settings → Environment Variables
- **Cloudflare:** Pages → Settings → Environment variables

**Jangan pernah** commit file `.env` ke repository.

### 10.4 Deployment Pipeline (Generic)

```
┌──────────────┐
│ Git push     │
│ to main      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ CI:          │
│ - npm ci     │
│ - npm build  │
│ - (test?)    │
└──────┬───────┘
       │ success
       ▼
┌──────────────┐
│ Deploy:      │
│ - upload     │
│   dist/      │
│ - run        │
│   migrations│
│ - invalidate│
│   CDN cache │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Verify:      │
│ - smoke test │
│ - check     │
│   console   │
└──────────────┘
```

---

## 11. Production Checklist

Sebelum go-live, pastikan semua item berikut terpenuhi:

### 11.1 Database

- [ ] Schema `supabase-schema.sql` sudah di-apply
- [ ] RPC `get_user_rating` sudah dibuat
- [ ] Realtime publication sudah include `project_progress` & `notifications`
- [ ] Storage bucket `chat-attachments` sudah dibuat
- [ ] RLS policies aktif di semua tabel
- [ ] Initial categories sudah di-seed

### 11.2 Supabase Configuration

- [ ] Production Supabase project (terpisah dari dev)
- [ ] Email auth enabled
- [ ] Production domain di-allow di **Auth → URL Configuration**
- [ ] Anon key production sudah di-set di env

### 11.3 Frontend

- [ ] `.env` production sudah benar
- [ ] Build sukses tanpa error
- [ ] Bundle size reasonable (<500KB initial JS gzipped)
- [ ] No console errors di production
- [ ] Lighthouse score acceptable (Performance > 80)
- [ ] Mobile responsive test passed

### 11.4 Security

- [ ] HTTPS aktif
- [ ] CSP header configured (optional)
- [ ] CORS configured di Supabase
- [ ] RLS policies reviewed
- [ ] XSS tested (chat messages)
- [ ] Anon key di-bundle aman (by design, tapi waspada)

### 11.5 Monitoring

- [ ] Error tracking (Sentry, LogRocket, etc.) - opsional
- [ ] Analytics (Google Analytics, Plausible) - opsional
- [ ] Uptime monitoring - opsional

---

## 12. Performance Tips

### 12.1 Build Size Optimization

- Bundle saat ini ~45KB JS gzipped (entry utama). Masih baik.
- Gunakan dynamic `import()` untuk modul besar jika perlu code-splitting.
- Tree-shaking sudah otomatis oleh Vite.

### 12.2 Runtime Optimization

Sudah ada di `code-reference.md` bagian PERF. Highlights:

- Ganti `booking.js` polling dengan realtime.
- Tambah filter pada `chat.js` realtime.
- Pagination untuk orders & services.
- Caching categories.

### 12.3 Database Optimization

- Tambah index pada foreign keys.
- Vacuum database berkala.
- Monitor slow queries di Supabase.

---

## 13. Maintenance

### 13.1 Backup Database

Supabase otomatis backup harian di plan gratis. Untuk retention lebih lama, upgrade plan atau gunakan pg_dump manual:

```bash
# Backup
pg_dump -h db.your-project.supabase.co -U postgres -d postgres > backup.sql

# Restore
psql -h db.your-project.supabase.co -U postgres -d postgres < backup.sql
```

### 13.2 Update Dependencies

```bash
# Check outdated
npm outdated

# Update minor/patch
npm update

# Update major (test carefully)
npm install vite@latest @supabase/supabase-js@latest
```

### 13.3 Monitoring Logs

Di Supabase Dashboard:
- **Logs** → lihat query errors, auth events
- **Database** → performance metrics
- **API** → request logs

---

## Penutup

Dokumen ini melengkapi dokumentasi NimTask untuk layer deployment. Untuk layer lain, lihat:

- **`docs/project-overview.md`** — Fondasi teknis.
- **`docs/database-documentation.md`** — Skema & backend.
- **`docs/application-flow.md`** — Fitur & business process.
- **`docs/code-reference.md`** — Source code JS reference.
- **`docs/html-reference.md`** — File HTML reference.
- **`docs/styling-guide.md`** — CSS classes & design system.

**Total dokumentasi: 7 file saling melengkapi untuk codebase coverage 100%.**

Selamat deploy! 🚀
