# PROJECT_DOCUMENTATION.md

Dokumentasi teknis untuk pengembangan berkelanjutan proyek **NimTask** (nama package: `freelance`). Dokumen ini ditulis agar **AI developer lain** dapat memahami arsitektur, alur kerja, skema data, dan cara menjalankan project **tanpa membaca seluruh source code**.

> Catatan: Dokumentasi ini **tidak mengubah source code**. Seluruh isi disusun dari hasil analisis file di repo dan dokumen yang sudah ada di `docs/`.

---

## 1. Project Overview

- **Nama project**: NimTask
- **Nama package (package.json)**: `freelance`
- **Tujuan aplikasi**: aplikasi marketplace yang mempertemukan **Customer** dengan **Freelancer** untuk pemesanan jasa berbasis layanan (services).
- **Fitur utama**:
  - Autentikasi (login/signup) dengan role `customer` dan `freelancer`
  - Discover services (search, filter kategori, price range)
  - Manajemen services (CRUD) untuk freelancer
  - Pemesanan / order management dan status flow
  - Dashboard berbeda per role (customer vs freelancer)
  - Chat realtime (direct chat dan chat scoped per order) + lampiran file
  - Notifikasi in-app (order/message/review)
  - Activity log (riwayat aksi penting)
  - Income page untuk freelancer (agregasi pendapatan)
- **Target pengguna**:
  - **Customer**: pengguna yang membutuhkan jasa
  - **Freelancer**: pengguna yang menawarkan jasa dan mengelola order

---

## 2. Tech Stack

| Layer | Teknologi | Keterangan |
|---|---|---|
| Build tool / Dev server | **Vite** `^8.0.10` | Membangun Multi-Page Application via multi-entry HTML |
| Bahasa | **JavaScript (ES Modules)** | Vanilla JS, tanpa framework UI |
| Frontend | **HTML5 + CSS3** | File HTML per halaman, CSS dipisah per modul |
| Backend-as-a-Service | **Supabase** | Database PostgreSQL + Auth + Storage + Realtime + RLS |
| Client DB/Realtime | `@supabase/supabase-js` `^2.105.2` | Dipakai di frontend untuk query, auth, storage, realtime |

---

## 3. Struktur Folder

```
.
├── docs/
│   ├── application-flow.md         # Flow fitur & business process
│   ├── database-documentation.md   # Detail skema, trigger, RLS, realtime, storage
│   ├── deployment-guide.md          # Instruksi env, build, deploy
│   ├── code-reference.md           # Referensi modul JS + dependency graph
│   ├── html-reference.md           # Referensi halaman HTML + hooks
│   ├── styling-guide.md           # (panduan styling; jika ada)
│   └── activity-log.md            # Penjelasan fitur activity log
│
├── public/
│   ├── favicon.svg
│   └── icons.svg
│
├── src/
│   ├── assets/
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   ├── logo.svg
│   │   └── vite.svg
│   ├── css/
│   │   ├── style.css
│   │   ├── dashboard.css
│   │   ├── navigation.css
│   │   ├── profile.css
│   │   └── chat.css
│   ├── js/
│   │   ├── supabase.js             # Client Supabase + helper (legacy)
│   │   ├── auth.js                 # Login/signup/logout + state session
│   │   ├── navigation.js           # Render navbar/sidebar, role routing
│   │   ├── service.js              # CRUD services + categories + favorited services
│   │   ├── booking.js              # Legacy bookings (polling)
│   │   ├── profile.js              # Profile fetch/update + rating RPC
│   │   ├── chat.js                 # Chat realtime + message/file upload
│   │   ├── realtime.js             # Helper subscription realtime yang dipakai
│   │   ├── notifications.js       # Notifikasi (list, mark read, realtime)
│   │   ├── orderUtils.js          # Utilitas status, currency, detail order
│   │   ├── dashboardCustomer.js  # Orchestrator customer dashboard
│   │   ├── dashboardFreelancer.js # Orchestrator freelancer dashboard
│   │   ├── income.js               # Income stats
│   │   ├── activity.js            # Activity log feature
│   │   ├── toast.js                # Toast UI helper
│   │   └── animation.js           # Animasi transisi (untuk UI)
│   ├── *.html (halaman per fitur)
│   └── index.html (landing page)
│
├── index.html                 # Root shell (iframe ke src/index.html)
├── vite.config.js            # Multi-entry build input
├── package.json
├── supabase-schema.sql     # Migration tambahan (progress, portfolio, notifications, favorites, activity_logs, triggers)
└── PROJECT_DOCUMENTATION.md
```

