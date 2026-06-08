# NimTask — Application Flow Documentation

Dokumentasi ini menjelaskan alur (flow) fitur dan business process di NimTask berdasarkan implementasi nyata pada codebase. Setiap flow mencakup: file yang terlibat, fungsi yang digunakan, alur data, dan interaksi dengan Supabase.

> **Catatan:** Dokumentasi ini murni berdasarkan pembacaan kode di `src/js/*.js` dan `src/*.html`. Tidak ada perubahan kode.

---

## Daftar Isi

1. [Authentication Flow](#1-authentication-flow)
2. [Role System](#2-role-system)
3. [Service Management Flow](#3-service-management-flow)
4. [Booking Flow](#4-booking-flow)
5. [Order Flow](#5-order-flow)
6. [Chat Flow](#6-chat-flow)
7. [Notification Flow](#7-notification-flow)
8. [Dashboard Flow](#8-dashboard-flow)

9. [Recent Activity (Activity Log)](#9-recent-activity-activity-log)


---

## 1. Authentication Flow

### 1.1 Sign Up Flow

#### File yang Terlibat
- `src/signup.html` — Form UI
- `src/js/auth.js` — Logika auth

#### Fungsi yang Digunakan
- `Auth.signup(email, password, name, role)` di `auth.js`
- `Auth.init()` di `auth.js`
- `Navigation.setupFullPage()` di `navigation.js`

#### Alur Data

```
[User] → Isi form (name, email, password, role)
   ↓
[signup.html] validasi client-side (min 2 char nama, valid email, min 6 char password)
   ↓
[Auth.signup()] dipanggil
   ↓
[Supabase Auth] supabase.auth.signUp({ email, password })
   ↓ (returns userData.user)
[Delay 1000ms] menunggu auth.users stabil
   ↓
[Supabase DB] INSERT ke profiles (id, name, role)
   ↓
[Auth.loadUserProfile()] SELECT profiles WHERE id = user.id
   ↓
[localStorage] simpan authUser JSON
   ↓
[signup.html] redirect berdasarkan role:
   - freelancer → /src/freelancer-dashboard.html
   - customer   → /src/customer-dashboard.html
```

#### Interaksi dengan Supabase

| Operasi | Tabel/Service | Detail |
|---|---|---|
| `supabase.auth.signUp()` | Auth | Buat user di `auth.users` |
| `supabase.from('profiles').insert()` | `profiles` | Insert profil dengan `id = user.id` |
| `supabase.from('profiles').select()` | `profiles` | Muat profil untuk di-cache |

#### Diagram

```
┌──────────┐   form submit   ┌──────────────┐
│  User    │ ──────────────► │  signup.html │
└──────────┘                 └──────┬───────┘
                                    │ Auth.signup()
                                    ▼
                          ┌─────────────────────┐
                          │ supabase.auth.signUp│
                          └──────────┬──────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │ auth.users (created)│
                          └──────────┬──────────┘
                                     │ delay 1s
                                     ▼
                          ┌─────────────────────┐
                          │ INSERT profiles     │
                          └──────────┬──────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │ SELECT profiles     │ → localStorage
                          └──────────┬──────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │ Redirect by role    │
                          │ (freelancer/customer│
                          │  dashboard)         │
                          └─────────────────────┘
```

---

### 1.2 Login Flow

#### File yang Terlibat
- `src/login.html`
- `src/js/auth.js`

#### Fungsi yang Digunakan
- `Auth.login(email, password)`
- `Auth.currentUser` (state)
- `Auth.restoreFromCache()` (saat init)

#### Alur Data

```
[User] → Isi email + password
   ↓
[login.html] validasi (email format, min 6 char)
   ↓
[Auth.login()] → supabase.auth.signInWithPassword({ email, password })
   ↓ (success)
[Auth.loadUserProfile()] → SELECT profiles WHERE id = user.id
   ↓
[Auth.currentUser] di-set, simpan ke localStorage('authUser')
   ↓
[login.html] redirect:
   - freelancer → /src/freelancer-dashboard.html
   - customer   → /src/customer-dashboard.html
```

#### Interaksi dengan Supabase

| Operasi | Tabel/Service | Detail |
|---|---|---|
| `supabase.auth.signInWithPassword()` | Auth | Verifikasi kredensial |
| `supabase.from('profiles').select()` | `profiles` | Load profile setelah login |

#### Diagram

```
┌──────────┐   submit   ┌─────────────┐
│  User    │ ─────────► │ login.html  │
└──────────┘            └──────┬──────┘
                               │ Auth.login()
                               ▼
                   ┌──────────────────────────┐
                   │ signInWithPassword()      │
                   └────────────┬─────────────┘
                                │ success
                                ▼
                   ┌──────────────────────────┐
                   │ loadUserProfile()        │
                   │  → SELECT profiles       │
                   └────────────┬─────────────┘
                                │
                                ▼
                   ┌──────────────────────────┐
                   │ localStorage.authUser    │
                   └────────────┬─────────────┘
                                │
                                ▼
                   ┌──────────────────────────┐
                   │ Redirect by role         │
                   └──────────────────────────┘
```

---

### 1.3 Logout Flow

#### File yang Terlibat
- `src/js/auth.js`
- `src/js/navigation.js` (sidebar & navbar trigger)

#### Fungsi yang Digunakan
- `Auth.logout()`

#### Alur Data

```
[User] klik Logout (sidebar atau navbar)
   ↓
[Auth.logout()] → supabase.auth.signOut()
   ↓
[Auth.currentUser] = null
[localStorage] removeItem('authUser')
   ↓
[window.location.href] = '/src/index.html'
```

#### Interaksi dengan Supabase

| Operasi | Detail |
|---|---|
| `supabase.auth.signOut()` | Hapus session di server & client |

---

### 1.4 Session Restoration (di setiap page load)

#### File yang Terlibat
- `src/js/auth.js` — `Auth.init()`

#### Alur Data

```
[Page load] → Auth.init()
   ↓
[localStorage] restoreFromCache() → set currentUser dari 'authUser'
   ↓
[Supabase] getSession() → cek session aktif
   ↓ (jika ada session)
[loadUserProfile()] → refresh profile dari DB
   ↓
[Supabase] onAuthStateChange listener (SIGNED_IN, SIGNED_OUT)
```

#### Catatan
- Setiap halaman yang dilindungi (dashboard, profile, chat) memanggil `Navigation.setupForLoggedInPage()` yang pada gilirannya memanggil `Auth.init()`.
- Jika `Auth.currentUser` null, user di-redirect ke `/src/login.html`.

---

## 2. Role System

### 2.1 Definisi Role

NimTask memiliki **2 role** yang disimpan di `profiles.role` (TEXT dengan CHECK constraint).

| Role | Value | Deskripsi |
|---|---|---|
| Customer | `'customer'` | Memesan jasa dari freelancer |
| Freelancer | `'freelancer'` | Menawarkan jasa, menerima order |

### 2.2 Penetapan Role

- **Default** saat signup: `'customer'`
- **Override** saat signup: user memilih opsi di `signup.html` (radio button "I want to join as")
- Disimpan permanen di `profiles.role` setelah `Auth.signup()`

### 2.3 Role-Based Routing

Setelah login, role menentukan halaman tujuan:

| Role | Redirect URL |
|---|---|
| customer | `/src/customer-dashboard.html` |
| freelancer | `/src/freelancer-dashboard.html` |

#### File yang Menentukan Routing

- `src/login.html` line 350: `const redirectUrl = role === 'freelancer' ? '/src/freelancer-dashboard.html' : '/src/customer-dashboard.html';`
- `src/signup.html` line 443: sama seperti di atas
- `src/dashboard.html`: route generik yang redirect ke role-specific dashboard

### 2.4 Role-Based UI (Sidebar & Navbar)

File: `src/js/navigation.js` → `getNavbarItems()` & `getSidebarItems()`

#### Customer Items

| Lokasi | Items |
|---|---|
| Navbar | Home, Orders, Chat, Profile, Logout |
| Sidebar | Dashboard, Find Service, My Orders, Messages, Notifications, Profile, Settings |

#### Freelancer Items

| Lokasi | Items |
|---|---|
| Navbar | Home, Chat, Profile, Logout |
| Sidebar | Dashboard, My Services, Orders, Portfolio, Messages, Notifications, Earnings, Profile, Settings |

#### Diagram

```
                 ┌────────────────┐
                 │ Auth.currentUser│
                 │  .role         │
                 └────────┬───────┘
                          │
            ┌─────────────┴────────────┐
            ▼                          ▼
    ┌──────────────┐          ┌──────────────────┐
    │ 'customer'   │          │  'freelancer'    │
    └──────┬───────┘          └────────┬─────────┘
           │                           │
           ▼                           ▼
   customer-dashboard.html     freelancer-dashboard.html
           │                           │
           ├─ My Orders                ├─ Service Management
           ├─ Reviews                  ├─ Order Management
           ├─ Notifications            ├─ Progress Tracking
           └─ Find Service             ├─ Portfolio
                                       ├─ Income
                                       └─ Notifications
```

### 2.5 Role-Based Access Control (di Frontend)

| Modul | Validasi |
|---|---|
| `dashboardFreelancer.js` | `if (Auth.currentUser.role !== 'freelancer') renderAccessDenied();` |
| `src/index.html` | Freelancer melihat "Akses Dibatasi" + auto-redirect ke dashboard dalam 3 detik |
| `chat.html` | Tidak ada role check; user manapun bisa chat |

---

## 3. Service Management Flow

### 3.1 Create Service (Freelancer)

#### File yang Terlibat
- `src/freelancer-dashboard.html`
- `src/js/dashboardFreelancer.js` — `bindUI()` handler form `add-service-form`

#### Fungsi yang Digunakan
- `supabase.from('services').insert()`
- `supabase.from('categories').select()` — untuk dropdown

#### Alur Data

```
[Freelancer] isi form (title, description, price, category, duration, image_url)
   ↓
[dashboardFreelancer] submit form
   ↓
[Object serviceData] {
  freelancer_id: Auth.currentUser.id,
  title, description, price, category_id,
  duration_days, images: [image_url], is_active: true
}
   ↓
[Supabase] INSERT services
   ↓
[loadServices()] refresh daftar service
   ↓
[Toast.success] 'Service ditambahkan'
```

#### Interaksi dengan Supabase

| Operasi | Tabel | Detail |
|---|---|---|
| `INSERT` | `services` | Tambah service baru dengan `freelancer_id` otomatis = user.id |
| `SELECT *` | `services` | Refresh list setelah insert |
| `SELECT *` | `categories` | Load untuk dropdown |

#### Diagram

```
┌────────────────┐    form submit    ┌────────────────────────┐
│  Freelancer    │ ────────────────► │  dashboardFreelancer   │
└────────────────┘                   │  .bindUI()             │
                                     └────────────┬───────────┘
                                                  │ build serviceData
                                                  ▼
                                     ┌────────────────────────┐
                                     │  INSERT services       │
                                     └────────────┬───────────┘
                                                  │
                                                  ▼
                                     ┌────────────────────────┐
                                     │  loadServices()        │
                                     │  → SELECT services     │
                                     └────────────┬───────────┘
                                                  │
                                                  ▼
                                     ┌────────────────────────┐
                                     │  Render service list   │
                                     │  + Toast success       │
                                     └────────────────────────┘
```

---

### 3.2 List & Filter Services (Customer)

#### File yang Terlibat
- `src/index.html` — Landing/Find Service page

#### Fungsi yang Digunakan
- `ServiceAPI.getServices(searchTerm, categoryId)` di `service.js`
- `ServiceAPI.getCategories()` di `service.js`

#### Alur Data

```
[Customer] buka /src/index.html
   ↓
[Navigation.setupFullPage()] init
   ↓
[Role check] jika freelancer → tampilkan "Akses Dibatasi"
   ↓ (jika customer/guest)
[ServiceAPI.getCategories()] → load dropdown kategori
   ↓
[Render UI] search input + filter kategori + grid kosong
   ↓
[loadServices()] dengan search/filter saat ini
   ↓
[ServiceAPI.getServices(searchTerm, categoryId)]
   ↓
[Supabase] SELECT services
   WHERE is_active = true
   [opsional AND category_id = ?]
   [opsional OR (title ILIKE, description ILIKE, ...)]
   JOIN categories(name), profiles(name, avatar_url, rating)
   ↓
[Render] daftar service cards
```

#### Interaksi dengan Supabase

| Operasi | Tabel | Detail |
|---|---|---|
| `SELECT *` | `categories` | `getCategories()` untuk filter |
| `SELECT` (with embed) | `services` + `categories!inner` + `profiles!inner` | `getServices()` dengan `is_active=true` filter |

#### Filter & Search

| Trigger | Aksi |
|---|---|
| Input search (debounce 400ms) | `currentSearchTerm = value` → reload |
| Change kategori | `currentCategoryId = value` → reload |
| Klik "Order Now" (logged-in) | redirect ke `/src/dashboard.html?service=<id>` |
| Klik "Order Now" (guest) | toast "Silakan login" → redirect ke `/src/login.html` |

---

### 3.3 Toggle Service Active/Inactive (Freelancer)

#### File yang Terlibat
- `src/js/dashboardFreelancer.js` — `loadServices()` handler `data-service-toggle`

#### Alur

```
[Freelancer] klik "Deactivate" / "Activate"
   ↓
[Compute next = !service.is_active]
   ↓
[Supabase] UPDATE services SET is_active = next WHERE id = serviceId
   ↓
[loadServices()] refresh
```

### 3.4 Edit Service (Freelancer)

#### Alur

```
[Freelancer] klik "Edit"
   ↓
[prompt()] untuk title → prompt() untuk price
   ↓
[Supabase] UPDATE services SET title=?, price=? WHERE id=?
   ↓
[loadServices()] refresh
```

### 3.5 Delete Service (Freelancer)

#### Alur

```
[Freelancer] klik "Delete"
   ↓
[confirm()] "Delete this service?"
   ↓ (OK)
[Supabase] DELETE FROM services WHERE id = serviceId
   ↓
[loadServices()] refresh
```

---

## 4. Booking Flow

### 4.1 Place Booking (Create Order)

#### File yang Terlibat
- `src/index.html` — handleBooking() trigger
- `src/js/service.js` — `ServiceAPI.bookService()`

#### Fungsi yang Digunakan
- `ServiceAPI.bookService(serviceId, date, client)` di `service.js`

#### Alur Data

```
[Customer] klik "Order Now" pada service card
   ↓
[index.html] window.handleBooking(id)
   ↓ (jika logged in)
[Redirect] /src/dashboard.html?service=<id>
   ↓
[ServiceAPI.bookService(serviceId, date, notes)]
   ↓
[Supabase] SELECT services WHERE id = serviceId → dapat price & freelancer_id
   ↓
[Supabase] INSERT orders {
  service_id, customer_id, freelancer_id,
  total_price, status: 'pending', notes
}
   ↓
[Trigger] trg_notify_order_created → INSERT notifications untuk freelancer
   ↓
[Return] { data: order, error }
```

> **Catatan:** Implementasi `bookService` saat ini di-trigger via `index.html` → redirect ke `dashboard.html?service=...`, namun `dashboard.html` tidak membaca query param `service` untuk memicu booking otomatis. Booking sebenarnya terjadi ketika user menggunakan path ini (legacy); di versi modern, dashboard customer hanya menampilkan order, bukan form booking baru.

#### Interaksi dengan Supabase

| Operasi | Tabel | Detail |
|---|---|---|
| `SELECT` | `services` | Ambil `price` & `freelancer_id` |
| `INSERT` | `orders` | Order baru dengan `status='pending'` |
| `INSERT` (via trigger) | `notifications` | Otomatis ke freelancer |

#### Diagram

```
┌──────────┐  klik "Order Now"   ┌────────────┐
│ Customer │ ──────────────────► │ index.html │
└──────────┘                     └─────┬──────┘
                                      │ handleBooking()
                                      ▼
                          ┌────────────────────────┐
                          │ service.js             │
                          │ bookService()          │
                          └────────┬───────────────┘
                                   │
                                   ▼
                          ┌────────────────────────┐
                          │ SELECT services        │
                          │ (price, freelancer_id) │
                          └────────┬───────────────┘
                                   │
                                   ▼
                          ┌────────────────────────┐
                          │ INSERT orders          │
                          │ status='pending'       │
                          └────────┬───────────────┘
                                   │ trigger
                                   ▼
                          ┌────────────────────────┐
                          │ INSERT notifications   │
                          │ → freelancer_id        │
                          └────────────────────────┘
```

---

### 4.2 View Bookings (Legacy — booking.js)

#### File yang Terlibat
- `src/js/booking.js` (modul legacy)
- `src/dashboard.html` (sebelumnya)

#### Fungsi yang Digunakan
- `Booking.loadBookings()` — SELECT orders + profiles
- `Booking.renderBookings()` — render HTML list
- `Booking.updateStatus()` — UPDATE status
- `Booking.init()` — start polling

#### Alur Data

```
[Init] Booking.init() dipanggil
   ↓
[loadBookings()] SELECT orders WHERE customer_id=me OR freelancer_id=me
   JOIN services(title), profiles(*)
   ↓
[renderBookings()] render list
   ↓
[setInterval 5000] render ulang setiap 5 detik (polling fallback)
```

> Catatan: subscription realtime `orders` di `booking.js` dikomentari.

#### Interaksi dengan Supabase
| Operasi | Tabel | Detail |
|---|---|---|
| `SELECT` | `orders` (embed services, profiles) | List semua order user |
| `UPDATE` | `orders` | Update status (legacy) |

---

## 5. Order Flow

### 5.1 Customer View Orders

#### File yang Terlibat
- `src/customer-dashboard.html`
- `src/js/dashboardCustomer.js` — `loadOrders()`, `loadStats()`, `showOrderDetail()`

#### Fungsi yang Digunakan
- `supabase.from('orders').select('*', { count, head })`
- `supabase.from('orders').select('status')`
- `supabase.from('orders').select(embed)`
- `OrderUtils.statusToMeta(status)` di `orderUtils.js`

#### Alur Data

```
[Customer] buka /src/customer-dashboard.html
   ↓
[Navigation.setupForLoggedInPage('dashboard')]
   ↓
[CustomerDashboard.init()]
   ↓
[renderShell()] render UI cards (stats, orders, detail, notifications)
   ↓
[refreshAll()] paralel: loadStats, loadOrders, refreshNotifications
   ↓
[loadStats()]
  - SELECT count orders WHERE customer_id = me
  - SELECT orders.status WHERE status in [accepted, in_progress, revision]
  - SELECT count orders WHERE status='completed'
  - SELECT freelancer_id dari orders customer
  - Hitung distinct freelancer
   ↓
[loadOrders()]
  - SELECT orders (embed services(title), freelancer:profiles(name), customer:profiles(name))
  - WHERE customer_id = me
  - ORDER BY created_at DESC
   ↓
[Render] daftar order cards dengan status badge
   ↓
[showOrderDetail(orderId)]
  - SELECT order detail via OrderUtils.getOrderDetail()
  - Render project progress via renderCustomerProgress()
  - Render review area via renderReviewArea()
```

#### Interaksi dengan Supabase

| Operasi | Tabel | Detail |
|---|---|---|
| `SELECT` (count) | `orders` | Total orders |
| `SELECT` (status) | `orders` | Filter active vs finished |
| `SELECT` (embed) | `orders` + `services` + `profiles` | List order lengkap |
| `SELECT` | `project_progress` | Progress per order |
| `SELECT` (maybeSingle) | `reviews` | Cek existing review |
| `INSERT` | `reviews` | Submit review baru |
| Realtime subscribe | `project_progress` | Auto-refresh progress |
| Realtime subscribe | `notifications` | Auto-refresh notifikasi |

#### Diagram

```
┌──────────────────┐   page load   ┌──────────────────────┐
│ Customer         │ ────────────► │ customer-dashboard   │
└──────────────────┘               └──────────┬───────────┘
                                              │ CustomerDashboard.init()
                                              ▼
                                  ┌──────────────────────┐
                                  │ renderShell()        │
                                  └──────────┬───────────┘
                                              │
                                              ▼
                              ┌──────────────────────────────┐
                              │ refreshAll() (paralel)      │
                              │  ┌─ loadStats()             │
                              │  ├─ loadOrders()            │
                              │  └─ refreshNotifications() │
                              └──────────────────────────────┘
                                              │
                                              ▼
                              ┌──────────────────────────────┐
                              │ SELECT orders (count, status)│
                              │ SELECT orders (embed)        │
                              └──────────────────────────────┘
                                              │
                                              ▼
                              ┌──────────────────────────────┐
                              │ Render cards + status badge  │
                              └──────────────────────────────┘
```

---

### 5.2 Freelancer View & Manage Orders

#### File yang Terlibat
- `src/freelancer-dashboard.html`
- `src/js/dashboardFreelancer.js` — `loadOrders()`, `loadStats()`, action handlers

#### Fungsi yang Digunakan
- `supabase.from('orders').select()` (embed)
- Action handlers: `data-accept`, `data-reject`, `data-update-status`, `data-complete`, `data-chat`

#### Alur Data

```
[Freelancer] buka /src/freelancer-dashboard.html
   ↓
[FreelancerDashboard.init()] (auth check, role check)
   ↓
[Load categories] SELECT categories
   ↓
[renderShell()] render UI (form add service, list services, list orders, progress, portfolio)
   ↓
[bindUI()] bind form handlers
   ↓
[refresh] paralel: loadStats, loadServices, loadOrders, loadPortfolio
   ↓
[loadStats()]
  - count orders WHERE freelancer_id = me
  - pending orders (status='pending')
  - active orders (status in [accepted, in_progress, revision])
  - completed orders (count, total_price sum) → totalRevenue
  - SELECT reviews WHERE reviewed_id = me → rating avg
   ↓
[loadOrders()]
  - SELECT orders (embed services(title), customer:profiles(name))
  - WHERE freelancer_id = me
   ↓
[Render] order cards dengan action buttons
   ↓
[User clicks] Accept / Reject / Update Status / Mark Completed / Chat
   ↓
[Handler] UPDATE orders SET status = ?
   ↓
[Trigger] trg_notify_order_status_changed → push notifikasi ke customer
   ↓
[loadOrders()] refresh
```

#### Action Handlers (Order Status)

| Action | Tombol | Status Update | Trigger Notifikasi |
|---|---|---|---|
| Accept | `data-accept` | `pending` → `accepted` | "Order Accepted" ke customer |
| Reject | `data-reject` | `pending` → `cancelled` | "Order Cancelled" ke customer |
| Update Status | `data-update-status` | prompt → `in_progress` / `revision` | "In Progress" / "Revision Requested" |
| Mark Completed | `data-complete` | → `completed` | "Order Completed" ke customer |
| Chat | `data-chat` | redirect ke `/src/chat.html?orderId=<id>` | — |

#### Interaksi dengan Supabase

| Operasi | Tabel | Detail |
|---|---|---|
| `SELECT` (count) | `orders` | Statistik |
| `SELECT` (embed) | `orders` + `services` + `profiles` | List order |
| `UPDATE` | `orders` | Update status |
| `SELECT` | `reviews` | Rating stats |
| `SELECT` | `categories` | Dropdown options |
| Realtime subscribe | `orders` (filter: `freelancer_id`) | Auto-refresh order list |
| Realtime subscribe | `project_progress` | Auto-refresh progress |
| Realtime subscribe | `notifications` | Placeholder (no UI panel) |

#### Status Flow Diagram

```
                ┌──────────┐
                │ pending  │ ◄──── INSERT order (bookService)
                └────┬─────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ accepted │  │cancelled │  │ accepted │
  └────┬─────┘  └──────────┘  └────┬─────┘
       │                           │
       ▼                           ▼
  ┌──────────────┐         ┌──────────────┐
  │ in_progress  │ ◄──┐    │ in_progress  │
  └────┬─────────┘    │    └────┬─────────┘
       │              │         │
   ┌───┴────┐         │         │
   ▼        ▼         │         ▼
┌──────┐ ┌──────┐     │    ┌──────────┐
│revision│ │cancelled│  │    │cancelled │
└───┬──┘ └──────┘     │    └──────────┘
    │                 │
    └──────┐          │
           ▼          │
      ┌──────────┐    │
      │completed │ ◄──┘
      └──────────┘
```

---

### 5.3 Order Detail (Customer)

#### Fungsi yang Digunakan
- `OrderUtils.getOrderDetail(orderId)` di `orderUtils.js`

#### Alur

```
[Customer] klik order card atau tombol "Detail"
   ↓
[showOrderDetail(orderId)]
   ↓
[OrderUtils.getOrderDetail] SELECT orders (embed services, customer:profiles, freelancer:profiles)
   ↓
[Render detail panel] service title, freelancer, harga, status, tanggal, notes
   ↓
[renderCustomerProgress(orderId)]
  - SELECT project_progress WHERE order_id = ?
  - Render progress bar + checklist
   ↓
[renderReviewArea(order)]
  - Jika status !== 'completed' → tampilkan "Review available after order is completed"
  - Cek existing review (SELECT reviews WHERE order_id, reviewer_id)
  - Jika belum ada → render form review
```

#### Interaksi dengan Supabase

| Operasi | Tabel | Detail |
|---|---|---|
| `SELECT` (embed) | `orders` + `services` + `profiles` x2 | Order detail |
| `SELECT` | `project_progress` | Progress items |
| `SELECT` (maybeSingle) | `reviews` | Cek existing review |
| `INSERT` | `reviews` | Submit review |

---

### 5.4 Review Submission

#### File yang Terlibat
- `src/js/dashboardCustomer.js` — `renderReviewArea()`

#### Alur

```
[Customer] pada order berstatus 'completed'
   ↓
[Form review] rating (1-5) + comment
   ↓
[Submit] INSERT reviews {
  order_id, reviewer_id, reviewed_id,
  rating, comment
}
   ↓
[Trigger] trg_notify_review_created → notifikasi ke reviewed_id
   ↓
[showOrderDetail()] refresh (tampilkan "Thanks! Your review has been submitted.")
```

#### Business Rules
- Review **hanya tersedia** jika `order.status === 'completed'`.
- Cek `existing review` via `maybeSingle()` untuk mencegah double-submit (tidak ada unique constraint di DB).
- Setelah submit, `showOrderDetail()` dipanggil ulang untuk refresh UI.

---

## 6. Chat Flow

### 6.1 Inisialisasi Chat

#### File yang Terlibat
- `src/chat.html`
- `src/js/chat.js` — `Chat.init()`, `loadMessages()`, `setupRealtime()`

#### Mode Chat

NimTask memiliki **2 mode chat**:
1. **Direct Chat** — User memasukkan `recipient_id` secara manual.
2. **Order-Scoped Chat** — Chat dikaitkan dengan `order_id` tertentu.

#### Alur Data — Direct Chat

```
[User] buka /src/chat.html
   ↓
[Chat.init(recipientId, 'chat-messages')]
   ↓
[supabase.auth.getUser()] → set currentUserId
   ↓
[loadMessages()]
  - SELECT messages WHERE
    (sender_id=me AND receiver_id=recipient)
    OR (sender_id=recipient AND receiver_id=me)
    AND order_id IS NULL
  - JOIN sender:profiles(name, avatar_url)
  - JOIN receiver:profiles(name)
   ↓
[renderMessages()] render bubble chat
   ↓
[setupRealtime()] subscribe messages table
```

#### Alur Data — Order-Scoped Chat

```
[User] klik "Chat" pada order card di dashboard
   ↓
[redirect] /src/chat.html?orderId=<uuid>
   ↓
[chat.html] baca query param 'orderId'
   ↓
[Chat.init(currentUserId, 'chat-messages', { order_id: orderId })]
   ↓
[loadMessages()]
  - SELECT messages WHERE order_id = ?
  - JOIN sender/receiver profile
   ↓
[Render]
```

#### Interaksi dengan Supabase

| Operasi | Tabel/Service | Detail |
|---|---|---|
| `SELECT` (embed) | `messages` + `profiles` x2 | Load messages |
| `INSERT` | `messages` | Kirim pesan baru |
| `INSERT` (via trigger) | `notifications` | Receiver dapat notif |
| Realtime subscribe | `messages` | Listen semua event |
| Storage upload | `chat-attachments` | Upload lampiran |

---

### 6.2 Send Message

#### Alur

```
[User] ketik di #chat-input
   ↓ (Enter atau klik Send)
[chat.html] window.sendMessage()
   ↓
[Opsional] file dipilih → upload via Chat.uploadFile()
   ↓
[INSERT messages] {
  sender_id: currentUser.id,
  receiver_id: currentRecipient,
  content, file_url, order_id
}
   ↓
[Trigger] trg_notify_message_created → INSERT notifications untuk receiver
   ↓
[loadMessages()] refresh (via realtime)
```

#### Upload File (`chat.js` uploadFile())

```
[File] dipilih via #file-input
   ↓
[Validasi] size <= 10MB; type = image/*|pdf|doc|docx
   ↓
[Path] chat-attachments/<timestamp>-<userId>-<uuid>.<ext>
   ↓
[Supabase Storage] upload (upsert: true)
   ↓
[getPublicUrl()] → publicUrl
   ↓
[Return] publicUrl (disimpan di messages.file_url)
```

#### Diagram

```
┌──────────┐  type msg   ┌────────────┐
│  User    │ ──────────► │  chat.html │
└──────────┘             └─────┬──────┘
                                │ sendMessage()
                                ▼
                   ┌────────────────────────┐
                   │ (opsional) uploadFile()│
                   │ → storage bucket       │
                   └────────┬───────────────┘
                            │
                            ▼
                   ┌────────────────────────┐
                   │ INSERT messages        │
                   │ sender_id, receiver_id │
                   │ content, file_url      │
                   └────────┬───────────────┘
                            │ trigger
                            ▼
                   ┌────────────────────────┐
                   │ INSERT notifications   │
                   │ → receiver_id          │
                   └────────────────────────┘
```

---

### 6.3 Realtime Message Updates

```
[Supabase Realtime] channel: 'messages'
   ↓ (postgres_changes event='*' table='messages')
[chat.js] callback → loadMessages() → re-render
```

> Filter tidak diterapkan pada subscription; semua event diterima lalu di-filter di query.

---

## 7. Notification Flow

### 7.1 Trigger-Generated Notifications

File: `supabase-schema.sql`

#### Sumber Trigger

| Trigger | Tabel Source | Event | Penerima | Title |
|---|---|---|---|---|
| `trg_notify_order_created` | `orders` | AFTER INSERT | `freelancer_id` | "Order Received" |
| `trg_notify_order_status_changed` | `orders` | AFTER UPDATE status | `customer_id` (+ `freelancer_id` jika cancel) | "Order Accepted" / "In Progress" / "Revision Requested" / "Completed" / "Cancelled" |
| `trg_notify_message_created` | `messages` | AFTER INSERT | `receiver_id` | "New Message" |
| `trg_notify_review_created` | `reviews` | AFTER INSERT | `reviewed_id` | "New Review" |

#### Alur

```
[User/Trigger] terjadi event (insert order, update status, insert message, insert review)
   ↓
[Trigger function] memanggil push_notification(target_user_id, title, message)
   ↓
[push_notification()] SECURITY DEFINER → INSERT notifications(user_id, title, message)
   ↓
[Supabase Realtime] payload ke channel notifications_<userId>
```

---

### 7.2 Load Notifications

#### File yang Terlibat
- `src/js/notifications.js` — `Notifications.loadForUser()`
- `src/js/dashboardCustomer.js` — `refreshNotifications()`

#### Alur

```
[Customer/Freelancer] buka dashboard
   ↓
[refreshNotifications()] → Notifications.loadForUser(userId)
   ↓
[Supabase] SELECT notifications WHERE user_id = me
  ORDER BY created_at DESC
  LIMIT 50
   ↓
[renderList()] render list dengan class is-unread / is-read
```

#### Interaksi dengan Supabase

| Operasi | Tabel | Detail |
|---|---|---|
| `SELECT` | `notifications` | List 50 notif terbaru |
| `UPDATE` | `notifications` | Mark as read |
| Realtime subscribe | `notifications` (filter: `user_id=eq.<uid>`) | Auto-refresh |

---

### 7.3 Mark Notification as Read

#### Alur

```
[User] klik notification item
   ↓
[setupClickHandlers()] → Notifications.markRead(id)
   ↓
[Supabase] UPDATE notifications SET is_read = true WHERE id = ?
   ↓
[Update class] is-unread → is-read
```

#### Mark All Read

```
[Customer] klik "Mark all read"
   ↓
[Notifications.markAllRead(userId)]
   ↓
[Supabase] UPDATE notifications SET is_read = true
  WHERE user_id = me AND is_read = false
   ↓
[refreshNotifications()] reload
```

---

### 7.4 Realtime Notification Updates

```
[Trigger di DB] INSERT notifications
   ↓
[Realtime] channel: notifications_<userId>
   ↓
[Notifications.subscribe()] callback onUpdate
   ↓
[Customer Dashboard] refreshNotifications() → re-render list
[Freelancer Dashboard] callback placeholder (tidak ada UI panel)
```

#### Diagram

```
┌──────────────────┐
│ DB Event (INSERT)│
│  orders/messages │
│  /reviews        │
└────────┬────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Trigger function    │
              │  push_notification() │
              └────────┬─────────────┘
                       │
                       ▼
              ┌──────────────────────┐
              │ INSERT notifications │
              └────────┬─────────────┘
                       │
                       ▼
              ┌──────────────────────┐
              │ Realtime payload     │
              │ channel:             │
              │ notifications_<uid>  │
              └────────┬─────────────┘
                       │
                       ▼
              ┌──────────────────────┐
              │ Notifications.subscribe│
              │ → onUpdate callback  │
              └────────┬─────────────┘
                       │
                       ▼
              ┌──────────────────────┐
              │ refreshNotifications()│
              │ → re-render list     │
              └──────────────────────┘
```

---

## 8. Dashboard Flow

### 8.1 Customer Dashboard



#### File yang Terlibat
- `src/customer-dashboard.html`
- `src/js/dashboardCustomer.js` — `CustomerDashboard.init()`

#### Fungsi yang Digunakan
- `CustomerDashboard.init()` — orchestrator
- `CustomerDashboard.renderShell()` — render UI
- `CustomerDashboard.loadStats()` — 4 query paralel
- `CustomerDashboard.loadOrders()` — list order
- `CustomerDashboard.showOrderDetail(orderId)` — detail panel
- `CustomerDashboard.renderCustomerProgress(orderId)`
- `CustomerDashboard.renderReviewArea(order)`
- `CustomerDashboard.refreshNotifications()`
- `CustomerDashboard.setupRealtime()`

#### Komponen UI yang Dirender

| Section | ID Container | Fungsi Loader |
|---|---|---|
| Stats | `#customer-stats` | `loadStats()` |
| Orders Grid | `#customer-orders-grid` | `loadOrders()` |
| Order Detail | `#order-detail` | `showOrderDetail()` |
| Review Area | `#review-area` | `renderReviewArea()` |
| Notifications | `#customer-notifications-list` | `refreshNotifications()` |

#### Alur Lengkap

```
[Page Load] customer-dashboard.html
   ↓
[Navigation.setupForLoggedInPage('dashboard')]
   ↓
[CustomerDashboard.init()]
   ↓ (jika belum login → renderNotLoggedIn, return)
[renderShell()] → render template HTML statis
   ↓
[refreshAll()] paralel:
  ├─ loadStats()       → 4 query count
  ├─ loadOrders()      → 1 query list
  └─ refreshNotifications() → 1 query + render
   ↓
[loadOrders] auto-select order pertama → showOrderDetail()
   ↓
[setupRealtime()]
  ├─ Notifications.subscribe() → refreshNotifications on change
  └─ Realtime.subscribeTable('project_progress') → renderCustomerProgress
   ↓
[User Interactions]
  - Klik order card → showOrderDetail
  - Klik "Chat" → redirect /src/chat.html?orderId=...
  - Klik "Mark all read" → markAllRead
  - Klik notification → markRead + visual update
```

#### Realtime Subscriptions

| Channel | Tabel | Filter | Aksi |
|---|---|---|---|
| `notifications_<userId>` | `notifications` | `user_id=eq.<userId>` | refresh panel |
| `project_progress_customer_<userId>` | `project_progress` | none | re-render progress order aktif |

---

### 8.2 Freelancer Dashboard

#### File yang Terlibat
- `src/freelancer-dashboard.html`
- `src/js/dashboardFreelancer.js` — `FreelancerDashboard.init()`

#### Fungsi yang Digunakan
- `FreelancerDashboard.init()` — orchestrator
- `FreelancerDashboard.renderShell()` — render UI
- `FreelancerDashboard.bindUI()` — bind form handlers
- `FreelancerDashboard.loadStats()` — statistik
- `FreelancerDashboard.loadServices()` — CRUD service
- `FreelancerDashboard.loadOrders()` — order list
- `FreelancerDashboard.loadPortfolio()` — portfolio CRUD
- `FreelancerDashboard.selectOrder(orderId)` — pilih order
- `FreelancerDashboard.renderProgress(orderId)` — checklist progress
- `FreelancerDashboard.setupRealtime()`

#### Komponen UI yang Dirender

| Section | ID Container | Fungsi Loader |
|---|---|---|
| Stats | `#freelancer-stats` | `loadStats()` |
| Add Service Form | `#add-service-form` | `bindUI()` submit |
| Services List | `#services-list` | `loadServices()` |
| Orders Grid | `#freelancer-orders-grid` | `loadOrders()` |
| Progress Container | `#progress-container` | `selectOrder()` |
| Add Portfolio Form | `#add-portfolio-form` | `bindUI()` submit |
| Portfolio Grid | `#portfolio-grid` | `loadPortfolio()` |

#### Alur Lengkap

```
[Page Load] freelancer-dashboard.html
   ↓
[Navigation.setupForLoggedInPage('dashboard')]
   ↓
[FreelancerDashboard.init()]
   ↓
[Auth.init()]; [Role check] jika bukan freelancer → renderAccessDenied
   ↓
[Load categories] SELECT categories
   ↓
[renderShell()] render template HTML
   ↓
[Populate category dropdown] dari categories
   ↓
[bindUI()] bind form submit (add service, add portfolio)
   ↓
[refresh paralel]
  ├─ loadStats()
  ├─ loadServices()
  ├─ loadOrders()
  └─ loadPortfolio()
   ↓
[loadOrders] auto-select order pertama → selectOrder()
   ↓
[setupRealtime()]
  ├─ Notifications.subscribe() → placeholder callback
  ├─ Realtime.subscribeTable('orders', filter:freelancer_id) → loadOrders
  └─ Realtime.subscribeTable('project_progress') → renderProgress
   ↓
[User Interactions]
  - Form "Tambah Jasa" → INSERT services
  - Tombol "Deactivate/Activate" → UPDATE is_active
  - Tombol "Edit" → prompt + UPDATE title/price
  - Tombol "Delete" → confirm + DELETE
  - Order Accept/Reject/Update/Complete → UPDATE status
  - Tombol "Chat" → redirect chat.html
  - "Add Portfolio" → INSERT portfolio
  - Portfolio Edit/Delete → UPDATE/DELETE portfolio
  - "Add Progress" → INSERT project_progress
  - "Mark Done" pada progress → UPDATE completed=true
```

#### Realtime Subscriptions

| Channel | Tabel | Filter | Aksi |
|---|---|---|---|
| `freelancer_orders_<userId>` | `orders` | `freelancer_id=eq.<userId>` | `loadOrders()` |
| `freelancer_progress_<userId>` | `project_progress` | none | `renderProgress(activeOrderId)` |
| `notifications_<userId>` | `notifications` | `user_id=eq.<userId>` | placeholder (tidak ada UI) |

---

### 8.3 Income Page (Freelancer)

#### File yang Terlibat
- `src/freelancer-income.html`
- `src/js/income.js` — `Income.renderIncome()`

#### Fungsi yang Digunakan
- `Income.renderIncome()` — 4 query aggregasi

#### Alur

```
[Freelancer] buka /src/freelancer-income.html
   ↓
[Navigation.setupForLoggedInPage('earnings')]
   ↓
[Income.renderIncome()]
   ↓
[getIncomeStats()] — 4 query:
  1. SELECT total_price WHERE status='completed' (total)
  2. SELECT total_price WHERE status='completed' AND created_at >= startOfMonth (monthly)
  3. SELECT total_price WHERE status='completed' AND created_at >= startOfYear (yearly)
  4. SELECT count orders WHERE status='completed' (count)
   ↓
[Reduce di client] sum total_price dari hasil query
   ↓
[Render stats] di #income-total, #income-month, #income-year, #income-completed-orders
```

#### Interaksi dengan Supabase

| Operasi | Tabel | Detail |
|---|---|---|
| `SELECT` | `orders` | 4 query aggregasi (total/bulanan/tahunan/count) |

> Tidak ada realtime subscription atau filter pagination. Semua data di-load sekaligus.

---

### 8.4 Profile Page

#### File yang Terlibat
- `src/profile.html`
- `src/js/profile.js` — `Profile.getCurrent()`, `Profile.update()`, `Profile.getServicesCount()`, `Profile.getRating()`

#### Fungsi yang Digunakan
- `Profile.getCurrent()` — SELECT profiles WHERE id = me
- `Profile.getServicesCount(userId)` — count services aktif (untuk freelancer)
- `Profile.getRating(userId)` — RPC `get_user_rating`
- `Profile.update({ name })` — UPDATE profiles

#### Alur

```
[User] buka /src/profile.html
   ↓
[Navigation.setupForLoggedInPage('profile')]
   ↓
[renderProfile()]
   ↓
[Profile.getCurrent()] → SELECT profiles
   ↓
[Render] role, email
   ↓ (jika freelancer)
[Profile.getServicesCount()] → SELECT count services WHERE is_active=true
[Profile.getRating()] → supabase.rpc('get_user_rating', { user_id })
   ↓
[Render] Active Services, Average Rating
   ↓
[User klik "Edit Profile"] → window.editProfile()
   ↓
[prompt("New name:")] → Profile.update({ name })
   ↓
[Supabase] UPDATE profiles SET name = ?
   ↓
[renderProfile()] refresh
```

#### Interaksi dengan Supabase

| Operasi | Tabel/Fungsi | Detail |
|---|---|---|
| `SELECT` | `profiles` | Get current user profile |
| `SELECT` (count) | `services` | Count active services (freelancer) |
| `RPC` | `get_user_rating` | Get avg rating (commented SQL, harus manual create) |
| `UPDATE` | `profiles` | Update name |

#### Business Rules
- Dashboard link di profile page berubah sesuai role:
  - freelancer → "Freelancer Dashboard"
  - customer → "Customer Dashboard"
- Edit profile hanya memungkinkan perubahan **name** (via `prompt()`).
- `getRating()` fallback ke "No reviews" jika RPC gagal.

---

### 8.5 Dashboard Init Orchestrator — Diagram

```
                ┌──────────────────────┐
                │   Page Load (.html)  │
                └──────────┬───────────┘
                           │
                ┌──────────▼───────────┐
                │ Navigation.setupFor  │
                │ LoggedInPage()       │
                └──────────┬───────────┘
                           │
                ┌──────────▼───────────┐
                │  Auth.init()         │
                │  → restoreFromCache  │
                │  → getSession()      │
                │  → onAuthStateChange │
                └──────────┬───────────┘
                           │
                ┌──────────▼───────────┐
                │ currentUser set?     │
                └─────┬──────────┬─────┘
                No    │          │   Yes
        ┌──────────────▼─┐    ┌──▼────────────────┐
        │ Redirect to    │    │ Dashboard.init()  │
        │ login.html     │    │ (role-specific)   │
        └────────────────┘    └────────┬──────────┘
                                       │
                          ┌────────────▼────────────┐
                          │ Role check + renderShell│
                          └────────────┬────────────┘
                                       │
                          ┌────────────▼────────────┐
                          │ Parallel data load      │
                          │  loadStats              │
                          │  loadOrders / Services  │
                          │  loadNotifications      │
                          └────────────┬────────────┘
                                       │
                          ┌────────────▼────────────┐
                          │ Realtime subscriptions  │
                          │  notifications          │
                          │  project_progress       │
                          │  orders (freelancer)    │
                          └─────────────────────────┘
```

---

## 9. Recent Activity (Activity Log)

### Tujuan
- Menampilkan riwayat aktivitas terbaru pengguna (max 20) di dashboard.

### File yang Terlibat
- Customer: `src/js/dashboardCustomer.js`
- Freelancer: `src/js/dashboardFreelancer.js`
- Modul logika: `src/js/activity.js`

### Alur Data
```
[User membuka dashboard]
   ↓
[CustomerDashboard/FreelancerDashboard.init()]
   ↓
[Activity.getRecent(Auth.currentUser.id)]
   ↓
SELECT * FROM activity_logs
WHERE user_id = <uid>
ORDER BY created_at DESC
LIMIT 20
   ↓
UI render daftar Recent Activity
- action dipetakan ke teks tampilan
- waktu ditampilkan dari created_at
```

---

## Lampiran: Pemetaan File & Fungsi


### Tabel Pemetaan

| Flow | File HTML | File JS | Fungsi Utama |
|---|---|---|---|
| Auth Signup | `signup.html` | `auth.js` | `Auth.signup()` |
| Auth Login | `login.html` | `auth.js` | `Auth.login()` |
| Auth Logout | (any logged-in) | `auth.js`, `navigation.js` | `Auth.logout()` |
| Session | (any) | `auth.js` | `Auth.init()` |
| Service List | `index.html` | `service.js` | `ServiceAPI.getServices()` |
| Service CRUD | `freelancer-dashboard.html` | `dashboardFreelancer.js` | `bindUI()`, `loadServices()` |
| Booking | `index.html` (legacy) | `service.js` | `ServiceAPI.bookService()` |
| Order View (Customer) | `customer-dashboard.html` | `dashboardCustomer.js` | `loadOrders()`, `showOrderDetail()` |
| Order Manage (Freelancer) | `freelancer-dashboard.html` | `dashboardFreelancer.js` | `loadOrders()` + handlers |
| Review | `customer-dashboard.html` | `dashboardCustomer.js` | `renderReviewArea()` |
| Chat Init | `chat.html` | `chat.js` | `Chat.init()` |
| Chat Send | `chat.html` | `chat.js`, `chat.html` | `sendMessage()` |
| Notification | (any dashboard) | `notifications.js`, `dashboardCustomer.js` | `Notifications.loadForUser()` |
| Customer Dashboard | `customer-dashboard.html` | `dashboardCustomer.js` | `CustomerDashboard.init()` |
| Freelancer Dashboard | `freelancer-dashboard.html` | `dashboardFreelancer.js` | `FreelancerDashboard.init()` |
| Income | `freelancer-income.html` | `income.js` | `Income.renderIncome()` |
| Profile | `profile.html` | `profile.js` | `Profile.getCurrent()` |

---

Dokumentasi ini melengkapi `docs/project-overview.md` (struktur & fondasi) dan `docs/database-documentation.md` (skema & backend). Ketiga dokumen bersama-sama memberikan gambaran lengkap aplikasi NimTask.
