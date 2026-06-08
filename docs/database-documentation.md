# NimTask — Database & Backend Documentation

Dokumentasi ini membahas lapisan database dan backend NimTask yang diimplementasikan di atas Supabase (PostgreSQL). Fokus dokumentasi adalah skema, relasi, foreign key, trigger, RPC, storage bucket, realtime subscription, RLS policies, dan pemetaan langsung ke kode JavaScript yang ditemukan di codebase.

Dokumen ini bukan membahas frontend/UI, melainkan hanya perilaku data.

---

## 1. Ringkasan Arsitektur Data

NimTask menggunakan **Supabase** sebagai Backend-as-a-Service (BaaS) dengan komponen berikut:

- **PostgreSQL database** — menyimpan data aplikasi.
- **Supabase Auth** — autentikasi user (tabel `auth.users`).
- **Supabase Storage** — penyimpanan file lampiran chat.
- **Supabase Realtime** — subscription perubahan data via websocket.
- **Row Level Security (RLS)** — kebijakan akses berbasis role.

Total tabel yang digunakan/dibuat di schema: **9 tabel publik**.

| # | Tabel | Sumber SQL | Status Pemakaian Frontend |
|---|---|---|---|
| 1 | `profiles` | Schema awal (sudah diasumsikan ada) | Aktif |
| 2 | `categories` | Schema awal | Aktif (dropdown & filter) |
| 3 | `services` | Schema awal | Aktif |
| 4 | `orders` | Schema awal | Aktif |
| 5 | `reviews` | Schema awal | Aktif |
| 6 | `messages` | Schema awal | Aktif |
| 7 | `project_progress` | `supabase-schema.sql` (migration) | Aktif |
| 8 | `portfolio` | `supabase-schema.sql` (migration) | Aktif |
| 9 | `notifications` | `supabase-schema.sql` (migration) | Aktif |

---

## 2. Detail Tabel

### 2.1 `profiles`

#### Tujuan Tabel
- Menyimpan data profil tambahan untuk setiap user yang terautentikasi di `auth.users`.
- Menjadi **identity table** untuk kedua role (`customer`, `freelancer`).
- Berisi rating agregat (denormalisasi) yang digunakan untuk mempercepat kalkulasi rating freelancer.

#### Struktur Data

| Kolom | Tipe | Default | Constraint |
|---|---|---|---|
| `id` | `uuid` | — | `PRIMARY KEY`, `FK -> auth.users(id)` |
| `role` | `text` | `'customer'` | `NOT NULL`, `CHECK (role IN ('customer', 'freelancer'))` |
| `name` | `text` | — | `NOT NULL` |
| `avatar_url` | `text` | — | — |
| `bio` | `text` | — | — |
| `skills` | `array` (seharusnya `text[]`) | — | — |
| `rating` | `numeric` | `0` | `CHECK (0 <= rating <= 5)` |
| `total_reviews` | `integer` | `0` | — |
| `location` | `text` | — | — |
| `created_at` | `timestamptz` | `now()` | — |
| `updated_at` | `timestamptz` | `now()` | — |

#### Relasi
- **Parent** dari: `services` (via `freelancer_id`), `orders` (via `customer_id` & `freelancer_id`), `reviews` (via `reviewer_id` & `reviewed_id`), `messages` (via `sender_id` & `receiver_id`), `portfolio` (via `freelancer_id`), `notifications` (via `user_id`).
- **Child** dari: `auth.users` (Supabase Auth).

#### Penggunaan di Codebase

| File | Operasi | Fungsi/Konteks |
|---|---|---|
| `src/js/supabase.js` | `SELECT` | `getUserProfile(userId)` |
| `src/js/auth.js` | `INSERT`, `SELECT` | `signup()` membuat record saat register; `loadUserProfile()` memuat profil setelah login |
| `src/js/profile.js` | `SELECT`, `UPDATE` | `Profile.getCurrent()`, `Profile.update()` |
| `src/js/service.js` | `SELECT` (embed) | join ke `services` di `getServices()`, `getService()` |
| `src/js/chat.js` | `SELECT` (embed) | join `sender` & `receiver` profile |
| `src/js/booking.js` | `SELECT` (embed) | join `profiles` di `loadBookings()` |
| `src/js/dashboardCustomer.js` | `SELECT` (embed) | join `freelancer` & `customer` di order list |
| `src/js/dashboardFreelancer.js` | `SELECT` (embed) | join `customer` di order list |
| `src/js/orderUtils.js` | `SELECT` (embed) | join `customer` & `freelancer` di `getOrderDetail()` |

**Business Rules:**
- Setiap user otomatis dibuat dengan `role = 'customer'` kecuali diisi `'freelancer'` saat signup.
- Profile dibuat via `supabase.from('profiles').insert()` tepat setelah `supabase.auth.signUp()` (`auth.js`).
- Rating dan `total_reviews` di tabel ini adalah **denormalisasi** yang tidak lagi di-sinkronkan otomatis oleh trigger di schema saat ini (dihitung client-side di `dashboardFreelancer.js`).

---

### 2.2 `categories`

#### Tujuan Tabel
- Master data kategori layanan (misalnya: Web Development, Graphic Design, Writing, Marketing, Consulting).
- Digunakan untuk mengklasifikasikan service yang ditawarkan freelancer dan untuk filter pada landing page.

#### Struktur Data

| Kolom | Tipe | Default | Constraint |
|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | `PRIMARY KEY` |
| `name` | `text` | — | `NOT NULL`, `UNIQUE` |
| `icon` | `text` | — | — |
| `created_at` | `timestamptz` | `now()` | — |

#### Relasi
- **Parent** dari: `services` (via `category_id`).
- Tidak memiliki foreign key keluar.

#### Penggunaan di Codebase