Kegunaan file penting di root:
- **`index.html`**: shell yang memuat `<iframe src="/src/index.html">`.
- **`vite.config.js`**: deklarasi multi-entry HTML agar build menghasilkan halaman terpisah (`src/index.html`, `src/login.html`, `src/signup.html`, `src/dashboard.html`, `src/profile.html`, `src/chat.html`).
- **`supabase-schema.sql`**: migration yang menambah tabel fitur (progress, portfolio, notifications, favorites, activity_logs) + trigger notifikasi dan RLS policy.

---

## 4. Arsitektur Aplikasi

### 4.1 Alur kerja frontend (high-level)

1. **Vite** melayani beberapa entry HTML.
2. Tiap halaman menginisialisasi UI melalui modul:
   - `Navigation` (navbar/sidebar + role-aware routing)
   - `Auth` (memulihkan session & user profile)
   - Dashboard modules (`dashboardCustomer.js` / `dashboardFreelancer.js`) atau modul fitur (`chat.js`, `income.js`, `profile.js`).
3. Semua data yang ditampilkan diambil lewat **Supabase client** (query + embed relasi).
4. Untuk update real-time, modul menggunakan subscription realtime (terutama `messages`, `orders`, `project_progress`, `notifications`).

Diagram ringkas:

```
[HTML Page]
   |
   v
[Navigation + Auth]
   |
   v
[Feature Orchestrator]
  (dashboardCustomer / dashboardFreelancer / chat / income / profile)
   |
   v
[Supabase Queries]
   |
   +--> [Realtime subscriptions]
   |
   +--> [Storage upload (chat attachments)]
```

### 4.2 Alur request ke backend (Supabase)

Frontend tidak punya backend server sendiri. Semua request adalah:
- **Auth**: `supabase.auth.signInWithPassword`, `supabase.auth.signUp`, `supabase.auth.getSession`, dll.
- **Database**: `supabase.from('table').select/insert/update/delete`.
- **Realtime**: `supabase.channel(...).on('postgres_changes', ...)` (dibungkus helper `realtime.js` untuk dashboard).
- **Storage**: `supabase.storage.from('chat-attachments').upload()` dan `getPublicUrl()`.

### 4.3 Flow database (konsep)

- Identity user berasal dari `auth.users`.
- Detail role dan profile disimpan di tabel **`profiles`**.
- Marketplace data: `categories`, `services`, `orders`, `reviews`.
- Komunikasi: `messages` (opsional `order_id`), dengan trigger notifikasi.
- Ekstensi fitur via migration:
  - `project_progress`
  - `portfolio`
  - `notifications`
  - `favorites`
  - `activity_logs`

### 4.4 Authentication

- `Auth.init()` melakukan:
  - restore cache `localStorage.authUser`
  - cek `supabase.auth.getSession()`
  - pasang listener `supabase.auth.onAuthStateChange`
- Saat `signup`:
  - membuat user di `auth.users`
  - membuat row di `profiles` (id=user.id, name, role)
  - cache ke `localStorage`.

### 4.5 Session/JWT

- Supabase mengelola session/token.
- Frontend memakai `supabase.auth.getSession()` dan query dengan RLS.
- JWT tidak disimpan manual; namun profil user disimpan di `localStorage`.

### 4.6 Upload file (chat)

