# NimTask — HTML Reference

Dokumentasi referensi untuk semua file HTML di NimTask. Setiap entry mencakup struktur, dependencies CSS/JS, dan hooks yang digunakan oleh modul JavaScript.

> **Cakupan:** File `*.html` di `src/` dan `index.html` (root).

---

## Daftar Isi

1. [Ringkasan](#1-ringkasan)
2. [Entry Point](#2-entry-point)
3. [Halaman Publik](#3-halaman-publik)
4. [Halaman Autentikasi](#4-halaman-autentikasi)
5. [Halaman Customer](#5-halaman-customer)
6. [Halaman Freelancer](#6-halaman-freelancer)
7. [Halaman Generik](#7-halaman-generik)
8. [Konvensi](#8-konvensi)

---

## 1. Ringkasan

Total file HTML: **11 file** (1 root + 10 di `src/`).

| # | File | Kategori | Vite Entry | Tujuan |
|---|---|---|---|---|
| 1 | `index.html` (root) | Entry | — | Iframe shell ke `src/index.html` |
| 2 | `src/main.js` (JS) | Entry | `main` | Minimal entry untuk Vite (console.log) |
| 3 | `src/index.html` | Publik | `main` | Landing / Find Service page |
| 4 | `src/home.html` | Publik | — | Redirect logic (orphan) |
| 5 | `src/login.html` | Auth | `login` | Halaman login |
| 6 | `src/signup.html` | Auth | `signup` | Halaman registrasi |
| 7 | `src/dashboard.html` | Generik | `dashboard` | Route ke role-specific dashboard |
| 8 | `src/customer-dashboard.html` | Customer | — | Dashboard customer |
| 9 | `src/freelancer-dashboard.html` | Freelancer | — | Dashboard freelancer |
| 10 | `src/freelancer-income.html` | Freelancer | — | Income/statistik freelancer |
| 11 | `src/profile.html` | Generik | `profile` | Profile user |
| 12 | `src/chat.html` | Generik | `chat` | Chat realtime |

---

## 2. Entry Point

### 2.1 `index.html` (root)

- **Path:** `./index.html`
- **Tujuan:** Shell loader yang memuat `src/index.html` via iframe
- **Karakteristik:**
  - Single `<iframe>` dengan style `100vw × 100vh`, no border
  - Favicon: `/favicon.svg` (dari `public/`)
  - Title: `freelance`
- **Catatan:** Memicu satu request GET ke `/src/index.html` saat halaman dibuka.

```html
<iframe src="/src/index.html" style="width:100vw; height:100vh; border:none;"></iframe>
```

---

## 3. Halaman Publik

### 3.1 `src/index.html` — Landing / Find Service

- **Vite Entry:** `main`
- **Auth Required:** Tidak (publik)
- **Body Class:** `no-sidebar`
- **Imports JS:** `Auth`, `Navigation`, `ServiceAPI`, `Toast`
- **CSS:** `style.css`, `navigation.css` + inline (find-service specific)

**Layout:**
- `<div id="navbar-placeholder">` — filled by `Navigation.renderNavbar()`
- `<div id="sidebar-container">` — empty untuk publik
- `<main id="main-content">` — search & filter service grid

**State Internal (inline):**
- `isLoggedIn` (boolean)
- `currentUserRole`
- `allCategories`
- `searchTimeout`
- `currentSearchTerm`
- `currentCategoryId`

**Hooks / Functions Penting:**
- `Navigation.setupFullPage()` — init navbar
- `ServiceAPI.getCategories()` — load dropdown
- `ServiceAPI.getServices(searchTerm, categoryId)` — list services
- `debounce(fn, 400)` — debounce search input
- `renderFreelancerRestriction()` — tampilkan "Akses Dibatasi" + auto-redirect 3 detik
- `renderFindServicePage()` — render UI
- `loadServices()` — query & render cards
- `window.handleBooking(id)` — global: redirect login atau ke dashboard
- `window.viewServiceDetail(id)` — global: view detail (saat ini redirect ke dashboard)

**Service Card Structure:**
```html
<div class="service-card-modern">
  <div class="service-card-body">
    <div class="service-card-title">${s.title}</div>
    <div class="service-card-description">...</div>
    <div class="service-card-meta">
      <span class="freelancer-name">${freelancerName}</span>
      <span class="category-badge">${categoryName}</span>
      <span class="rating-stars">⭐ ${rating}</span>
      <span>${durationDays} hari</span>
    </div>
    <div class="price-tag">Rp ${price}</div>
    <div class="service-card-actions">
      <button onclick="viewServiceDetail('${id}')">View Detail</button>
      <button onclick="handleBooking('${id}')">Order Now / Login to Order</button>
    </div>
  </div>
</div>
```

### 3.2 `src/home.html` — Redirect Page (Orphan)

- **Vite Entry:** Tidak (tidak masuk `vite.config.js`)
- **Auth Required:** Tidak
- **Body Class:** `no-sidebar`
- **Tujuan:** Redirect logic (tidak pernah di-link di nav, tapi ada di file system)
- **Imports JS:** `Auth`, `Navigation`

**Logika:**
- Jika `Auth.currentUser` ada → redirect ke role-specific dashboard.
- Jika belum login → redirect ke `/src/index.html`.

> **Catatan:** File ini di-flag sebagai **orphan** di `code-reference.md` (REF-06). Pertimbangkan untuk dihapus atau diintegrasikan.

---

## 4. Halaman Autentikasi

### 4.1 `src/login.html` — Login Page

- **Vite Entry:** `login`
- **Auth Required:** Tidak (anonymous)
- **Body Class:** `no-sidebar`
- **CSS:** `style.css`, `navigation.css` + inline auth styling
- **Imports JS:** `Auth`, `Navigation`

**Layout:**
- Single auth card centered di viewport
- Form: email + password
- Toggle password visibility
- Error message box

**Form IDs:**
- `#login-form`, `#email`, `#password`
- `#email-error`, `#password-error`
- `#message` (success/error info box)
- `#login-btn` (submit)
- `#toggle-pw-btn` (show/hide password)

**Hooks:**
- `Navigation.setupFullPage()` — render navbar
- `Auth.login(email, password)` — submit handler
- Validasi client-side: email valid, password min 6 char
- Redirect: freelancer → `/src/freelancer-dashboard.html`; customer → `/src/customer-dashboard.html`

**Error Handling:**
- `result.error.message` → tampilkan di `#message`
- `setTimeout(1200)` sebelum redirect

### 4.2 `src/signup.html` — Sign Up Page

- **Vite Entry:** `signup`
- **Auth Required:** Tidak
- **Body Class:** `no-sidebar`
- **CSS:** Sama dengan login
- **Imports JS:** `Auth`, `Navigation`

**Form Fields:**
- `#signup-name` (min 2 char)
- `#signup-email` (valid email)
- `#signup-password` (min 6 char)
- Role selector: `.role-option[data-role="customer|freelancer"]`
  - Default: `customer`
  - State: `selectedRole`

**Hooks:**
- `Navigation.setupFullPage()`
- `Auth.signup(email, password, name, selectedRole)`
- Validasi + role selection via click handler
- Redirect: sama dengan login (berdasarkan `selectedRole`)
- `setTimeout(1500)` sebelum redirect

**Role Selector CSS Class:**
- Default: `.role-option`
- Selected: `.role-option.selected`

---

## 5. Halaman Customer

### 5.1 `src/customer-dashboard.html` — Customer Dashboard

- **Vite Entry:** Tidak
- **Auth Required:** Ya (customer)
- **Body Class:** `sidebar-page`
- **CSS:** `style.css`, `navigation.css`, `dashboard.css`
- **Imports JS:** `Auth`, `Navigation`, `CustomerDashboard`

**Layout:**
- `<div id="navbar-placeholder">` — Navbar (filled by Navigation)
- `<div id="sidebar-container">` — Sidebar (filled by Navigation)
- `<main class="sidebar-main">`
  - `<div id="breadcrumb-area">` — Breadcrumb
  - `<div id="initial-loading">Loading...</div>` — Initial loading state
  - `<div id="dashboard-content">` — Main content (rendered by JS)

**Hooks:**
- `await Navigation.setupForLoggedInPage('dashboard')`
- `Navigation.renderBreadcrumb('breadcrumb-area')`
- `await CustomerDashboard.init()` — orchestrator

**Containers (rendered by `CustomerDashboard.renderShell()`):**
- `#dashboard-content` (outer)
- `#customer-stats` (4 stat cards)
- `#customer-orders-grid` (order cards)
- `#orders-empty` (empty state)
- `#orders-count` (counter)
- `#order-detail` (detail panel)
- `#customer-progress-{orderId}` (per-order progress)
- `#review-area` (review form/section)
- `#customer-notifications-list` (notifications)
- `#mark-all-read-btn` (mark all notifications read)

**Tombol Action (di render order card):**
- `[data-action="detail"]` — show order detail
- `[data-action="chat"]` — redirect ke chat
- `.order-card` (click) — show order detail

---

## 6. Halaman Freelancer

### 6.1 `src/freelancer-dashboard.html` — Freelancer Dashboard

- **Vite Entry:** Tidak
- **Auth Required:** Ya (freelancer)
- **Body Class:** `sidebar-page`
- **CSS:** `style.css`, `navigation.css`, `dashboard.css`
- **Imports JS:** `Auth`, `Navigation`, `FreelancerDashboard` (dynamic import)

**Layout:**
- Sama dengan customer dashboard, plus service management & portfolio sections.

**Hooks:**
- `await Navigation.setupForLoggedInPage('dashboard')`
- `Navigation.renderBreadcrumb('breadcrumb-area')`
- `await FreelancerDashboard.init()` (via dynamic import)

**Containers:**
- `#freelancer-stats` (5 stat cards)
- `#add-service-form` (form tambah service)
  - `#service-title`, `#service-desc`, `#service-price`, `#service-category`, `#service-duration`, `#service-thumbnail`
- `#services-list` (list service)
- `#freelancer-orders-grid` (order list)
- `#progress-container` (progress per order)
- `#add-progress-form`, `#progress-title` (form tambah progress)
- `#progress-list` (progress items)
- `#add-portfolio-form` (form tambah portfolio)
  - `#portfolio-title`, `#portfolio-desc`, `#portfolio-image`, `#portfolio-url`
- `#portfolio-grid` (portfolio list)

**Tombol Action:**
- `[data-service-toggle]` — activate/deactivate
- `[data-service-edit]` — edit title/price
- `[data-service-delete]` — delete
- `[data-accept]` — accept order
- `[data-reject]` — reject order
- `[data-update-status]` — update status
- `[data-complete]` — mark completed
- `[data-chat]` — redirect chat
- `[data-complete-progress]` — mark progress done
- `[data-edit-portfolio]` — edit portfolio
- `[data-delete-portfolio]` — delete portfolio

### 6.2 `src/freelancer-income.html` — Income Page

- **Vite Entry:** Tidak
- **Auth Required:** Ya (freelancer)
- **Body Class:** `sidebar-page`
- **CSS:** `style.css`, `navigation.css`, `dashboard.css`
- **Imports JS:** `Auth`, `Navigation`, `Income`

**Layout:**
- `<div id="breadcrumb-area">`
- `<div id="dashboard-content">` (with class `card`)
  - `<h1>Freelancer Income</h1>`
  - `<div id="income-loading">` (spinner)
  - `<div id="income-stats">` (4 stat cards)
    - `#income-total` (Total pendapatan)
    - `#income-month` (Pendapatan bulan ini)
    - `#income-year` (Pendapatan tahun ini)
    - `#income-completed-orders` (Jumlah order selesai)

**Hooks:**
- `Navigation.setupForLoggedInPage('earnings')`
- `Navigation.renderBreadcrumb('breadcrumb-area')`
- `await Income.renderIncome()` — orchestrator

**Login Required Check:**
```js
if (!Auth.currentUser?.id) {
  // render "Login required" message
} else {
  await Income.renderIncome();
}
```

---

## 7. Halaman Generik

### 7.1 `src/dashboard.html` — Dashboard Router

- **Vite Entry:** `dashboard`
- **Auth Required:** Ya
- **Body Class:** `sidebar-page`
- **CSS:** `style.css`, `navigation.css`, `dashboard.css`
- **Imports JS:** `Auth`, `Navigation`

**Tujuan:** Generic dashboard route yang redirect ke role-specific dashboard.

**Logika:**
1. `Navigation.setupFullPage()`
2. Jika belum login → tampilkan "Please login"
3. Jika login:
   - `role === 'freelancer'` → redirect ke `/src/freelancer-dashboard.html`
   - Lainnya → redirect ke `/src/customer-dashboard.html`

> **Catatan:** Halaman ini praktis hanya redirect; tidak menampilkan konten. Mungkin bisa dihapus atau dijadikan fallback.

### 7.2 `src/profile.html` — User Profile

- **Vite Entry:** `profile`
- **Auth Required:** Ya
- **Body Class:** `sidebar-page`
- **CSS:** `style.css`, `navigation.css`, `profile.css`
- **Imports JS:** `Auth`, `Navigation`, `Profile`

**Layout:**
- `<div id="breadcrumb-area">`
- `<div class="card fade-in">` — Main card
  - `<h1 id="profile-title">Profile</h1>`
  - `<div id="loading">` — Loading spinner
  - `<p id="profile-role">` — Role text
  - `<div class="profile-stats">` — Grid 4 stat cards
    - `#user-role` (Account Type)
    - `#user-email` (Email)
    - `#services-stat` (freelancer only)
      - `#services-count` (Active Services)
    - `#user-rating` (Average Rating)
  - `<div class="profile-actions">` — Buttons
    - `#dashboard-link` (Freelancer/Customer Dashboard)
    - `Edit Profile` button → `window.editProfile()`

**Hooks:**
- `Navigation.setupForLoggedInPage('profile')`
- `Navigation.renderBreadcrumb('breadcrumb-area')`
- `renderProfile()` — async function (local)
- `Profile.getCurrent()` — SELECT profiles
- `Profile.getServicesCount(userId)` — count services (freelancer)
- `Profile.getRating(userId)` — RPC get_user_rating
- `Profile.update({ name })` — update name
- `window.editProfile()` — global: prompt for new name

**Error Handling:**
- Catch error → render error card dengan link login

### 7.3 `src/chat.html` — Chat Page

- **Vite Entry:** `chat`
- **Auth Required:** Ya
- **Body Class:** `sidebar-page`
- **CSS:** `style.css`, `navigation.css`, `chat.css`
- **Imports JS:** `Auth`, `Chat`, `Navigation`

**Layout:**
- `<div class="card">`
  - `<div class="chat-header">`
    - `<h2 id="chat-partner">Direct Chat</h2>` (atau "Order Chat")
  - `<div id="chat-messages" class="chat-messages">`
    - Default: `<div class="no-chat">` dengan input `recipient-id` + tombol "Start Chat"
  - `<div class="chat-input-area">`
    - `<input type="file" id="file-input">` (hidden)
    - `<button class="attach-btn">+</button>` (trigger file input)
    - `<input type="text" id="chat-input">` (text message)
    - `<button id="send-btn">Send</button>`

**Hooks:**
- `await Navigation.setupForLoggedInPage('chat')`
- `Chat.init(recipientId, containerId, { order_id? })` — init chat module
- `Chat.uploadFile(file)` — upload file
- `Chat.loadMessages()` — load messages
- `Chat.sendMessage()` — send message
- `window.startChat()` — global: init direct chat
- `window.sendMessage()` — global: send direct chat (inline, BUG-09)

**Query Params:**
- `?orderId=<uuid>` → order-scoped chat
- (tanpa params) → direct chat (perlu input recipient manual, BUG-08)

**Mode Initialization:**

```js
// Direct chat mode
const orderId = getQueryParam('orderId');
if (orderId && Auth.currentUser) {
  Chat.init(Auth.currentUser.id, 'chat-messages', { order_id: orderId });
}
```

---

## 8. Konvensi

### 8.1 Body Classes

| Class | Halaman |
|---|---|
| `no-sidebar` | Halaman publik (login, signup, index, home) |
| `sidebar-page` | Halaman dengan sidebar (dashboard, profile, chat, income) |

### 8.2 CSS Files

| File | Halaman yang Pakai |
|---|---|
| `style.css` | Semua (wajib) |
| `navigation.css` | Semua (wajib untuk navbar/sidebar) |
| `dashboard.css` | Dashboard, income |
| `chat.css` | Chat |
| `profile.css` | Profile |
| (inline) | Auth (login, signup) |

### 8.3 JavaScript Import Pattern

Setiap halaman login-required mengikuti pattern:

```js
import { Auth } from './js/auth.js';
import { Navigation } from './js/navigation.js';
import { /* page-specific module */ } from './js/*.js';

await Navigation.setupForLoggedInPage('page-key');
Navigation.renderBreadcrumb('breadcrumb-area');

// Initialize page-specific module
const dash = CustomerDashboard;
await dash.init();
```

Halaman publik menggunakan:

```js
import { Auth } from './js/auth.js';
import { Navigation } from './js/navigation.js';

await Navigation.setupFullPage();
```

### 8.4 Container Placeholders

Setiap halaman yang menggunakan Navigation harus memiliki placeholder:

```html
<div id="navbar-placeholder"></div>
<div id="sidebar-container"></div>
```

- `navbar-placeholder` di-fill dengan navbar oleh `Navigation.renderNavbar()`.
- `sidebar-container` di-fill dengan sidebar oleh `Navigation.renderSidebar()` (saat login) atau kosong (saat publik).

### 8.5 Error State Pattern

Pattern standar untuk error rendering:

```js
try {
  await renderContent();
} catch (err) {
  container.innerHTML = `
    <div class="card">
      <h2>Error</h2>
      <p>${err.message}</p>
      <a href="/src/login.html">Login</a>
    </div>
  `;
}
```

### 8.6 Global Functions Convention

Fungsi yang dipanggil via inline `onclick=""` di HTML harus dipasang di `window`:

```js
window.handleBooking = (id) => { /* ... */ };
window.sendMessage = async () => { /* ... */ };
window.startChat = () => { /* ... */ };
window.editProfile = async () => { /* ... */ };
```

> **Catatan:** Pola ini membuat coupling tinggi antara HTML dan JS. Pertimbangkan untuk menggunakan `addEventListener` dengan `data-*` attributes sebagai gantinya (sebagian sudah dipakai di dashboard modules).

### 8.7 Title Convention

| Page | Title |
|---|---|
| Index | `NimTask - Find Freelancers & Services` |
| Login | `Login - NimTask` |
| Signup | `Sign Up - NimTask` |
| Dashboard router | `Dashboard - NimTask` |
| Customer Dashboard | `Customer Dashboard - Companion Rent` (legacy title) |
| Freelancer Dashboard | `Freelancer Dashboard - Companion Rent` (legacy title) |
| Income | `Freelancer Income - Companion Rent` (legacy title) |
| Profile | `Profile - NimTask` |
| Chat | `Chat - NimTask` |
| Home | `NimTask - Home` |

> **Catatan:** Title "Companion Rent" adalah legacy dari project name sebelumnya. Pertimbangkan untuk diseragamkan.

### 8.8 Favicon Convention

Semua halaman menggunakan favicon yang sama:

```html
<link rel="icon" type="image/svg+xml" href="/src/assets/favicon.svg">
```

> **Inkonsistensi:** Root `index.html` menggunakan `/favicon.svg` (dari `public/`), bukan `/src/assets/favicon.svg`. Lihat `code-reference.md` untuk detail.

---

## Penutup

Dokumen ini melengkapi dokumentasi NimTask untuk layer HTML. Untuk layer lain, lihat:

- **`docs/project-overview.md`** — Fondasi teknis.
- **`docs/database-documentation.md`** — Skema & backend.
- **`docs/application-flow.md`** — Fitur & business process.
- **`docs/code-reference.md`** — Source code JS reference.
- **`docs/styling-guide.md`** — CSS classes & design system.
- **`docs/deployment-guide.md`** — Build, env, deploy.

Total dokumentasi: 6 file saling melengkapi untuk codebase coverage 100%.