| File | Operasi | Fungsi/Konteks |
|---|---|---|
| `src/js/service.js` | `SELECT` | `getCategories()` untuk filter UI |
| `src/js/dashboardFreelancer.js` | `SELECT` | Mengisi dropdown `<select id="service-category">` |

**Business Rules:**
- Nama kategori harus unik (constraint `UNIQUE`).
- Data kategori bersifat master dan diasumsikan sudah di-seed.

---

### 2.3 `services`

#### Tujuan Tabel
- Tabel utama untuk layanan yang ditawarkan freelancer.
- Digunakan di landing page untuk discovery dan di freelancer dashboard untuk manajemen layanan.

#### Struktur Data

| Kolom | Tipe | Default | Constraint |
|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | `PRIMARY KEY` |
| `freelancer_id` | `uuid` | — | `FK -> profiles(id)` |
| `category_id` | `uuid` | — | `FK -> categories(id)` |
| `title` | `text` | — | `NOT NULL` |
| `description` | `text` | — | — |
| `price` | `numeric` | — | `NOT NULL` |
| `duration_days` | `integer` | — | — |
| `images` | `array` (seharusnya `text[]`) | — | — |
| `is_active` | `boolean` | `true` | — |
| `created_at` | `timestamptz` | `now()` | — |
| `updated_at` | `timestamptz` | `now()` | — |

#### Relasi
- **Parent** dari: `orders` (via `service_id`).
- **Child** dari: `profiles` (via `freelancer_id`), `categories` (via `category_id`).

#### Penggunaan di Codebase

| File | Operasi | Fungsi |
|---|---|---|
| `src/js/service.js` | `SELECT` | `getServices()`, `getService()` |
| `src/js/service.js` | `SELECT` | `getFreelancerServices()` |
| `src/js/service.js` | `INSERT` | `createService()` |
| `src/js/service.js` | `UPDATE` | `updateService()` |
| `src/js/profile.js` | `SELECT` (count) | `getServicesCount()` |
| `src/js/booking.js` | `SELECT` (embed) | `loadBookings()` join ke `services(title)` |
| `src/js/dashboardFreelancer.js` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | Manajemen service (toggle, edit, delete, add) |
| `src/js/dashboardCustomer.js` | `SELECT` (embed) | `loadOrders()` join `services(title)` |
| `src/js/orderUtils.js` | `SELECT` (embed) | `getOrderDetail()` join `services(title)` |

**Query Patterns:**

```js
// Listing aktif (public)
.from('services').select('*, categories!inner(name), profiles!inner(name, avatar_url, rating)').eq('is_active', true)

// Create
.from('services').insert([serviceData]).select().single()

// Toggle active
.from('services').update({ is_active: next }).eq('id', serviceId)

// Delete
.from('services').delete().eq('id', serviceId)
```

**Business Rules:**
- `is_active = true` adalah prasyarat service muncul di landing page (`getServices()` memfilter ini).
- `freelancer_id` selalu diisi dengan `Auth.currentUser.id` saat insert (tidak bisa atas nama orang lain dari frontend).
- Kolom `images` adalah array URL (disimpan sebagai `images: [image_url]` di `dashboardFreelancer.js`).
- Edit service dari UI hanya mengubah `title` dan `price` (lihat `data-service-edit` handler di `dashboardFreelancer.js`).

---

### 2.4 `orders`

#### Tujuan Tabel
- Tabel transaksi yang merepresentasikan pesanan customer ke freelancer.
- Mengikat customer, freelancer, dan service terkait.
- Menampung status alur kerja proyek.

#### Struktur Data

| Kolom | Tipe | Default | Constraint |
|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | `PRIMARY KEY` |
| `customer_id` | `uuid` | — | `FK -> profiles(id)` |
| `freelancer_id` | `uuid` | — | `FK -> profiles(id)` |
| `service_id` | `uuid` | — | `FK -> services(id)` |
| `status` | `text` | `'pending'` | `CHECK` (per migration: `pending`, `accepted`, `in_progress`, `revision`, `completed`, `cancelled`) |
| `total_price` | `numeric` | — | `NOT NULL` |
| `deadline` | `date` | — | — |
| `notes` | `text` | — | — |
| `created_at` | `timestamptz` | `now()` | — |
| `updated_at` | `timestamptz` | `now()` | — |

> **Catatan penting:** Schema awal mendefinisikan 5 status. Migration di `supabase-schema.sql` menambahkan status `revision` dan memberikan instruksi `ALTER TABLE` untuk meng-update `orders_status_check`.

#### Relasi
- **Parent** dari: `reviews` (via `order_id`), `messages` (via `order_id`), `project_progress` (via `order_id`).
- **Child** dari: `profiles` (customer & freelancer), `services`.

#### Penggunaan di Codebase

| File | Operasi | Fungsi |
|---|---|---|
| `src/js/service.js` | `INSERT` | `bookService()` — membuat order baru dari service |
| `src/js/booking.js` | `SELECT` | `loadBookings()` mengambil order customer + freelancer |
| `src/js/booking.js` | `UPDATE` | `updateStatus()` (legacy) |
| `src/js/dashboardCustomer.js` | `SELECT` (count, embed) | Statistik & list order customer |
| `src/js/dashboardCustomer.js` | `SELECT` (embed) | `loadOrders()` |
| `src/js/dashboardFreelancer.js` | `SELECT`, `UPDATE` | List order + update status (accept/reject/in_progress/revision/completed) |
| `src/js/income.js` | `SELECT` | Aggregasi revenue (total/bulanan/tahunan) dari order `completed` |
| `src/js/orderUtils.js` | `SELECT` (embed) | `getOrderDetail()` |

**Realtime Subscription:**
- `dashboardFreelancer.js` melakukan subscribe ke tabel `orders` dengan filter `freelancer_id=eq.<userId>` untuk refresh otomatis.
- `booking.js` (legacy) memiliki subscription yang **dikomentari** dan menggunakan polling `setInterval(5000)` sebagai fallback.