- Bucket: `chat-attachments`.
- Validasi di frontend:
  - max 10MB
  - MIME: `image/*`, `application/pdf`, `application/msword`, docx
- Path: `chat-attachments/<timestamp>-<userId>-<uuid>.<ext>`
- File di-upload via `upload({ upsert: true })`, lalu `getPublicUrl()` disimpan ke `messages.file_url`.

---

## 5. Database Schema

Dokumen ini merangkum tabel publik yang dipakai aplikasi (foundation + migration). Detail kolom & relasi lengkap ada di `docs/database-documentation.md`.

### 5.1 Tabel: `profiles`
- **Fungsi**: identity & role user + agregat rating.
- **Primary key**: `id`.
- **Relasi**: FK ke `auth.users(id)` (diasumsikan dari skema awal).
- **Relasi** (kunci asing/usage dari aplikasi):
  - `services.freelancer_id → profiles.id`
  - `orders.customer_id / freelancer_id → profiles.id`
  - `reviews.reviewer_id / reviewed_id → profiles.id`
  - `messages.sender_id / receiver_id → profiles.id`
  - `portfolio.freelancer_id → profiles.id`
  - `notifications.user_id → profiles.id`

### 5.2 Tabel: `categories`
- **Fungsi**: master kategori layanan.
- **Primary key**: `id`.
- **Relasi**: `services.category_id → categories.id`.

### 5.3 Tabel: `services`
- **Fungsi**: layanan yang ditawarkan freelancer.
- **Primary key**: `id`.
- **Relasi**:
  - `services.freelancer_id → profiles.id`
  - `services.category_id → categories.id`

### 5.4 Tabel: `orders`
- **Fungsi**: transaksi/pemesanan.
- **Primary key**: `id`.
- **Relasi**:
  - `orders.customer_id → profiles.id`
  - `orders.freelancer_id → profiles.id`
  - `orders.service_id → services.id`
- **Status**: `pending`, `accepted`, `in_progress`, `revision`, `completed`, `cancelled`.

### 5.5 Tabel: `reviews`
- **Fungsi**: ulasan customer ke freelancer (berdasarkan order completed).
- **Primary key**: `id`.
- **Relasi**:
  - `reviews.order_id → orders.id`
  - `reviews.reviewer_id / reviewed_id → profiles.id`

### 5.6 Tabel: `messages`
- **Fungsi**: chat realtime.
- **Primary key**: `id`.
- **Relasi**:
  - `messages.sender_id / receiver_id → profiles.id`
  - `messages.order_id → orders.id` (nullable untuk direct chat)
- **Lampiran**: disimpan via `file_url` (Storage URL), bukan di `content`.

### 5.7 Tabel (migration): `project_progress`
- **Fungsi**: milestone/checklist per order.
- **Primary key**: `id`.
- **Relasi**:
  - `project_progress.order_id → orders.id ON DELETE CASCADE`

### 5.8 Tabel (migration): `portfolio`
- **Fungsi**: showcase karya freelancer.
- **Primary key**: `id`.
- **Relasi**:
  - `portfolio.freelancer_id → profiles.id ON DELETE CASCADE`

### 5.9 Tabel (migration): `notifications`
- **Fungsi**: notifikasi in-app.
- **Primary key**: `id`.
- **Relasi**:
  - `notifications.user_id → profiles.id ON DELETE CASCADE`

### 5.10 Tabel (migration tambahan): `favorites`
- **Fungsi**: daftar favorite layanan oleh user.
- **Primary key**: `id`.
- **Relasi**:
  - `favorites.user_id → profiles.id`
  - `favorites.service_id → services.id`
- **Unique constraint**: `(user_id, service_id)`.

### 5.11 Tabel (migration tambahan): `activity_logs`
- **Fungsi**: Activity Log user.
- **Primary key**: `id`.
- **Relasi**:
  - `activity_logs.user_id → profiles.id`

