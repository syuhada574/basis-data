# NimTask — Styling Guide (CSS Reference)

Dokumentasi referensi untuk sistem styling NimTask. Mencakup design tokens, CSS classes, layout patterns, dan komponen UI.

> **Cakupan:** 5 file CSS di `src/css/` + inline styling di HTML.

---

## Daftar Isi

1. [Ringkasan](#1-ringkasan)
2. [Design Tokens](#2-design-tokens)
3. [File CSS](#3-file-css)
4. [Komponen](#4-komponen)
5. [Layout Patterns](#5-layout-patterns)
6. [Status Badges](#6-status-badges)
7. [Responsive Breakpoints](#7-responsive-breakpoints)
8. [Inkonsistensi & Catatan](#8-inkonsistensi--catatan)

---

## 1. Ringkasan

| File | Tanggung Jawab | Lines |
|---|---|---|
| `style.css` | Global styles, base, container, navbar base, button, form | ~123 |
| `navigation.css` | Navbar, sidebar, badges, breadcrumb, hamburger, skeleton | ~519 |
| `dashboard.css` | Dashboard cards, stats, orders, progress, portfolio, notifications | ~636 |
| `chat.css` | Chat container, messages, input area | ~95 |
| `profile.css` | Profile stat card, fade-in animation | ~41 |

**Total: ~1,414 baris CSS.**

---

## 2. Design Tokens

### 2.1 Color Palette

#### Primary Colors
| Token | Hex | Penggunaan |
|---|---|---|
| `--primary-indigo` | `#4f46e5` | Tombol primer, link aktif, brand |
| `--primary-hover` | `#3730a3` | Hover primary |
| `--primary-light` | `#eef2ff` | Background notifikasi unread |
| `--primary-dark` | `#1e1b4b` | Sidebar background, brand-dark |

#### Gradient
| Token | Value | Penggunaan |
|---|---|---|
| `--gradient-primary` | `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` | Body background, stat-card, sidebar avatar, progress bar |
| `--gradient-progress` | `linear-gradient(90deg, #667eea, #764ba2)` | Progress bar fill |

#### Semantic Colors
| Token | Hex | Penggunaan |
|---|---|---|
| `--success` | `#10b981` | Success toast, success button submit, badge completed |
| `--success-bg` | `#d1fae5` | Background badge completed |
| `--success-text` | `#065f46` | Text badge completed |
| `--error` | `#ef4444` | Error toast, danger button, badge cancelled |
| `--error-bg` | `#fee2e2` | Background badge cancelled |
| `--error-text` | `#991b1b` | Text badge cancelled |
| `--warning-bg` | `#fef3c7` | Background badge pending |
| `--warning-text` | `#92400e` | Text badge pending |
| `--info` | `#3b82f6` | Info toast, badge in-progress |
| `--info-bg` | `#dbeafe` | Background badge accepted |
| `--info-text` | `#1e40af` | Text badge accepted |

#### Neutral Colors
| Token | Hex | Penggunaan |
|---|---|---|
| `--bg-page` | `linear-gradient(135deg, #667eea, #764ba2)` | Body background |
| `--bg-card` | `white` | Card, dashboard panel |
| `--bg-subtle` | `#f9fafb` | Service form, review area |
| `--bg-chat` | `#f0f2f5` | Chat background |
| `--text-primary` | `#1e1b4b` | Headings |
| `--text-secondary` | `#374151` | Body text, labels |
| `--text-muted` | `#6b7280` | Helper text, descriptions |
| `--text-faint` | `#9ca3af` | Muted, time stamps |
| `--border-default` | `#e5e7eb` | Card border, input border |
| `--border-strong` | `#d1d5db` | Form input border, dividers |

### 2.2 Typography

| Style | Value | Penggunaan |
|---|---|---|
| `--font-family` | `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif` | Body |
| `--font-weight-normal` | `400` | Body |
| `--font-weight-medium` | `500` | Nav item, label, sidebar item |
| `--font-weight-semibold` | `600` | Label form, button, sidebar active |
| `--font-weight-bold` | `700` | Heading, button submit, sidebar header |
| `--font-weight-extrabold` | `800` | Stat value, price tag |

| Size | Value | Penggunaan |
|---|---|---|
| `text-xs` | `0.7rem` | Badge |
| `text-sm` | `0.8rem` | Helper, time stamp, badge text |
| `text-base` | `0.9-0.95rem` | Body, form input |
| `text-md` | `1rem` | Order title, button |
| `text-lg` | `1.1-1.25rem` | H2, stat-card |
| `text-xl` | `1.5-1.75rem` | H1 dashboard, stat value |
| `text-2xl` | `2rem` | H1, price tag |

### 2.3 Spacing & Sizing

| Token | Value | Penggunaan |
|---|---|---|
| `--space-xs` | `0.25rem` | Tight margin |
| `--space-sm` | `0.5rem` | Margin, gap |
| `--space-md` | `0.75-1rem` | Standard padding |
| `--space-lg` | `1.25-1.5rem` | Section padding |
| `--space-xl` | `2rem` | Card padding |
| `--space-2xl` | `2.5-3rem` | Modal padding |
| `--radius-sm` | `6-8px` | Button, input |
| `--radius-md` | `10-12px` | Card, form input |
| `--radius-lg` | `14-16px` | Dashboard card |
| `--radius-pill` | `20-25px` | Badge, chat input |
| `--radius-circle` | `50%` | Avatar |

### 2.4 Shadow

| Token | Value | Penggunaan |
|---|---|---|
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.04)` | Card default |
| `--shadow-md` | `0 4px 15px rgba(0,0,0,0.1)` | Stat card, hover |
| `--shadow-lg` | `0 4px 20px rgba(0,0,0,0.08)` | Service card, dashboard card |
| `--shadow-xl` | `0 10px 30px rgba(0,0,0,0.2)` | Auth card |
| `--shadow-primary` | `0 4px 15px rgba(102,126,234,0.3)` | Stat card gradient |
| `--shadow-primary-hover` | `0 8px 25px rgba(102,126,234,0.4)` | Stat card hover |

---

## 3. File CSS

### 3.1 `style.css` — Global Base

**Lokasi:** `src/css/style.css`

**Sections:**
1. **Reset** (`*`) — `margin: 0; padding: 0; box-sizing: border-box;`
2. **Body** — font, line-height, gradient background
3. **Container** — max-width 1200px, margin auto
4. **Header/Navbar** (base structure) — sticky top, z-index 100
5. **Card** — white bg, 15px radius, padding 2rem, shadow xl
6. **Form** — `form-group` margin, label, input/select/button
7. **Button** — primary indigo, 8px radius, hover darker
8. **Fade-in** — opacity 0 → 1 transition
9. **Success** — green block
10. **Media Query** — mobile: smaller container, vertical navbar

**Class Utama:**

| Class | Fungsi |
|---|---|
| `.container` | Max-width 1200px wrapper |
| `.card` | White elevated card |
| `.form-group` | Vertical form spacing |
| `.form-group label` | Block label, weight 600 |
| `input`, `select`, `button` | Default form controls |
| `button` | Primary indigo button |
| `button:hover` | Darker indigo |
| `.fade-in` | Auto fade-in animation |
| `.success` | Green success message box |
| `.success` (legacy) | Hmm conflict with `.success` from animation.js - need to check |

### 3.2 `navigation.css` — Navbar, Sidebar, UI Chrome

**Lokasi:** `src/css/navigation.css`

**Sections:**
1. **Navbar Items** (`.nav-item`) — flex, icon + label
2. **Navbar Active State** (`.nav-active`) — semi-transparent white
3. **Navbar Badges** (`.nav-badge`) — red dot untuk unread count
4. **Sidebar Avatar** (`.sidebar-avatar`) — gradient circle
5. **Sidebar Items** (`.sidebar-item`) — flex, left-border active
6. **Sidebar Active** (`.sidebar-item.active`) — green left-border, semi-transparent
7. **Sidebar Badges** (`.sidebar-badge`) — red dot
8. **Sidebar Header** — name + role
9. **Sidebar Footer** — logout button
10. **Sidebar Base** — fixed left, 250px width
11. **Sidebar Main** — `margin-left: 250px` untuk konten
12. **Breadcrumb** — flex with home icon + links
13. **Overlay** (mobile) — semi-transparent backdrop
14. **Hamburger** — mobile menu toggle
15. **Fade-in-page** — page transition
16. **Skeleton** — shimmer loading effect
17. **Loading Overlay** — spinner ring
18. **Responsive** — hide sidebar di mobile, show hamburger

**Class Utama:**

| Class | Fungsi |
|---|---|
| `.nav-item` | Navbar link |
| `.nav-active` | Active navbar link |
| `.nav-icon` | Icon container |
| `.nav-label` | Text label |
| `.nav-badge` | Red unread badge |
| `.sidebar` | Fixed sidebar container |
| `.sidebar-item` | Sidebar link |
| `.sidebar-item.active` | Active sidebar link |
| `.sidebar-avatar` | User avatar |
| `.sidebar-header` | User info section |
| `.sidebar-footer` | Logout button |
| `.sidebar-main` | Content area dengan margin-left |
| `.sidebar-page` | Body class untuk layout dengan sidebar |
| `.no-sidebar` | Body class untuk layout publik |
| `.breadcrumb` | Breadcrumb container |
| `.breadcrumb-link` | Clickable breadcrumb |
| `.breadcrumb-current` | Current page |
| `.breadcrumb-separator` | Slash separator |
| `.overlay` | Mobile backdrop |
| `.overlay.active` | Visible overlay |
| `.hamburger` | Mobile menu button |
| `.hamburger.active` | Open state |
| `.fade-in-page` | Page transition |
| `.fade-in-page.visible` | Visible after transition |
| `.skeleton` | Shimmer loading |
| `.skeleton-text` | Skeleton line |
| `.skeleton-title` | Skeleton heading |
| `.skeleton-card` | Skeleton card |
| `.skeleton-list-item` | Skeleton list |
| `.loading-overlay-custom` | Custom loading overlay |
| `.spinner-ring` | Spinning loader |

### 3.3 `dashboard.css` — Dashboard Components

**Lokasi:** `src/css/dashboard.css`

**Sections:**
1. **General Dashboard** — `.loading`, `.dashboard-title`, `.dashboard-section`, `.dashboard-card`
2. **Stats Grid** — `.stats-grid`, `.stat-card` (gradient bg, white text)
3. **Order Cards** — `.orders-grid`, `.order-card`
4. **Status Badges** — `.status-pending`, `.status-accepted`, `.status-in-progress`, `.status-revision`, `.status-completed`, `.status-cancelled`
5. **Buttons** — `.primary-btn`, `.ghost-btn`, `.danger-btn`, `.small-btn`, `button[type="submit"]`
6. **Forms** — `.form-group`, input, select, textarea
7. **Order Detail** — `.order-detail`, `.detail-row`, `.detail-label`, `.detail-value`
8. **Review Area** — `.review-area`, `.review-box`
9. **Notifications** — `.notifications-list`, `.notification-item.is-unread`, `.notification-item.is-read`
10. **Empty/Loading States** — `.empty-state`
11. **Progress** — `.progress-container`, `.progress-item`, `.progress-check`, `.progress-bar-bg`, `.progress-bar-fill`
12. **Portfolio** — `.portfolio-grid`, `.portfolio-card`, `.portfolio-image`, `.portfolio-body`
13. **Service Form/Cards** — `.service-form`, `.service-card img`
14. **Mutu text** — `.muted`
15. **Spinner animation** — `@keyframes spin`
16. **Responsive** — mobile breakpoints

### 3.4 `chat.css` — Chat Interface

**Lokasi:** `src/css/chat.css`

**Sections:**
1. **Container** — `.chat-container` (max-width 800px, full height)
2. **Header** — `.chat-header` (sky blue #075985)
3. **Messages** — `.chat-messages` (scrollable, gray bg)
4. **Message bubbles** — `.message`, `.message.sent` (right, blue), `.message.received` (left, white)
5. **Input area** — `.chat-input-area` (flex)
6. **Input/buttons** — `#chat-input` (rounded), `.attach-btn`, `#send-btn` (circle)
7. **File input** (hidden) — `#file-input { display: none }`
8. **No chat state** — `.no-chat`

### 3.5 `profile.css` — Profile Specific

**Lokasi:** `src/css/profile.css`

**Sections:**
1. **Spinner** — `@keyframes spin` (duplikat dari dashboard.css)
2. **Stat card** — `.stat-card` (variant dari dashboard)
3. **Fade-in animation** — `.fade-in`, `@keyframes fadeInUp`

> **Catatan:** Profile.css menduplikasi `@keyframes spin` dan `.stat-card` dari dashboard.css. Bisa di-konsolidasi.

---

## 4. Komponen

### 4.1 Card

```html
<div class="card">
  <h1>Judul</h1>
  <p>Konten</p>
</div>
```

- White background
- Border-radius: 15px (style.css) / 16px (dashboard.css)
- Padding: 2rem (style.css) / 1.5rem (dashboard.css)
- Shadow: `0 10px 30px rgba(0,0,0,0.2)` atau `0 4px 20px rgba(0,0,0,0.08)`
- Margin: `2rem 0`

**Varian:**
- `.card.dashboard-card` — lebih kecil padding (1.5rem)
- `.card` (style.css) — lebih besar (2rem)

### 4.2 Button

```html
<button class="primary-btn">Submit</button>
<button class="ghost-btn">Cancel</button>
<button class="danger-btn">Delete</button>
<button class="small-btn">View</button>
```

| Class | Background | Text | Padding | Use Case |
|---|---|---|---|---|
| `.primary-btn` | `#4f46e5` | white | `0.5rem 1rem` | Primary action (Accept) |
| `.ghost-btn` | transparent | `#4f46e5` | `0.5rem 1rem` | Secondary action |
| `.danger-btn` | `#ef4444` | white | `0.5rem 1rem` | Destructive (Delete) |
| `.small-btn` | `#f3f4f6` | `#374151` | `0.35rem 0.75rem` | Tertiary |
| `button[type="submit"]` | `#10b981` | white | `0.7rem 1.5rem` | Form submit |
| `button` (default) | `#4f46e5` | white | `0.75rem` | Auth form |

### 4.3 Form Input

```html
<div class="form-group">
  <label for="input">Label</label>
  <input type="text" id="input" />
</div>
```

- Padding: `0.7rem 0.85rem`
- Border: `1.5px solid #d1d5db`
- Border-radius: `10px`
- Focus: border `#667eea` + shadow ring

### 4.4 Stat Card (Dashboard)

```html
<div class="stat-card">
  <div class="stat-value">42</div>
  <div class="stat-label">Total Order</div>
</div>
```

- Gradient background (`#667eea` → `#764ba2`)
- White text
- Padding: `1.25rem`
- Border-radius: `14px`
- Stat value: `2rem extrabold`
- Stat label: `0.8rem medium opacity 0.85`
- Hover: `translateY(-3px)` + larger shadow

### 4.5 Order Card

```html
<div class="order-card">
  <div class="order-card-top">
    <div class="order-title">Service Title</div>
    <div class="status-badge status-pending">Pending</div>
  </div>
  <div class="order-card-body">
    <div class="muted">Freelancer</div>
    <div class="order-card-line">John Doe</div>
  </div>
  <div class="order-card-actions">
    <button class="primary-btn">Accept</button>
  </div>
</div>
```

- White bg, light border
- Border-radius: 14px
- Hover: `translateY(-2px)` + larger shadow
- Cursor: pointer (clickable)

### 4.6 Service Card (Landing Page)

```html
<div class="service-card-modern">
  <div class="service-card-body">
    <div class="service-card-title">Title</div>
    <div class="service-card-description">Desc</div>
    <div class="service-card-meta">
      <span class="freelancer-name">Name</span>
      <span class="category-badge">Category</span>
    </div>
    <div class="price-tag">Rp 100.000</div>
    <div class="service-card-actions">
      <button class="btn btn-outline-custom">View</button>
      <button class="btn btn-primary-custom">Order</button>
    </div>
  </div>
</div>
```

> **Catatan:** Class-class ini didefinisikan **inline** di `src/index.html`, BUKAN di file CSS terpisah. Lihat Inkonsistensi.

### 4.7 Progress Bar

```html
<div class="progress-bar-bg">
  <div class="progress-bar-fill" style="width: 75%;"></div>
</div>
```

- Background: `#e5e7eb`, height 8px, rounded
- Fill: gradient `linear-gradient(90deg, #667eea, #764ba2)`, height 8px, animated transition

### 4.8 Progress Item (Checklist)

```html
<div class="progress-item">
  <div class="progress-check progress-checked">✓</div>
  <div class="progress-content">
    <div class="progress-title">Task title</div>
    <div class="progress-meta">Time stamp</div>
  </div>
</div>
```

- Circle indicator (24px) di kiri
- Unchecked: border gray, transparent text
- Checked: green bg, white text, ✓ symbol

### 4.9 Notification Item

```html
<div class="notification-item is-unread">
  <div class="notification-title">Title</div>
  <div class="notification-message">Message</div>
  <div class="notification-time">2 hours ago</div>
</div>
```

- Unread: `bg #eef2ff`, left border indigo 3px
- Read: transparent bg, opacity 0.7

### 4.10 Toast

```js
Toast.success('Saved!');
Toast.error('Failed');
Toast.info('Please wait...');
```

- Auto-create `#toast-root` jika belum ada
- Position: fixed bottom-right
- Colors: green (success), red (error), blue (info)
- Auto-hide: 3 detik default
- Slide-up animation

### 4.11 Empty State

```html
<div class="empty-state">
  <h4>No data</h4>
  <p>There is nothing to show here.</p>
</div>
```

- Text-align center
- Padding 2.5rem 1.5rem
- Color muted

### 4.12 Loading

```html
<div class="loading">Loading...</div>
```

- Text-align center
- Padding 2rem
- Color muted

### 4.13 Skeleton (Loading Placeholder)

```html
<div class="skeleton-card"></div>
<div class="skeleton skeleton-title"></div>
<div class="skeleton skeleton-text"></div>
```

- Animated shimmer effect (background gradient sweep)
- 1.5s loop

---

## 5. Layout Patterns

### 5.1 Public Page (no-sidebar)

```html
<body class="no-sidebar">
  <div id="navbar-placeholder"></div>
  <div id="sidebar-container"></div>
  <main class="container">
    <!-- content -->
  </main>
</body>
```

- Navbar tampil
- Sidebar hidden (`margin-left: 0`)
- Container max-width 1200px

### 5.2 Authenticated Page (sidebar)

```html
<body class="sidebar-page">
  <div id="navbar-placeholder"></div>
  <div id="sidebar-container"></div>
  <main class="sidebar-main">
    <div class="container">
      <div id="breadcrumb-area"></div>
      <div id="dashboard-content"></div>
    </div>
  </main>
</body>
```

- Navbar tampil
- Sidebar tampil (fixed left, 250px)
- Main content `margin-left: 250px`
- Breadcrumb opsional

### 5.3 Dashboard Grid Layout

```html
<div class="dashboard-section">
  <div class="card dashboard-card">
    <div class="dashboard-section-header">
      <h2>Section Title</h2>
      <span class="muted">Meta</span>
    </div>
    <div class="content"></div>
  </div>
</div>
```

### 5.4 Stats Grid (Responsive Auto-fit)

```html
<div class="stats-grid">
  <div class="stat-card">...</div>
  <div class="stat-card">...</div>
</div>
```

- `grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))`
- Otomatis wrap di layar kecil

### 5.5 Orders Grid

```html
<div class="orders-grid">
  <div class="order-card">...</div>
  <div class="order-card">...</div>
</div>
```

- `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`
- Gap 1.25rem

### 5.6 Portfolio Grid

```html
<div class="portfolio-grid">
  <div class="portfolio-card">...</div>
</div>
```

- `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))`

---

## 6. Status Badges

CSS Class yang digunakan oleh `OrderUtils.statusToMeta()`:

| Status | Class | Background | Text |
|---|---|---|---|
| `pending` | `.status-pending` | `#fef3c7` | `#92400e` |
| `accepted` | `.status-accepted` | `#dbeafe` | `#1e40af` |
| `in_progress` | `.status-in-progress` | `#e0e7ff` | `#3730a3` |
| `revision` | `.status-revision` | `#fff7ed` | `#9a3412` |
| `completed` | `.status-completed` | `#d1fae5` | `#065f46` |
| `cancelled` | `.status-cancelled` | `#fee2e2` | `#991b1b` |

**Style dasar `.status-badge`:**
- Font-size: 0.7rem
- Font-weight: 700
- Padding: 0.25rem 0.65rem
- Border-radius: 20px (pill)
- Text-transform: uppercase
- Letter-spacing: 0.03em
- White-space: nowrap

**Varian `.status-pill`:**
- Slightly bigger padding
- Same colors via direct class

---

## 7. Responsive Breakpoints

| Breakpoint | Perubahan |
|---|---|
| `≤ 768px` | Navbar vertical, container smaller, stats grid 2 columns, sidebar hidden, hamburger show, orders grid 1 column, order actions column |
| `≤ 480px` | Stats grid 1x2, navbar items smaller, hamburger position adjusted |

**Mobile Nav Pattern:**
- Hamburger button di pojok kiri atas
- Sidebar slide dari kiri (`transform: translateX(-100%)` → `0`)
- Overlay semi-transparan di belakang sidebar
- `body.sidebar-page .sidebar-main { margin-left: 0 }` untuk full-width content

---

## 8. Inkonsistensi & Catatan

### 8.1 Service Card Styles Inline di `src/index.html`

CSS class untuk service card di landing page didefinisikan **inline** di HTML, bukan di file CSS:

- `.find-service-header`
- `.search-filter-bar`
- `.search-wrapper`, `.search-icon`
- `.filter-wrapper`
- `.services-grid` (di HTML, bukan di `dashboard.css`!)
- `.service-card-modern`, `.service-card-body`
- `.service-card-title`, `.service-card-description`, `.service-card-meta`
- `.service-card-meta-item`
- `.category-badge`
- `.freelancer-name`, `.rating-stars`, `.price-tag`
- `.service-card-actions`
- `.btn-primary-custom`, `.btn-outline-custom`
- `.restriction-banner`
- `.empty-state-find`
- `.loading-skeleton`

**Rekomendasi:** Ekstrak ke `src/css/landing.css` atau tambahkan ke `style.css`.

### 8.2 Duplikasi

| Class/Animation | Lokasi 1 | Lokasi 2 |
|---|---|---|
| `@keyframes spin` | `dashboard.css` | `profile.css`, `navigation.css` |
| `.stat-card` | `dashboard.css` (gradient) | `profile.css` (white) |
| `.fade-in` | `style.css` (transition) | `profile.css` (animation) |
| `.success` | `style.css` (green block) | — |
| `.skeleton` keyframes | `navigation.css` | — |

### 8.3 Definisi Beda

| Class | Lokasi A | Lokasi B | Catatan |
|---|---|---|---|
| `.stat-card` | `dashboard.css`: gradient bg, white text, 14px radius | `profile.css`: white bg, dark text, 12px radius | Berbeda total! |
| `.fade-in` | `style.css`: opacity 0 → 1 transition | `profile.css`: `fadeInUp` animation | Berbeda perilaku |
| `.card` | `style.css`: 15px radius, 2rem padding, 30px shadow | `dashboard.css` (`.dashboard-card`): 16px radius, 1.5rem padding, 20px shadow | Varian serupa |

### 8.4 CSS Variables (Tidak Digunakan)

Saat ini **tidak ada CSS custom properties (variables)**. Semua nilai di-hardcode. Refactor opportunity:

```css
:root {
  --primary: #4f46e5;
  --primary-hover: #3730a3;
  --primary-dark: #1e1b4b;
  --gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --success: #10b981;
  --error: #ef4444;
  /* ... */
}
```

### 8.5 CSS Preprocessor

**Tidak ada** preprocessor (SASS/LESS). CSS murni. Variabel & nesting manual.

### 8.6 Rekomendasi Improvement

1. **Tambah CSS variables** di `:root` untuk konsistensi.
2. **Konsolidasi `@keyframes spin`** ke satu file.
3. **Ekstrak inline style** dari HTML ke CSS file terpisah.
4. **Standarkan `.stat-card`** antara `dashboard.css` dan `profile.css`.
5. **Setup utility classes** (Tailwind-like) atau tetap pakai component classes.
6. **Hapus duplikasi** dengan class composition.

---

## Penutup

Dokumen ini melengkapi dokumentasi NimTask untuk layer styling. Untuk layer lain, lihat:

- **`docs/project-overview.md`** — Fondasi teknis.
- **`docs/database-documentation.md`** — Skema & backend.
- **`docs/application-flow.md`** — Fitur & business process.
- **`docs/code-reference.md`** — Source code JS reference.
- **`docs/html-reference.md`** — File HTML reference.
- **`docs/deployment-guide.md`** — Build, env, deploy.

**Total dokumentasi: 6 file saling melengkapi untuk codebase coverage 100%.**