**Business Rules:**
- Order otomatis berstatus `pending` saat dibuat (`bookService`).
- `total_price` di-salin dari `services.price` saat order dibuat.
- Status flow: `pending → accepted → in_progress → revision → completed` (atau `cancelled` di tiap tahap).
- Revenue & income **hanya dihitung dari order berstatus `completed`** (lihat `income.js`).
- Status aktif (`in_progress`, `accepted`, `revision`) digunakan untuk statistik "Order Aktif".
- Customer **tidak dapat** membuat review sampai order berstatus `completed` (diperiksa di `dashboardCustomer.js`).
- Order dapat di-chat-kan secara scoped (`order_id` terikat pada thread chat).

---

### 2.5 `reviews`

#### Tujuan Tabel
- Ulasan yang diberikan customer ke freelancer setelah order selesai.
- Rating integer 1-5 dengan komentar opsional.

#### Struktur Data

| Kolom | Tipe | Default | Constraint |
|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | `PRIMARY KEY` |
| `order_id` | `uuid` | — | `FK -> orders(id)` |
| `reviewer_id` | `uuid` | — | `FK -> profiles(id)` |
| `reviewed_id` | `uuid` | — | `FK -> profiles(id)` |
| `rating` | `integer` | — | `CHECK (1 <= rating <= 5)` |
| `comment` | `text` | — | — |
| `created_at` | `timestamptz` | `now()` | — |

#### Relasi
- **Parent** dari: tidak ada.
- **Child** dari: `orders`, `profiles` (reviewer & reviewed).

#### Penggunaan di Codebase

| File | Operasi | Fungsi |
|---|---|---|
| `src/js/dashboardCustomer.js` | `SELECT` (maybeSingle) | Cek apakah user sudah pernah mereview order tertentu |
| `src/js/dashboardCustomer.js` | `INSERT` | Submit review baru |
| `src/js/dashboardFreelancer.js` | `SELECT` | Statistik rating freelancer (avg dihitung client-side) |

**Business Rules:**
- Form review **hanya muncul** jika `order.status === 'completed'` (`renderReviewArea()`).
- Jika sudah ada review untuk kombinasi `(order_id, reviewer_id)`, form menampilkan pesan "Thanks!".
- **Tidak ada unique constraint eksplisit** untuk mencegah double-submit; kontrol berada di sisi client via `maybeSingle()`.
- Rating yang disimpan di `reviews.rating` (integer) **berbeda** dari agregat di `profiles.rating` (numeric). Keduanya tidak di-sinkronkan otomatis oleh trigger.
- Trigger `notify_review_created` mengirim notifikasi ke `reviewed_id` setiap kali review dibuat.

---

### 2.6 `messages`

#### Tujuan Tabel
- Menyimpan pesan chat realtime antara user.
- Mendukung chat langsung (`sender_id` ↔ `receiver_id`) dan chat berbasis order (`order_id`).
- Mendukung lampiran file via kolom `file_url`.

#### Struktur Data

| Kolom | Tipe | Default | Constraint |
|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | `PRIMARY KEY` |
| `sender_id` | `uuid` | — | `FK -> profiles(id)` |
| `receiver_id` | `uuid` | — | `FK -> profiles(id)` |
| `order_id` | `uuid` | — | `FK -> orders(id)` (nullable) |
| `content` | `text` | — | `NOT NULL` |
| `file_url` | `text` | — | (tidak ada di schema awal; ditambahkan via migration) |
| `is_read` | `boolean` | `false` | — |
| `created_at` | `timestamptz` | `now()` | — |

#### Relasi
- **Parent** dari: tidak ada.
- **Child** dari: `profiles` (sender & receiver), `orders` (order_id nullable).

#### Penggunaan di Codebase

| File | Operasi | Fungsi |
|---|---|---|
| `src/js/chat.js` | `SELECT` | `loadMessages()` — filter direct chat atau order-scoped |
| `src/js/chat.js` | `INSERT` | `sendMessage()` — simpan pesan + optional file_url |
| `src/js/chat.js` | `UPLOAD` | `uploadFile()` — push file ke Storage bucket `chat-attachments` |
| `src/js/chat.js` | Realtime | `setupRealtime()` — listen perubahan tabel `messages` |

**Business Rules:**
- Pesan dapat dikirim tanpa `order_id` (direct chat) atau dengan `order_id` (scoped chat per-order).
- Untuk direct chat, query filter `sender_id=me AND receiver_id=other OR sender_id=other AND receiver_id=me` (`chat.js`).
- Lampiran file dibatasi: max 10MB, tipe image/PDF/DOC/DOCX (validasi di `chat.js`).
- Trigger `notify_message_created` mengirim notifikasi ke `receiver_id` setiap pesan baru.
- Render mendeteksi lampiran dengan cek `msg.content.startsWith('storage:')` (kemungkinan path terlantar — lihat bagian "Missing Database Features").

---

### 2.7 `project_progress`

#### Tujuan Tabel
- Tabel milestone/checklist untuk satu order.
- Freelancer menambahkan item progress; customer melihat progress order mereka.

#### Struktur Data

| Kolom | Tipe | Default | Constraint |
|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | `PRIMARY KEY` |
| `order_id` | `uuid` | — | `FK -> orders(id) ON DELETE CASCADE` |
| `title` | `text` | — | `NOT NULL` |
| `completed` | `boolean` | `false` | — |
| `created_at` | `timestamptz` | `now()` | — |

**Index:** `idx_project_progress_order(order_id)`

#### Relasi
- **Parent** dari: tidak ada.
- **Child** dari: `orders` (ON DELETE CASCADE).

#### Penggunaan di Codebase