> Rangkuman skema lain (index, constraint, policy detail) ada di `supabase-schema.sql` dan `docs/database-documentation.md`.

---

## 6. API Documentation (Endpoint)

Karena ini adalah **frontend-only** app (no backend API server custom), "API endpoints" yang tersedia adalah:

1) **Supabase Auth endpoints** (dari SDK),
2) **Query database** via Supabase JS,
3) **Realtime channels** (bukan endpoint HTTP).

Dokumen di bawah menjelaskan "kontrak" level aplikasi (tabel/operasi) yang sebenarnya dipakai.

### 6.1 Operasi Database Utama

#### Auth
- **Login**: `supabase.auth.signInWithPassword({ email, password })`
- **Signup**: `supabase.auth.signUp({ email, password })` lalu INSERT `profiles`.
- **Logout**: `supabase.auth.signOut()`

#### Services
- **List services**: SELECT `services` + embed `categories` + embed `profiles`, filter `is_active=true`.
- **Create service**: INSERT `services`.
- **Update service**: UPDATE `services`.
- **Delete service**: DELETE `services`.
- **Get categories**: SELECT `categories` ordered.

#### Orders
- **Create order** (booking): INSERT `orders` status `pending`.
- **List orders**:
  - Customer: SELECT orders where `customer_id=me` (embed services, profiles)
  - Freelancer: SELECT orders where `freelancer_id=me` (embed services, profiles)
- **Update status**: UPDATE `orders.status`.

#### Reviews
- **Cek review existing**: SELECT `reviews` maybeSingle.
- **Submit review**: INSERT `reviews`.

#### Chat
- **List messages**:
  - direct chat: filter sender/receiver + `order_id is null`
  - order chat: filter `messages.order_id = <id>`
- **Send message**: INSERT `messages`.
- **Upload file**: Storage upload, then store URL in `messages.file_url`.

#### Project Progress
- **List progress**: SELECT `project_progress` where `order_id=...`.
- **Add progress**: INSERT `project_progress`.
- **Mark done**: UPDATE `project_progress.completed`.

#### Portfolio
- **List**: SELECT `portfolio` where `freelancer_id=me`.
- **CRUD**: INSERT/UPDATE/DELETE.

#### Notifications
- **List**: SELECT `notifications` where `user_id=me` ORDER BY created_at DESC LIMIT 50.
- **Mark read**: UPDATE `notifications.is_read`.

### 6.2 Realtime Channels ("endpoint" realtime)

| Channel | Tabel | Filter | Penggunaaan |
|---|---|---|---|
| `messages` | `messages` | none | refresh chat (chat.js) |
| `freelancer_orders_<uid>` | `orders` | `freelancer_id=eq.<uid>` | refresh order list (freelancer dashboard) |
| `project_progress_customer_<uid>` | `project_progress` | none | refresh progress (customer dashboard) |
| `freelancer_progress_<uid>` | `project_progress` | none | refresh progress (freelancer dashboard) |
| `notifications_<uid>` | `notifications` | `user_id=eq.<uid>` | refresh notifications (customer; placeholder freelancer) |

Detail event: subscription menggunakan event `'*'` (INSERT/UPDATE/DELETE).

---

## 7. Environment Variables

Berdasarkan `docs/deployment-guide.md` dan `src/js/supabase.js`, variabel yang digunakan:

| Nama | Wajib | Penjelasan |
|---|---|---|
| `VITE_SUPABASE_URL` | Ya | URL project Supabase |
| `VITE_SUPABASE_ANON_KEY` | Ya | anon public key Supabase |