| File | Operasi | Fungsi |
|---|---|---|
| `src/js/dashboardFreelancer.js` | `INSERT` | Tambah progress item per order |
| `src/js/dashboardFreelancer.js` | `SELECT` | `renderProgress()` — list progress + form tambah |
| `src/js/dashboardFreelancer.js` | `UPDATE` | Tandai `completed = true` |
| `src/js/dashboardCustomer.js` | `SELECT` | `renderCustomerProgress()` — view-only di customer dashboard |
| `src/js/dashboardCustomer.js` | Realtime | Subscribe `project_progress` untuk auto-refresh |
| `src/js/dashboardFreelancer.js` | Realtime | Subscribe `project_progress` untuk auto-refresh |

**Business Rules:**
- Hanya freelancer yang terlibat pada `order` tersebut yang dapat INSERT/UPDATE (RLS `project_progress_manage_freelancer`).
- Customer hanya dapat SELECT progress untuk order miliknya (RLS `project_progress_view_customer`).
- Tidak ada trigger notifikasi untuk perubahan progress (beda dengan order/review/message).

---

### 2.8 `portfolio`

#### Tujuan Tabel
- Showcase karya freelancer.
- Setiap item berisi judul, deskripsi, dan URL gambar (atau URL project).

#### Struktur Data

| Kolom | Tipe | Default | Constraint |
|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | `PRIMARY KEY` |
| `freelancer_id` | `uuid` | — | `FK -> profiles(id) ON DELETE CASCADE` |
| `title` | `text` | — | `NOT NULL` |
| `description` | `text` | — | — |
| `image_url` | `text` | — | — |
| `project_url` | `text` | — | — |
| `created_at` | `timestamptz` | `now()` | — |

**Index:** `idx_portfolio_freelancer(freelancer_id)`

#### Relasi
- **Parent** dari: tidak ada.
- **Child** dari: `profiles` (ON DELETE CASCADE).

#### Penggunaan di Codebase

| File | Operasi | Fungsi |
|---|---|---|
| `src/js/dashboardFreelancer.js` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | `loadPortfolio()` + form `add-portfolio-form` |

**Business Rules:**
- Hanya pemilik yang bisa CRUD (RLS `portfolio_manage_own`).
- Semua user bisa SELECT (RLS `portfolio_public_select`).
- `title` wajib diisi (validasi client-side: `Toast.error('Title is required')`).
- Tabel ini **tidak memiliki halaman publik** untuk menampilkan portfolio di landing page — hanya tersedia di dashboard freelancer.

---

### 2.9 `notifications`

#### Tujuan Tabel
- Antrian notifikasi in-app untuk user.
- Dibuat otomatis oleh trigger database saat order/message/review.

#### Struktur Data

| Kolom | Tipe | Default | Constraint |
|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | `PRIMARY KEY` |
| `user_id` | `uuid` | — | `FK -> profiles(id) ON DELETE CASCADE` |
| `title` | `text` | — | `NOT NULL` |
| `message` | `text` | — | `NOT NULL` |
| `is_read` | `boolean` | `false` | — |
| `created_at` | `timestamptz` | `now()` | — |

**Index:**
- `idx_notifications_user(user_id)`
- `idx_notifications_read(is_read)`

#### Relasi
- **Parent** dari: tidak ada.
- **Child** dari: `profiles` (ON DELETE CASCADE).

#### Penggunaan di Codebase

| File | Operasi | Fungsi |
|---|---|---|
| `src/js/notifications.js` | `SELECT` | `loadForUser()` — list 50 notifikasi terbaru |
| `src/js/notifications.js` | `UPDATE` | `markRead()`, `markAllRead()` |
| `src/js/notifications.js` | Realtime | `subscribe(userId, onUpdate)` — listen perubahan |
| `src/js/notifications.js` | Render | `renderList()` — render UI list notifikasi |
| `src/js/dashboardCustomer.js` | `SELECT`, `UPDATE` (all read) | Panel "Notifications" di customer dashboard |
| `src/js/dashboardFreelancer.js` | Realtime | Subscribe notifikasi (placeholder, belum ada panel UI) |

**Business Rules:**
- Notifikasi dibuat oleh trigger (lihat bagian Trigger), bukan dari frontend.
- User hanya bisa SELECT/UPDATE notifikasi miliknya sendiri (RLS).
- Belum ada INSERT dari frontend — INSERT hanya via trigger `SECURITY DEFINER`.
- Freelancer dashboard sudah subscribe notifikasi tapi **belum memiliki UI panel** untuk menampilkannya (lihat `Missing Features`).

---

## 3. Database Relationship Overview

Relasi sistem secara keseluruhan:

```
profiles (id)
│
├── services          (freelancer_id)
│     └── orders      (service_id)
│           ├── reviews       (order_id)
│           ├── messages      (order_id)
│           └── project_progress (order_id)
│
├── orders            (customer_id)        ──┐
├── orders            (freelancer_id)      ──┘
│
├── reviews           (reviewer_id)
├── reviews           (reviewed_id)
│
├── messages          (sender_id)
├── messages          (receiver_id)
│
├── portfolio         (freelancer_id)
│
└── notifications     (user_id)


categories
└── services          (category_id)
```

### Ringkasan Kardinalitas

| Relasi | Kardinalitas | Keterangan |
|---|---|---|
| `profiles` 1—N `services` | satu freelancer punya banyak service | via `services.freelancer_id` |
| `profiles` 1—N `orders` (customer) | satu customer punya banyak order | via `orders.customer_id` |
| `profiles` 1—N `orders` (freelancer) | satu freelancer menerima banyak order | via `orders.freelancer_id` |
| `services` 1—N `orders` | satu service bisa di-book banyak customer | via `orders.service_id` |
| `orders` 1—N `reviews` | order bisa punya satu review | via `reviews.order_id` |
| `orders` 1—N `messages` | order-scoped chat | via `messages.order_id` |
| `orders` 1—N `project_progress` | progress checklist per order | via `project_progress.order_id` |
| `categories` 1—N `services` | kategori memiliki banyak service | via `services.category_id` |
| `profiles` 1—N `portfolio` | freelancer punya banyak portfolio | via `portfolio.freelancer_id` |
| `profiles` 1—N `notifications` | user punya banyak notifikasi | via `notifications.user_id` |
| `profiles` 1—N `messages` (sender & receiver) | user mengirim & menerima banyak pesan | via `messages.sender_id` & `receiver_id` |

---

## 4. Trigger (Database)

Semua trigger didefinisikan di `supabase-schema.sql`.

### 4.1 Helper Function: `push_notification(p_user_id, p_title, p_message)`