Contoh `.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

> Hanya variabel dengan prefix `VITE_` yang dibaca oleh Vite.

---

## 8. Konfigurasi dan Cara Menjalankan

### 8.1 Install dependency

```bash
npm install
```

### 8.2 Setup database (Supabase)

1. Terapkan `supabase-schema.sql` di Supabase SQL Editor.
2. Buat RPC (jika belum ada): `get_user_rating`.
3. Pastikan realtime publication menambahkan tabel yang dibutuhkan (messages/orders/project_progress/notifications) sesuai kebutuhan.
4. Buat Storage bucket `chat-attachments`.

Dokumen detail ada di `docs/deployment-guide.md`.

### 8.3 Konfigurasi `.env`

Buat file `.env` di root (lihat bagian 7).

### 8.4 Menjalankan development mode

```bash
npm run dev
```

- Dev server: `http://localhost:5173/`.
- Multi-entry HTML tersedia via URL masing-masing entry.

### 8.5 Build / deploy

Build:

```bash
npm run build
```

Preview build:

```bash
npm run preview
```

Deploy (contoh static host): upload folder `dist/`.

---

## 9. Business Logic

Ringkasan aturan penting yang memengaruhi perilaku sistem:

### 9.1 Role-based behavior
- Role disimpan di `profiles.role`.
- UI menu dan halaman bertipe:
  - `customer`: dashboard, find service, my orders, reviews, notifications
  - `freelancer`: dashboard service management, order management, progress, portfolio, earnings

### 9.2 Order status flow
- Order dibuat dengan `status='pending'`.
- Flow umum:
  - `pending → accepted → in_progress → revision* → completed`
  - `cancelled` dapat terjadi di beberapa tahap.

Trigger database mengirim notifikasi saat status berubah.

### 9.3 Review hanya setelah selesai
- Form review hanya muncul jika `order.status === 'completed'`.

### 9.4 Project progress
- `project_progress` dapat diubah oleh freelancer yang terkait order.
- Customer hanya membaca progress.

### 9.5 Income
- Income freelancer dihitung dari `orders.total_price` untuk status `completed`.
- Agregasi per month dan per year dilakukan oleh query terpisah (lihat modul `income.js`).

### 9.6 Chat
- Direct chat: `messages.order_id IS NULL`.
- Order chat: `messages.order_id = <orderId>`.
- Lampiran chat via `file_url` dari Storage.

### 9.7 Activity log
- Activity ditulis lewat modul `src/js/activity.js` dan tampil via dashboard.
- Hanya action tertentu yang dicatat (create/update service, create order, accept/complete order, create review, delete service/portfolio, update portfolio).

---

## 10. Known Issues

Daftar issue yang sudah tercatat di repo (terutama dari `docs/code-reference.md` dan `docs/database-documentation.md`).

1. **Realtime payload terlalu luas (chat.js)**
   - Subscription `messages` tanpa filter → semua perubahan diterima.

2. **booking.js polling (legacy)**
   - `setInterval(5000)` tanpa clear (potensi memory leak) dan modul legacy tidak dipakai di dashboard modern.

3. **RPC `get_user_rating` harus dibuat manual**
   - Jika RPC belum ada di Supabase, rating di profile page gagal.

4. **Portfolio publik tidak ada UI**
   - Tabel `portfolio` mengizinkan SELECT publik, tapi halaman publik tidak tersedia.

5. **Notif freelancer belum punya panel UI**
   - Freelancer dashboard subscribe realtime notifications tapi tidak menampilkan UI.

6. **XSS risk pada rendering pesan chat**
   - `chat.js` menyisipkan `msg.content` langsung ke HTML template.

7. **Inkonsistensi attachment convention**
   - Ada legacy logic `msg.content.startsWith('storage:')`, tapi file sebenarnya disimpan di `file_url`.

8. **localStorage menyimpan profile lengkap**
   - `authUser` berisi gabungan auth + profile (risiko bila terjadi XSS).

---

## 11. Future Development

Saran pengembangan berbasis analisis masalah/performa:

- Optimasi realtime (filter subscription chat messages)
- Gabungkan query statistik (income/loadStats) menggunakan satu query agregasi atau RPC
- Tambah pagination untuk daftar besar (orders/services)
- Standardisasi error handling dan pattern event binding (hindari inline `onclick`)
- Tambah policy/visibility yang lebih ketat untuk Storage dan messages
- Tambahkan UI panel notifications untuk freelancer
- Rapikan chat logic (konsolidasi direct chat code di HTML vs modul JS)