```sql
CREATE OR REPLACE FUNCTION push_notification(p_user_id UUID, p_title TEXT, p_message TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications(user_id, title, message, is_read)
  VALUES (p_user_id, p_title, p_message, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- Dipanggil oleh semua trigger notifikasi di bawah.
- `SECURITY DEFINER` agar bisa INSERT meski RLS `notifications_insert_own` memvalidasi `user_id = auth.uid()`. Catatan: dengan `SECURITY DEFINER`, row akan ter-insert walau `user_id` tidak sama dengan `auth.uid()`. Ini cara trigger menembus RLS untuk user target.

### 4.2 `trg_notify_order_created` (AFTER INSERT ON `orders`)

- **Event:** Order baru di-insert.
- **Aksi:** Jika `NEW.freelancer_id` terisi, push notifikasi:
  - `title = 'Order Received'`
  - `message = 'New order has been created and is waiting for your approval.'`

### 4.3 `trg_notify_order_status_changed` (AFTER UPDATE OF status ON `orders`)

- **Event:** Kolom `status` berubah.
- **Aksi:** Berdasarkan status baru, push notifikasi ke `customer_id`:
  - `accepted` → "Order Accepted"
  - `in_progress` → "Order In Progress"
  - `revision` → "Revision Requested"
  - `completed` → "Order Completed"
  - `cancelled` → "Order Cancelled"
- **Aksi tambahan:** Jika status menjadi `cancelled` dan `freelancer_id` baru di-set, push notifikasi "Order Cancelled" ke freelancer.

### 4.4 `trg_notify_message_created` (AFTER INSERT ON `messages`)

- **Event:** Pesan baru di-insert.
- **Aksi:** Push notifikasi ke `receiver_id`:
  - `title = 'New Message'`
  - `message = 'You received a new chat message.'`

### 4.5 `trg_notify_review_created` (AFTER INSERT ON `reviews`)

- **Event:** Review baru di-insert.
- **Aksi:** Push notifikasi ke `reviewed_id`:
  - `title = 'New Review'`
  - `message = 'You received a new review from a customer.'`

### Catatan

- Trigger `update_updated_at_column` (yang sebelumnya diasumsikan ada di schema awal) **tidak didefinisikan ulang** di `supabase-schema.sql`. Status aktualnya tidak dapat diverifikasi dari file di repo ini.
- Tidak ada trigger untuk menjaga sinkronisasi `profiles.rating` / `profiles.total_reviews` (lihat bagian "Database Improvement Suggestions").

---

## 5. RPC Function

### 5.1 `get_user_rating(user_id UUID)`

- **Definisi:** Tersimpan sebagai **komentar** di `src/js/profile.js` (tidak dijalankan otomatis oleh schema).
- **Tujuan:** Mengembalikan rata-rata rating user (numerik 2 desimal) dari tabel `reviews`.

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

#### Penggunaan di Codebase

| File | Status |
|---|---|
| `src/js/profile.js` | RPC dipanggil sebagai `supabase.rpc('get_user_rating', { user_id })` di `Profile.getRating()`. |
| `src/js/dashboardFreelancer.js` | **Tidak** menggunakan RPC. Rating dihitung client-side dengan reduce array. |

> **Catatan penting:** RPC ini **harus dibuat manual** di Supabase SQL Editor (tidak otomatis ada di schema). Jika belum dibuat, `Profile.getRating()` akan gagal.

---

## 6. Storage Bucket

### 6.1 `chat-attachments`

- **Penggunaan:** Penyimpanan file lampiran chat (gambar, PDF, DOC/DOCX).
- **Akses:** Public (URL dihasilkan via `getPublicUrl()`).

#### Penggunaan di Codebase

| File | Operasi |
|---|---|
| `src/js/chat.js` | `supabase.storage.from('chat-attachments').upload(filePath, file, { upsert: true })` |
| `src/js/chat.js` | `supabase.storage.from('chat-attachments').getPublicUrl(filePath)` |

**Path convention:** `chat-attachments/<timestamp>-<userId>-<uuid>.<ext>`

**Business Rules (client-side):**
- Max 10MB (`if (file.size > 10 * 1024 * 1024)`).
- Tipe diterima: `image/*`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- File di-upload dengan `upsert: true` (replace jika nama bentrok).
- URL publik di-simpan di kolom `messages.file_url`.

> Tidak ada policy RLS Storage eksplisit di `supabase-schema.sql` yang ditemukan di repo. Bucket diasumsikan publik atau menggunakan policy default.

---

## 7. Realtime Subscriptions

Subscription aktif yang ditemukan di codebase:

### 7.1 Tabel `messages` (Chat)

- **Lokasi:** `src/js/chat.js` → `setupRealtime()`.
- **Channel:** `'messages'`
- **Event:** `*`
- **Aksi:** Memanggil `this.loadMessages()` untuk refresh thread.
- **Filter:** Tidak ada filter (listen semua perubahan; di-filter lagi oleh query `loadMessages`).

### 7.2 Tabel `orders` (Freelancer Dashboard)

- **Lokasi:** `src/js/dashboardFreelancer.js` → `setupRealtime()`.
- **Channel:** `freelancer_orders_<userId>`
- **Event:** `*`
- **Filter:** `freelancer_id=eq.<userId>`
- **Aksi:** `await this.loadOrders()`.

### 7.3 Tabel `project_progress` (Customer)

- **Lokasi:** `src/js/dashboardCustomer.js` → `setupRealtime()`.
- **Channel:** `project_progress_customer_<userId>`
- **Event:** `*`
- **Aksi:** `renderCustomerProgress(selectedOrderId)`.

### 7.4 Tabel `project_progress` (Freelancer)

- **Lokasi:** `src/js/dashboardFreelancer.js` → `setupRealtime()`.
- **Channel:** `freelancer_progress_<userId>`
- **Event:** `*`
- **Aksi:** `renderProgress(selectedOrderId)`.

### 7.5 Tabel `notifications` (Customer & Freelancer)

- **Lokasi:** `src/js/notifications.js` → `subscribe(userId, onUpdate)`.
- **Channel:** `notifications_<userId>`
- **Event:** `*`
- **Filter:** `user_id=eq.<userId>`
- **Aksi:** Memanggil `onUpdate()` callback.
- **Dipakai di:** `dashboardCustomer.js` (refresh panel), `dashboardFreelancer.js` (callback placeholder).

### 7.6 Subscription `orders` di `booking.js` (LEGACY / Dinonaktifkan)

- **Lokasi:** `src/js/booking.js` → `init()`.
- **Status:** Kode subscription dikomentari. Sebagai gantinya menggunakan `setInterval(() => this.renderBookings(), 5000)`.

### Catatan

- `src/js/supabase.js` juga mengekspor helper `subscribe(channel, callback)` yang membuat channel dengan filter `table = channel`. Helper ini **tidak dipanggil** oleh modul lain di codebase.
- Realtime publication untuk `project_progress` dan `notifications` di-comment di `supabase-schema.sql`:
  ```sql
  -- ALTER PUBLICATION supabase_realtime ADD TABLE project_progress, notifications;
  ```
  Walau dikomentari, subscription ke tabel-tabel ini **terbukti berjalan** di kode (di luar migration), sehingga diasumsikan DBA sudah menjalankan perintah ini secara manual.

---

## 8. Row Level Security (RLS)

### 8.1 Tabel tanpa RLS eksplisit di migration

Tabel-tabel berikut **tidak memiliki ALTER TABLE ... ENABLE ROW LEVEL SECURITY** atau policy yang didefinisikan ulang di `supabase-schema.sql`:

- `profiles` (asumsi: policy di schema awal)
- `categories` (asumsi: public SELECT)
- `services` (asumsi: policy di schema awal)
- `orders` (asumsi: policy di schema awal)
- `reviews` (asumsi: policy di schema awal)
- `messages` (asumsi: policy di schema awal)

> Detail policy untuk tabel-tabel di atas tidak terdapat dalam file SQL yang ada di repository. Diasumsikan policy sudah dibuat di schema awal sebelum migrasi.

### 8.2 `project_progress` — RLS Policies

```sql
ALTER TABLE project_progress ENABLE ROW LEVEL SECURITY;

-- Customer dapat SELECT progress untuk order miliknya
CREATE POLICY "project_progress_view_customer" ON project_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = project_progress.order_id
      AND orders.customer_id = auth.uid()
  )
);

-- Freelancer dapat SELECT/INSERT/UPDATE/DELETE progress untuk order miliknya
CREATE POLICY "project_progress_manage_freelancer" ON project_progress
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = project_progress.order_id
      AND orders.freelancer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = project_progress.order_id
      AND orders.freelancer_id = auth.uid()
  )
);
```

| Policy | Peran | Operasi yang diizinkan |
|---|---|---|
| `project_progress_view_customer` | Customer pemilik order | `SELECT` |
| `project_progress_manage_freelancer` | Freelancer pemilik order | `ALL` (SELECT, INSERT, UPDATE, DELETE) |

### 8.3 `portfolio` — RLS Policies

```sql
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;

-- Freelancer dapat CRUD portfolio miliknya
CREATE POLICY "portfolio_manage_own" ON portfolio
FOR ALL
USING (freelancer_id = auth.uid())
WITH CHECK (freelancer_id = auth.uid());

-- Semua user dapat melihat portfolio
CREATE POLICY "portfolio_public_select" ON portfolio
FOR SELECT
USING (true);
```

| Policy | Peran | Operasi |
|---|---|---|
| `portfolio_manage_own` | Pemilik (`freelancer_id = auth.uid()`) | `ALL` |
| `portfolio_public_select` | Semua user | `SELECT` |

### 8.4 `notifications` — RLS Policies

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- User hanya dapat SELECT notifikasi miliknya
CREATE POLICY "notifications_select_own" ON notifications
FOR SELECT
USING (user_id = auth.uid());

-- User hanya dapat UPDATE notifikasi miliknya
CREATE POLICY "notifications_update_own" ON notifications
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- INSERT oleh user sendiri (trigger menembus via SECURITY DEFINER)
CREATE POLICY "notifications_insert_own" ON notifications
FOR INSERT
WITH CHECK (user_id = auth.uid());
```

| Policy | Peran | Operasi |
|---|---|---|
| `notifications_select_own` | Pemilik | `SELECT` |
| `notifications_update_own` | Pemilik | `UPDATE` |
| `notifications_insert_own` | Pemilik | `INSERT` |

> INSERT notifikasi dari trigger `push_notification()` berhasil karena `SECURITY DEFINER` mengeksekusi fungsi dengan privilege pemilik fungsi, menembus RLS.

---

## 9. Supabase Features Used

### 9.1 Authentication

| Fitur | Pemakaian di Codebase |
|---|---|
| Email/password sign-up | `supabase.auth.signUp({ email, password })` di `auth.js` |
| Email/password sign-in | `supabase.auth.signInWithPassword({ email, password })` di `auth.js` |
| Sign-out | `supabase.auth.signOut()` di `auth.js` |
| Get current user | `supabase.auth.getUser()` di banyak modul |
| Get current session | `supabase.auth.getSession()` di `auth.js` |
| Auth state listener | `supabase.auth.onAuthStateChange(...)` di `auth.js` |
| Implicit uid via RLS | `auth.uid()` digunakan di semua policy RLS di migration |

### 9.2 Database (PostgreSQL via Supabase)

| Operasi | Pemakaian |
|---|---|
| SELECT (with embed/join) | `select('*, relation!fk(col)')` di banyak modul |
| INSERT | Insert service, order, review, message, progress, portfolio, notification |
| UPDATE | Update service, order status, profile, notification, progress |
| DELETE | Delete service, delete portfolio |
| COUNT | `select('*', { count: 'exact', head: true })` untuk statistik |
| RPC | `supabase.rpc('get_user_rating', { user_id })` di `profile.js` |

### 9.3 Realtime

| Channel Pattern | Tabel |
|---|---|
| `'messages'` | `messages` |
| `freelancer_orders_<uid>` | `orders` |
| `project_progress_customer_<uid>` | `project_progress` |
| `freelancer_progress_<uid>` | `project_progress` |
| `notifications_<uid>` | `notifications` |

Semua subscription menggunakan event `'*'` (insert, update, delete).

### 9.4 Storage

| Bucket | Operasi |
|---|---|
| `chat-attachments` | `upload()`, `getPublicUrl()` di `chat.js` |

### 9.5 Row Level Security

- RLS aktif di `project_progress`, `portfolio`, `notifications` (dari migration).
- Diasumsikan aktif di `profiles`, `services`, `orders`, `reviews`, `messages` (dari schema awal).

---

## 10. Missing Database Features

Bagian ini mencatat fitur database yang **sudah ada** tetapi **belum dimanfaatkan** oleh frontend secara penuh, atau yang memiliki inkonsistensi.

### 10.1 Tabel `categories` — Pemakaian Parsial

- ✅ Dipakai untuk filter di service discovery.
- ✅ Dipakai untuk dropdown di form tambah service freelancer.
- ❌ Kolom `icon` **tidak pernah di-render** (frontend tidak menampilkan ikon kategori).
- ❌ Tidak ada filter UI di landing page untuk kategori.

### 10.2 Tabel `portfolio` — Tanpa Halaman Publik

- ✅ CRUD lengkap di freelancer dashboard.
- ❌ **Tidak ada halaman publik** untuk menampilkan portfolio freelancer.
- ❌ RLS `portfolio_public_select` sudah mengizinkan SELECT publik, tapi tidak ada UI consumption.
- ❌ Portfolio tidak terhubung ke profil publik freelancer (tidak ada relasi `portfolio ↔ profile public view`).

### 10.3 Tabel `notifications` — Panel UI Hanya di Customer

- ✅ Customer dashboard memiliki panel "Notifications" dengan render & mark-read.
- ❌ Freelancer dashboard melakukan subscribe notifikasi **tanpa UI panel** untuk menampilkannya.
- ❌ Sidebar global tidak memiliki indikator notifikasi (bell icon dengan badge).

### 10.4 Tabel `project_progress` — Tidak Ada Notifikasi

- ✅ Customer & freelancer dapat melihat & mengelola progress.
- ❌ **Tidak ada trigger** notifikasi saat progress ditambahkan atau ditandai selesai.

### 10.5 RPC `get_user_rating` — Tidak Konsisten

- ❌ `profile.js` masih memakai RPC, tapi `dashboardFreelancer.js` menghitung rating **client-side** dengan reduce.
- ➜ Inkonsistensi: dua pendekatan berbeda untuk hal yang sama.

### 10.6 Kolom `messages.content.startsWith('storage:')` — Legacy

- Di `chat.js` (`renderMessages`), ada logika:
  ```js
  const attachment = msg.content.startsWith('storage:') ? `<img src="${msg.content}" ...>` : '';
  ```
  Konvensi ini terlihat tidak terpakai — semua lampiran disimpan di `file_url` (URL publik Storage), bukan di-`content` dengan prefix `storage:`.

### 10.7 Kolom `services.images`

- Schema menyimpan sebagai `array` (seharusnya `text[]`). Frontend selalu menyimpan **satu URL** sebagai `images: [image_url]`, sehingga relasi many-image tidak dimanfaatkan penuh.

### 10.8 Kolom `orders.deadline`

- Kolom ada di schema, tapi **tidak ada UI** input deadline di form booking, dan tidak ada display di dashboard manapun.

### 10.9 Kolom `services.duration_days`

- Ada di schema dan ada input di form tambah service.
- ❌ **Tidak pernah di-render** di listing service manapun (landing page atau dashboard).

### 10.10 Realtime Publication Comment

- `ALTER PUBLICATION supabase_realtime ADD TABLE project_progress, notifications;` di-comment.
- Subscription di JS mengasumsikan tabel ini sudah ditambahkan ke publication. Jika DBA belum menjalankan baris ini, subscription gagal silently.

---

## 11. Database Improvement Suggestions

### 11.1 Optimasi Query

| Tabel | Query | Saran |
|---|---|---|
| `orders` | `loadStats()` di `dashboardCustomer.js` menjalankan **4 query terpisah** untuk menghitung total/active/finished/freelancers. | Gabungkan menjadi satu query agregat dengan `GROUP BY` atau RPC. |
| `orders` | `income.js` menjalankan 3 query (total, month, year). | Bisa digabung menggunakan conditional aggregation dalam satu query. |
| `services` | `getServices()` menggunakan `or()` filter dengan `ilike` pada 4 kolom tanpa index. | Tambahkan GIN index untuk full-text search atau index per kolom. |
| `messages` | `chat.js` listen `postgres_changes` tanpa filter → payload besar. | Tambahkan filter `order_id=eq.<id>` atau `or(sender_id, receiver_id)` untuk mempersempit payload. |

### 11.2 Index yang Mungkin Diperlukan

Foreign key yang belum di-index secara eksplisit (di schema awal yang diasumsikan):

```sql
CREATE INDEX IF NOT EXISTS idx_services_freelancer_id ON services(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_freelancer_id ON orders(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_orders_service_id ON orders(service_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);  -- untuk income filter
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);  -- untuk date range income
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_id ON reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_order_id ON messages(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
```

### 11.3 Potensi Masalah Relasi

| Masalah | Dampak |
|---|---|
| `skills` & `images` di schema menggunakan `ARRAY` tanpa sub-tipe | Migration error; perlu `TEXT[]`. |
| Tidak ada `ON DELETE CASCADE` eksplisit untuk `orders.customer_id`, `orders.freelancer_id`, `orders.service_id`, `messages.*`, `reviews.*` | Jika profile/service/order dihapus manual, akan ada orphan rows. |
| Tidak ada `UNIQUE (order_id, reviewer_id)` di `reviews` | Customer berpotensi double-review jika RLS `notifications_insert_own` atau client check di-bypass. |
| Tidak ada FK antara `portfolio` dan `services` | Portfolio tidak terkait langsung dengan service yang ditawarkan. |
| `categories.icon` tidak digunakan | Kolom sia-sia. |

### 11.4 Potensi Masalah Keamanan

| Masalah | Dampak |
|---|---|
| Bucket `chat-attachments` diasumsikan publik tanpa policy Storage eksplisit | Siapapun dengan URL dapat membaca file. Perlu policy Storage untuk membatasi akses hanya ke sender & receiver. |
| `push_notification` `SECURITY DEFINER` | Jika function di-compromise, attacker bisa INSERT notifikasi ke user manapun. |
| `services` insert dari frontend tanpa validasi price | User dapat input price negatif (frontend mem-validasi `min="0"`, tapi ini HTML-only, tidak enforced di DB). |
| Tidak ada rate limit di trigger notifikasi | Spam order/message dapat membanjiri tabel `notifications`. |
| RPC `get_user_rating` mengembalikan semua rating tanpa filter `is_public` | Privacy concern jika ada kolom visibility. |
| `messages` SELECT tanpa filter RLS yang ketat | User A bisa SELECT pesan apapun di mana `auth.uid() = sender_id OR receiver_id`; tidak ada validasi `order_id` ownership. |

### 11.5 Potensi Masalah Performa

| Masalah | Dampak |
|---|---|
| `dashboardCustomer.loadStats()` melakukan 4 round-trip | Loading lambat di dashboard. |
| `booking.js` polling `setInterval(5000)` | 12 request/menit per user aktif. Seharusnya realtime subscription. |
| `chat.js` realtime tanpa filter | Payload besar pada schema besar; PostgreSQL changes berisi semua rows. |
| `chat.js` re-load semua messages pada setiap event | Render ulang seluruh thread untuk 1 pesan baru. |
| `dashboardFreelancer` load semua order tanpa pagination | Skala besar akan menjadi masalah. |
| `notifications.loadForUser` limit 50 tanpa filter `is_read=false` | User yang sudah mark-all-read akan terus melihat 50 row lama. |
| Tidak ada caching untuk `categories` | Dipanggil setiap render dashboard. |
| Multiple embed join (`profiles!inner(...)`) tanpa index composite | JOIN berat pada tabel `orders`. |

### 11.6 Saran Tambahan

1. **Buat view** untuk query kompleks (mis. `v_order_details` yang sudah join service, customer, freelancer).
2. **Pagination** di semua list query (`range()` Supabase).
3. **Soft delete** untuk `services`, `portfolio` (kolom `deleted_at`) untuk histori.
4. **Trigger untuk sinkronisasi `profiles.rating`** setiap `reviews` berubah.
5. **Gunakan ENUM type** untuk `role` dan `orders.status` untuk konsistensi.
6. **Tambahkan kolom `updated_at` ke `reviews`, `messages`, `project_progress`, `portfolio`, `notifications`** untuk audit trail.

---

## 12. Ringkasan Eksekutif

- **9 tabel publik** membentuk data layer NimTask.
- **6 tabel inti** (profiles, categories, services, orders, reviews, messages) adalah fondasi marketplace.
- **3 tabel tambahan** (project_progress, portfolio, notifications) adalah ekstensi fitur yang ditambahkan via migration di `supabase-schema.sql`.
- **5 trigger notifikasi** mengirim event otomatis ke user.
- **1 RPC** (`get_user_rating`) didefinisikan sebagai komentar di kode, harus dibuat manual.
- **1 storage bucket** (`chat-attachments`) untuk lampiran chat.
- **5 channel realtime** aktif untuk messages, orders, project_progress, notifications.
- **7 RLS policy** ditambahkan di migration untuk project_progress, portfolio, notifications.
- **Inkonsistensi utama:** rating agregat, panel notifikasi freelancer, halaman portfolio publik, sinkronisasi `profiles.rating`, dan filter realtime yang terlalu luas.
- **Risiko utama:** orphan rows (no cascade), bucket publik tanpa policy, query N+1 di stats, dan RPC yang harus dibuat manual.

Dokumentasi ini hanya membahas lapisan data. Untuk struktur proyek, entry point, dan dependensi, lihat `docs/project-overview.md`.