---

## 12. AI Context

### 12.1 Ringkasan cara kerja project (1-2 paragraf)

NimTask adalah aplikasi web **vanilla JavaScript** berbasis **Vite** dengan arsitektur **multi-page (MPA)**. Seluruh data dan fitur back-end diakses melalui **Supabase** dari frontend: auth (session via Supabase), database (query via `supabase-js`), storage (upload file chat), serta realtime (subscription perubahan tabel). Role user (`customer`/`freelancer`) mengontrol UI, menu, dan dashboard yang ditampilkan, dengan autentikasi dimediasi modul `Auth` dan navigasi dibangun oleh `Navigation`.

Pengembangan fitur harus mempertimbangkan **RLS** (tabel tertentu memiliki policy eksplisit di `supabase-schema.sql`) dan trigger notifikasi yang otomatis membuat record `notifications` saat terjadi event pada `orders`, `messages`, dan `reviews`.

### 12.2 File-file paling penting
- `vite.config.js` — multi-entry build
- `src/js/supabase.js` — singleton Supabase client
- `src/js/auth.js` — session & role user
- `src/js/navigation.js` — render navbar/sidebar + role routing
- `src/js/dashboardCustomer.js` — customer dashboard orchestrator
- `src/js/dashboardFreelancer.js` — freelancer dashboard orchestrator
- `src/js/service.js` — CRUD service + discovery
- `src/js/chat.js` — chat realtime + upload file
- `src/js/notifications.js` — notifikasi in-app
- `src/js/income.js` — income stats
- `supabase-schema.sql` — migration progress/portfolio/notifications + triggers + RLS

### 12.3 Entry point frontend & backend
- **Frontend entry points (Vite multi-entry)**:
  - `src/index.html` (main)
  - `src/login.html`
  - `src/signup.html`
  - `src/dashboard.html`
  - `src/profile.html`
  - `src/chat.html`
- **Backend**: tidak ada server custom. Backend adalah Supabase.

### 12.4 Dependency antar modul (ringkas)
- Hampir semua page menggunakan:
  - `Navigation` → `Auth.init()` → memuat role/user.
- Dashboard orchestrators:
  - `dashboardCustomer.js` menggunakan `notifications.js`, `realtime.js`, `orderUtils.js`, `chat.js`, `project_progress` realtime.
  - `dashboardFreelancer.js` menggunakan `service.js` logic (via UI handlers), `notifications.js`, `realtime.js`, `orderUtils.js`, `chat.js`.
- `chat.js` hanya bergantung pada `supabase.js`.

### 12.5 Hal yang tidak boleh diubah (risk high)
- **Jangan mengubah schema/constraint** tanpa koordinasi dengan RLS dan trigger:
  - tabel `project_progress`, `portfolio`, `notifications` (RLS policies ada di `supabase-schema.sql`)
  - trigger notifikasi (fungsi `push_notification` dan trigger `trg_notify_*`)
- **Jangan mengubah convention tabel/status** tanpa update semua tempat yang memakai string status:
  - `orders.status` values (pending/accepted/in_progress/revision/completed/cancelled)
- **Jangan mengubah entry point Vite** tanpa memahami multi-entry output HTML.
- **Jangan mengubah cara upload chat** tanpa memastikan bucket `chat-attachments` dan field `messages.file_url` tetap konsisten.

---

## Referensi Dokumen yang Sudah Ada
- `docs/project-overview.md`
- `docs/application-flow.md`
- `docs/database-documentation.md`
- `docs/code-reference.md`
- `docs/html-reference.md`
- `docs/deployment-guide.md`
- `docs/activity-log.md`

Dokumen-dokumen tersebut saling melengkapi dan mencakup detail yang lebih granular dari bagian-bagian di atas.

