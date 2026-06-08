# NimTask — Code Reference (JavaScript Modules)

Dokumentasi referensi source code JavaScript untuk proyek NimTask. Tujuan dokumen ini adalah membantu developer baru atau AI assistant memahami codebase tanpa harus membaca seluruh source code terlebih dahulu.

> **Cakupan:** Modul-modul di `src/js/*.js`. Tidak ada perubahan kode — murni dokumentasi.

---

## Daftar Isi

1. [Ringkasan Modul](#1-ringkasan-modul)
2. [Referensi Modul](#2-referensi-modul)
   - [supabase.js](#21-supabasejs)
   - [auth.js](#22-authjs)
   - [service.js](#23-servicejs)
   - [booking.js](#24-bookingjs)
   - [profile.js](#25-profilejs)
   - [chat.js](#26-chatjs)
   - [realtime.js](#27-realtimejs)
   - [notifications.js](#28-notificationsjs)
   - [orderUtils.js](#29-orderutilsjs)
   - [dashboardCustomer.js](#210-dashboardcustomerjs)
   - [dashboardFreelancer.js](#211-dashboardfreelancerjs)
   - [income.js](#212-incomejs)
   - [navigation.js](#213-navigationjs)
   - [toast.js](#214-toastjs)
   - [animation.js](#215-animationjs)
3. [Dependency Graph](#3-dependency-graph)
4. [Known Issues](#4-known-issues)

---

## 1. Ringkasan Modul

| # | File | Tanggung Jawab | ES Module? |
|---|---|---|---|
| 1 | `supabase.js` | Inisialisasi client Supabase + helper | Ya |
| 2 | `auth.js` | Autentikasi & session management | Ya |
| 3 | `service.js` | CRUD service & categories | Ya |
| 4 | `booking.js` | Legacy booking/order list (polling) | Ya |
| 5 | `profile.js` | Profil user + rating | Ya |
| 6 | `chat.js` | Chat realtime + lampiran | Ya |
| 7 | `realtime.js` | Helper subscription realtime generik | Ya |
| 8 | `notifications.js` | List & mark-read notifikasi | Ya |
| 9 | `orderUtils.js` | Utilitas status, currency, detail order | Ya |
| 10 | `dashboardCustomer.js` | Orchestrator dashboard customer | Ya |
| 11 | `dashboardFreelancer.js` | Orchestrator dashboard freelancer | Ya |
| 12 | `income.js` | Statistik income freelancer | Ya |
| 13 | `navigation.js` | Navbar, sidebar, breadcrumbs, badges | Ya |
| 14 | `toast.js` | Notifikasi toast & loading helper | Ya |
| 15 | `animation.js` | Animasi fade-in/slide-down | Ya |

**Total: 15 modul ES Module.**

---

## 2. Referensi Modul

---

### 2.1 `supabase.js`

**Lokasi:** `src/js/supabase.js`

**Dependency:** `@supabase/supabase-js`, `import.meta.env`

#### Exports

| Export | Tipe | Deskripsi |
|---|---|---|
| `supabase` | `SupabaseClient` | Instance client Supabase (singleton) |
| `subscribe(channel, callback)` | `function` | Helper subscription realtime (legacy) |
| `getUserProfile(userId)` | `async function` | SELECT profil user |

#### `subscribe(channel, callback)`

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `channel` | `string` | — | Nama channel & nama tabel (digunakan dua-duanya) |
| `callback` | `function` | — | Handler untuk event `postgres_changes` |

**Return:** Channel object dari Supabase.

**Catatan:** Helper ini **tidak dipakai** di modul lain (helper yang tidak terpakai).

#### `getUserProfile(userId)`

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `userId` | `string` (UUID) | — | ID user |

**Return:** `Promise<{ data, error }>`

---

### 2.2 `auth.js`

**Lokasi:** `src/js/auth.js`

**Dependency:** `supabase.js`

#### Exports

| Export | Tipe | Deskripsi |
|---|---|---|
| `Auth` | `Object` | Namespace modul auth |

#### `Auth` — Properties

| Property | Tipe | Deskripsi |
|---|---|---|
| `currentUser` | `Object \| null` | User saat ini (cached). Gabungan dari `auth.users` + `profiles` |

#### `Auth.login(email, password)`

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `email` | `string` | — | Email user |
| `password` | `string` | — | Password user |

**Return:** `Promise<{ data?, error? }>`

**Side effects:**
- Memanggil `loadUserProfile(user)` jika login sukses.
- Menyimpan `authUser` ke `localStorage`.

#### `Auth.signup(email, password, name, role)`

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `email` | `string` | — | Email user |
| `password` | `string` | — | Password user |
| `name` | `string` | — | Nama lengkap |
| `role` | `'customer' \| 'freelancer'` | `'customer'` | Role user |

**Return:** `Promise<{ data?, error? }>`

**Alur internal:**
1. `supabase.auth.signUp({ email, password })`
2. Delay 1000 ms
3. `INSERT profiles` dengan `id = userData.user.id`
4. `loadUserProfile(user)`

#### `Auth.logout()`

**Return:** `Promise<void>`

**Side effects:**
- `supabase.auth.signOut()`
- Set `currentUser = null`
- `localStorage.removeItem('authUser')`
- Redirect ke `/src/index.html`

#### `Auth.loadUserProfile(user)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `user` | `User` (Supabase auth) | Object user dari `auth.getUser()` |

**Return:** `Promise<void>`

**Side effects:**
- SELECT profiles WHERE id = user.id.
- Merge `{ ...user, ...data }` → `currentUser`.
- Simpan ke `localStorage('authUser')`.

#### `Auth.restoreFromCache()`

**Return:** `void`

Membaca `localStorage('authUser')` dan set `currentUser` jika ada.

#### `Auth.init()`

**Return:** `Promise<void>`

**Alur:**
1. `restoreFromCache()`
2. `supabase.auth.getSession()` → jika ada session, `loadUserProfile()`
3. Pasang `onAuthStateChange` listener (`SIGNED_IN` → `loadUserProfile`; `SIGNED_OUT` → clear).

---

### 2.3 `service.js`

**Lokasi:** `src/js/service.js`

**Dependency:** `supabase.js`

#### Exports

| Export | Tipe | Deskripsi |
|---|---|---|
| `ServiceAPI` | `Object` | Namespace modul service |

#### `ServiceAPI.getServices(searchTerm, categoryId)`

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `searchTerm` | `string` | `''` | Kata kunci search |
| `categoryId` | `string \| null` | `null` | UUID kategori untuk filter |

**Return:** `Promise<Array>` (default `[]` jika error)

**Query:** `SELECT *, categories!inner(name), profiles!inner(name, avatar_url, rating) WHERE is_active = true`

**Filter opsional:**
- `categoryId`: `.eq('category_id', categoryId)`
- `searchTerm`: `.or('title.ilike.%term%,description.ilike.%term%,categories.name.ilike.%term%,profiles.name.ilike.%term%')`

**Order:** `created_at DESC`

#### `ServiceAPI.getFreelancerServices(freelancerId)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `freelancerId` | `string` (UUID) | ID freelancer |

**Return:** `Promise<{ data, error }>`

**Query:** `SELECT *, categories(name) WHERE freelancer_id = ?`

#### `ServiceAPI.getService(id)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `id` | `string` (UUID) | ID service |

**Return:** `Promise<{ data, error }>`

**Query:** `SELECT *, categories!inner(name), profiles!inner(name, avatar_url, rating) WHERE id = ?` (single)

#### `ServiceAPI.createService(serviceData)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `serviceData` | `Object` | `{ freelancer_id, title, description, price, category_id, duration_days, images, is_active }` |

**Return:** `Promise<{ data, error }>`

**Query:** `INSERT services` + `SELECT categories(name)`

#### `ServiceAPI.updateService(id, updates)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `id` | `string` (UUID) | ID service |
| `updates` | `Object` | Field yang akan di-update |

**Return:** `Promise<{ data, error }>`

#### `ServiceAPI.getCategories()`

**Return:** `Promise<Array>` (default `[]`)

**Query:** `SELECT * FROM categories ORDER BY name ASC`

#### `ServiceAPI.bookService(serviceId, date, client)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `serviceId` | `string` (UUID) | ID service |
| `date` | `string` | (tidak dipakai di query; mungkin untuk `deadline` di masa depan) |
| `client` | `string` | Notes/catatan dari customer |

**Return:** `Promise<{ data, error }>`

**Alur:**
1. SELECT services (price, freelancer_id) WHERE id = ?
2. INSERT orders dengan `status='pending'`, `total_price=service.price`, `notes=client`

---

### 2.4 `booking.js`

**Lokasi:** `src/js/booking.js`

**Dependency:** `supabase.js`, `service.js`

#### Exports

| Export | Tipe | Deskripsi |
|---|---|---|
| `Booking` | `Object` | Namespace legacy booking |

#### `Booking.loadBookings()`

**Return:** `Promise<Array>` (default `[]` jika error)

**Query:** `SELECT *, services(title), profiles(*) WHERE customer_id=me OR freelancer_id=me`

#### `Booking.renderBookings(containerId)`

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `containerId` | `string` | `'bookings-list'` | ID container HTML |

**Return:** `Promise<void>`

#### `Booking.updateStatus(orderId, status)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `orderId` | `string` (UUID) | ID order |
| `status` | `string` | Status baru |

**Return:** `Promise<void>`

#### `Booking.init()`

**Return:** `void`

**Alur:**
- Memanggil `renderBookings()`.
- `setInterval(() => this.renderBookings(), 5000)` — polling setiap 5 detik.
- Subscription realtime `orders` di-comment.

**Catatan:** Modul ini **legacy**; di dashboard modern (`customer-dashboard.html` / `freelancer-dashboard.html`) tidak dipakai.

---

### 2.5 `profile.js`

**Lokasi:** `src/js/profile.js`

**Dependency:** `supabase.js`

#### Exports

| Export | Tipe | Deskripsi |
|---|---|---|
| `Profile` | `Object` | Namespace modul profil |

#### `Profile.getCurrent()`

**Return:** `Promise<{ data, error }>`

**Query:** `SELECT * FROM profiles WHERE id = auth.uid()` (single)

#### `Profile.update(profileData)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `profileData` | `Object` | Field yang akan di-update (mis. `{ name }`) |

**Return:** `Promise<{ data, error }>`

#### `Profile.getServicesCount(freelancerId)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `freelancerId` | `string` (UUID) | ID freelancer |

**Return:** `Promise<{ count, error }>`

**Query:** `SELECT *, count:exact, head: true WHERE freelancer_id = ? AND is_active = true`

#### `Profile.getRating(userId)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `userId` | `string` (UUID) | ID user |

**Return:** `Promise<{ data, error }>`

**Query:** `supabase.rpc('get_user_rating', { user_id })`

**Catatan:** RPC harus dibuat manual di Supabase (lihat `docs/database-documentation.md` §5).

---

### 2.6 `chat.js`

**Lokasi:** `src/js/chat.js`

**Dependency:** `supabase.js`

#### Exports

| Export | Tipe | Deskripsi |
|---|---|---|
| `Chat` | `Object` | Namespace modul chat |
| `window.Chat` | `Object` | Global reference untuk handler inline |

#### Properties (state internal)

| Property | Tipe | Deskripsi |
|---|---|---|
| `currentChatId` | `string` | Recipient ID untuk direct chat |
| `currentOrderId` | `string \| null` | Order ID untuk order-scoped chat |
| `messagesContainer` | `HTMLElement \| null` | Container pesan |
| `inputEl` | `HTMLElement \| null` | Input pesan |
| `currentUserId` | `string` | ID user saat ini |

#### `Chat.init(chatId, containerId, options)`

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `chatId` | `string` | — | Recipient ID (untuk direct chat) |
| `containerId` | `string` | `'chat-messages'` | ID container pesan |
| `options` | `Object` | `{}` | Opsi. `options.order_id` untuk scoped chat |
| `options.order_id` | `string` | — | UUID order |

**Return:** `Promise<void>`

**Alur:**
1. `supabase.auth.getUser()` → set `currentUserId`.
2. Set `currentOrderId` dari `options`.
3. `loadMessages()`.
4. `setupRealtime()`.
5. Focus input.

#### `Chat.loadMessages()`

**Return:** `Promise<void>`

**Query:**
- **Direct chat:** `SELECT *, sender:profiles!sender_id(name,avatar_url), receiver:profiles!receiver_id(name) WHERE (sender_id=me AND receiver_id=other) OR (sender_id=other AND receiver_id=me) AND order_id IS NULL`
- **Order-scoped:** `... WHERE order_id = ?`

**Order:** `created_at ASC`

#### `Chat.renderMessages(messages)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `messages` | `Array` | Hasil query `loadMessages` |

**Return:** `void`

**Side effects:** Render HTML ke `messagesContainer`. Auto scroll ke bawah.

#### `Chat.sendMessage()`

**Return:** `Promise<void>`

**Alur:**
1. Baca `inputEl.value` dan `file-input.files[0]`.
2. (Opsional) Upload file via `uploadFile()`.
3. `INSERT messages { receiver_id, content, file_url, order_id }`.
4. Reset `inputEl`.

#### `Chat.uploadFile(file)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `file` | `File` | File yang akan di-upload |

**Return:** `Promise<string \| null>` (publicUrl atau `null` jika gagal)

**Validasi:**
- `file.size <= 10 * 1024 * 1024` (10MB).
- MIME type harus `image/*`, `application/pdf`, `application/msword`, atau `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.

**Path:** `chat-attachments/<timestamp>-<userId>-<uuid>.<ext>`

**Storage ops:** `upload()` + `getPublicUrl()` di bucket `chat-attachments`.

#### `Chat.setupRealtime()`

**Return:** `void`

Subscribe channel `'messages'` (event `*`) → callback `loadMessages()`.

---

### 2.7 `realtime.js`

**Lokasi:** `src/js/realtime.js`

**Dependency:** `supabase.js`

#### Exports

| Export | Tipe | Deskripsi |
|---|---|---|
| `Realtime` | `Object` | Namespace helper realtime |

#### `Realtime.subscribeTable({ channelName, schema, table, filter, event, onChange })`

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `channelName` | `string` | — | Nama channel |
| `schema` | `string` | `'public'` | Schema DB |
| `table` | `string` | — | Nama tabel |
| `filter` | `string \| null` | `null` | Filter postgres_changes (format: `column=eq.value`) |
| `event` | `string` | `'*'` | Event filter (`*`, `INSERT`, `UPDATE`, `DELETE`) |
| `onChange` | `function` | — | Callback handler |

**Return:** Channel object (Supabase Realtime).

**Pemakaian:** `dashboardCustomer.js`, `dashboardFreelancer.js`.

---

### 2.8 `notifications.js`

**Lokasi:** `src/js/notifications.js`

**Dependency:** `supabase.js`, `toast.js`

#### Exports

| Export | Tipe | Deskripsi |
|---|---|---|
| `Notifications` | `Object` | Namespace modul notifikasi |

#### `Notifications.loadForUser(userId)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `userId` | `string` (UUID) | ID user |

**Return:** `Promise<{ data, error }>`

**Query:** `SELECT * WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`

#### `Notifications.markRead(notificationId)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `notificationId` | `string` (UUID) | ID notifikasi |

**Return:** `Promise<{ error }>`

**Query:** `UPDATE notifications SET is_read = true WHERE id = ?`

#### `Notifications.markAllRead(userId)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `userId` | `string` (UUID) | ID user |

**Return:** `Promise<{ error }>`

**Query:** `UPDATE notifications SET is_read = true WHERE user_id = ? AND is_read = false`

#### `Notifications.subscribe(userId, onUpdate)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `userId` | `string` (UUID) | ID user |
| `onUpdate` | `function \| undefined` | Callback ketika ada perubahan |

**Return:** Channel object.

**Channel:** `notifications_<userId>`

**Filter:** `user_id=eq.<userId>`

#### `Notifications.renderList(containerEl, notifications)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `containerEl` | `HTMLElement` | Container list |
| `notifications` | `Array` | Data notifikasi |

**Return:** `void`

**Side effects:** Render HTML list ke container. Class `is-read` / `is-unread`.

#### `Notifications.setupClickHandlers(containerEl, onClick)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `containerEl` | `HTMLElement` | Container list |
| `onClick` | `function \| undefined` | Callback setelah `markRead` |

**Return:** `void`

**Side effects:** Pasang event listener click → `markRead(id)` + visual update.

---

### 2.9 `orderUtils.js`

**Lokasi:** `src/js/orderUtils.js`

**Dependency:** `supabase.js`

#### Exports

| Export | Tipe | Deskripsi |
|---|---|---|
| `OrderUtils` | `Object` | Namespace utilitas order |

#### `OrderUtils.statusToMeta(status)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `status` | `string` | Status order (`pending`, `accepted`, `in_progress`, `revision`, `completed`, `cancelled`) |

**Return:** `{ label: string, badgeClass: string }`

**Pemetaan:**

| Status | Label | badgeClass |
|---|---|---|
| `pending` | Pending | `status-pending` |
| `accepted` | Accepted | `status-accepted` |
| `in_progress` | In Progress | `status-in-progress` |
| `revision` | Revision | `status-revision` |
| `completed` | Completed | `status-completed` |
| `cancelled` | Cancelled | `status-cancelled` |
| (lain) | status | `''` |

#### `OrderUtils.formatCurrency(amount)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `amount` | `number` | Nilai numerik |

**Return:** `string` (format USD via `Intl.NumberFormat`)

**Fallback:** `$${amount}` jika `Intl` tidak tersedia.

#### `OrderUtils.getOrderDetail(orderId)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `orderId` | `string` (UUID) | ID order |

**Return:** `Promise<{ data, error }>`

**Query:** `SELECT *, services!orders_service_id_fkey(title), customer:profiles!orders_customer_id_fkey(name), freelancer:profiles!orders_freelancer_id_fkey(name) WHERE id = ?` (single)

---

### 2.10 `dashboardCustomer.js`

**Lokasi:** `src/js/dashboardCustomer.js`

**Dependency:** `supabase.js`, `auth.js`, `toast.js`, `orderUtils.js`, `notifications.js`, `realtime.js`, `chat.js`

#### Exports

| Export | Tipe | Deskripsi |
|---|---|---|
| `CustomerDashboard` | `Object` | Orchestrator dashboard customer |

#### State Internal

| Property | Tipe | Deskripsi |
|---|---|---|
| `els.content` | `HTMLElement \| null` | Container `#dashboard-content` |
| `els.stats` | `HTMLElement \| null` | `#customer-stats` |
| `els.ordersGrid` | `HTMLElement \| null` | `#customer-orders-grid` |
| `els.notificationsList` | `HTMLElement \| null` | `#customer-notifications-list` |
| `state.orders` | `Array` | Daftar order user |
| `state.selectedOrderId` | `string \| null` | Order yang sedang dipilih |
| `state.notifications` | `Array` | Daftar notifikasi |

#### Methods

| Method | Return | Deskripsi |
|---|---|---|
| `init()` | `Promise<void>` | Orchestrator utama |
| `renderNotLoggedIn()` | `void` | Render fallback jika belum login |
| `renderShell()` | `void` | Render template UI cards |
| `refreshAll()` | `Promise<void>` | Paralel: loadStats + loadOrders + refreshNotifications |
| `loadStats()` | `Promise<void>` | 4 query count + render 5 stat card |
| `loadOrders()` | `Promise<void>` | SELECT orders (embed) + render cards + auto-select first |
| `showOrderDetail(orderId)` | `Promise<void>` | Render detail panel + progress + review area |
| `renderCustomerProgress(orderId)` | `Promise<void>` | Render progress bar + checklist |
| `renderReviewArea(order)` | `Promise<void>` | Form review jika order completed |
| `refreshNotifications()` | `Promise<void>` | Load + render notifications |
| `setupRealtime()` | `void` | Subscribe notifications + project_progress |

#### Query di `loadStats()`

1. `SELECT count WHERE customer_id = me`
2. `SELECT status WHERE status in [accepted, in_progress, revision]`
3. `SELECT id WHERE status = 'completed'`
4. `SELECT freelancer_id WHERE neq null` (untuk hitung distinct)

#### Realtime Subscriptions

| Channel | Tabel | Filter | Aksi |
|---|---|---|---|
| `notifications_<userId>` | `notifications` | `user_id=eq.<uid>` | `refreshNotifications()` |
| `project_progress_customer_<userId>` | `project_progress` | none | `renderCustomerProgress(selectedOrderId)` |

---

### 2.11 `dashboardFreelancer.js`

**Lokasi:** `src/js/dashboardFreelancer.js`

**Dependency:** `supabase.js`, `auth.js`, `toast.js`, `orderUtils.js`, `chat.js`, `notifications.js`, `realtime.js`

#### Exports

| Export | Tipe | Deskripsi |
|---|---|---|
| `FreelancerDashboard` | `Object` | Orchestrator dashboard freelancer |

#### State Internal

| Property | Tipe | Deskripsi |
|---|---|---|
| `els.content` | `HTMLElement \| null` | `#dashboard-content` |
| `els.stats` | `HTMLElement \| null` | `#freelancer-stats` |
| `els.servicesList` | `HTMLElement \| null` | `#services-list` |
| `els.ordersGrid` | `HTMLElement \| null` | `#freelancer-orders-grid` |
| `els.progressList` | `HTMLElement \| null` | `#progress-container` |
| `els.portfolioGrid` | `HTMLElement \| null` | `#portfolio-grid` |
| `els.addServiceForm` | `HTMLFormElement \| null` | `#add-service-form` |
| `state.services` | `Array` | Daftar service freelancer |
| `state.orders` | `Array` | Daftar order freelancer |
| `state.selectedOrderId` | `string \| null` | Order yang sedang dipilih |
| `state.portfolio` | `Array` | Daftar portfolio |
| `state.categories` | `Array` | Master kategori |

#### Methods

| Method | Return | Deskripsi |
|---|---|---|
| `init()` | `Promise<void>` | Orchestrator + role check |
| `renderNotLoggedIn()` | `void` | Fallback jika belum login |
| `renderAccessDenied()` | `void` | Fallback jika role != freelancer |
| `renderShell()` | `void` | Render template UI |
| `bindUI()` | `void` | Bind form submit (add service + add portfolio) |
| `loadStats()` | `Promise<void>` | 5 stat card (total, active, pending, rating, revenue) |
| `loadServices()` | `Promise<void>` | Render service cards + bind toggle/edit/delete |
| `loadOrders()` | `Promise<void>` | Render order cards + bind accept/reject/update/complete/chat |
| `selectOrder(orderId)` | `Promise<void>` | Pilih order + render form progress |
| `renderProgress(orderId)` | `Promise<void>` | List progress + bind "Mark Done" |
| `loadPortfolio()` | `Promise<void>` | Render portfolio + bind edit/delete |
| `setupRealtime()` | `void` | Subscribe orders + project_progress + notifications |

#### Action Handlers (order cards)

| Selector | Aksi | Status Update |
|---|---|---|
| `data-accept` | UPDATE | `pending` → `accepted` |
| `data-reject` | UPDATE | → `cancelled` |
| `data-update-status` | prompt + UPDATE | `in_progress` / `revision` |
| `data-complete` | UPDATE | → `completed` |
| `data-chat` | redirect | → `chat.html?orderId=...` |

#### Realtime Subscriptions

| Channel | Tabel | Filter | Aksi |
|---|---|---|---|
| `freelancer_orders_<userId>` | `orders` | `freelancer_id=eq.<uid>` | `loadOrders()` |
| `freelancer_progress_<userId>` | `project_progress` | none | `renderProgress(selectedOrderId)` |
| `notifications_<userId>` | `notifications` | `user_id=eq.<uid>` | placeholder (tidak ada UI) |

---

### 2.12 `income.js`

**Lokasi:** `src/js/income.js`

**Dependency:** `supabase.js`, `auth.js`, `toast.js`, `orderUtils.js`

#### Exports

| Export | Tipe | Deskripsi |
|---|---|---|
| `Income` | `Object` | Namespace modul income |

#### Internal Helpers

| Function | Return | Deskripsi |
|---|---|---|
| `startOfMonth(d)` | `Date` | Awal bulan dari tanggal |
| `startOfYear(d)` | `Date` | Awal tahun dari tanggal |
| `toISODate(d)` | `string` | Konversi ke ISO string |
| `getIncomeStats()` | `Promise<Object>` | 4 query aggregasi (total, month, year, count) |

#### `Income.renderIncome()`

**Return:** `Promise<void>`

**Alur:**
1. Panggil `getIncomeStats()` (4 query).
2. Render ke DOM: `#income-total`, `#income-month`, `#income-year`, `#income-completed-orders`.
3. Sembunyikan `#income-loading`.

**Error handling:** `Toast.error('Failed to load income')` jika error.

---

### 2.13 `navigation.js`

**Lokasi:** `src/js/navigation.js`

**Dependency:** `auth.js`, `supabase.js` (dynamic import untuk badges)

#### Exports

| Export | Tipe | Deskripsi |
|---|---|---|
| `Navigation` | `Object` | Orchestrator navbar/sidebar/breadcrumb |
| `Icons` | `Object` (private) | SVG icon strings |

#### Properties

| Property | Tipe | Deskripsi |
|---|---|---|
| `currentUser` | `Object \| null` | Reference ke `Auth.currentUser` |
| `navbarEl` | `HTMLElement \| null` | Elemen navbar |
| `sidebarEl` | `HTMLElement \| null` | Elemen sidebar |
| `badges.messages` | `number` | Jumlah unread messages |
| `badges.notifications` | `number` | Jumlah notif belum dibaca |
| `badges.orders` | `number` | Jumlah pending orders |

#### Methods — Setup

| Method | Return | Deskripsi |
|---|---|---|
| `init(activePage)` | `Promise<void>` | Init: Auth.init + set active page |
| `setupForLoggedInPage(activePage)` | `Promise<User>` | Full setup untuk halaman login-required; redirect ke login jika belum auth |
| `setupFullPage()` | `Promise<User>` | Setup untuk halaman publik (dengan navbar) |

#### Methods — Navbar

| Method | Return | Deskripsi |
|---|---|---|
| `getNavbarItems()` | `Array` | Items navbar berdasarkan role |
| `renderNavbar(containerId)` | `void` | Render navbar ke container |
| `updateNavbarStyle()` | `void` | Terapkan style class active |

#### Methods — Sidebar

| Method | Return | Deskripsi |
|---|---|---|
| `getSidebarItems()` | `Array` | Items sidebar berdasarkan role |
| `renderSidebar()` | `void` | Render sidebar dengan avatar & user info |
| `updateSidebarUserInfo()` | `void` | Update name, role, avatar di sidebar |
| `toggleMobileSidebar(forceState)` | `void` | Buka/tutup sidebar di mobile |

#### Methods — Active Page

| Method | Return | Deskripsi |
|---|---|---|
| `setActivePage(pageName)` | `void` | Tandai menu aktif |
| `matchesPage(dataPage, currentPage)` | `boolean` | Map navbar item ke page |
| `matchesSidebarPage(dataPage, currentPage)` | `boolean` | Map sidebar item ke page |

#### Methods — Breadcrumb

| Method | Return | Deskripsi |
|---|---|---|
| `renderBreadcrumb(containerId, paths)` | `void` | Render breadcrumb ke container |

#### Methods — Badges

| Method | Return | Deskripsi |
|---|---|---|
| `loadBadges()` | `Promise<void>` | Hitung counts untuk messages, orders, notifications |
| `updateBadge(type, count)` | `void` | Update DOM badge sidebar & navbar |

#### Methods — Page Transition

| Method | Return | Deskripsi |
|---|---|---|
| `showPageTransition(containerId, callback)` | `void` | Apply fade-in animation |
| `renderSkeleton(containerId, type, count)` | `void` | Render skeleton loader |
| `showLoading(containerId, show)` | `void` | Show/hide loading overlay |
| `setupHamburger()` | `void` | Setup hamburger button |
| `applyPageTransition()` | `void` | Apply page transition ke main content |

#### Query di `loadBadges()`

1. `SELECT count messages WHERE (sender_id=me OR receiver_id=me) AND is_read=false`
2. `SELECT count orders WHERE (customer_id or freelancer_id = me) AND status='pending'`

#### Role-Based Items

**Customer navbar:** Home, Orders, Chat, Profile, Logout
**Freelancer navbar:** Home, Chat, Profile, Logout

**Customer sidebar:** Dashboard, Find Service, My Orders, Messages, Notifications, Profile, Settings
**Freelancer sidebar:** Dashboard, My Services, Orders, Portfolio, Messages, Notifications, Earnings, Profile, Settings

---

### 2.14 `toast.js`

**Lokasi:** `src/js/toast.js`

**Dependency:** `supabase.js` (side-effect import, tidak dipakai langsung)

#### Exports

| Export | Tipe | Deskripsi |
|---|---|---|
| `Toast` | `Object` | Namespace utilitas toast & loading |

#### `Toast.success(msg)`

| Parameter | Tipe | Deskripsi |
|---|---|---|
| `msg` | `string` | Pesan |

**Behavior:** Menampilkan toast hijau, auto-hide 3 detik.

#### `Toast.error(msg)`

**Behavior:** Menampilkan toast merah, auto-hide 3 detik.

#### `Toast.info(msg)`

**Behavior:** Menampilkan toast biru, auto-hide 3 detik.

#### `Toast.toast(message, type, timeoutMs)`

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `message` | `string` | — | Pesan |
| `type` | `'success' \| 'error' \| 'info'` | `'success'` | Tipe toast |
| `timeoutMs` | `number` | `3000` | Durasi tampil |

**Side effects:** Append div ke `#toast-root` (auto-create jika belum ada).

#### `Toast.showLoading(containerEl, text)`

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `containerEl` | `HTMLElement` | — | Container |
| `text` | `string` | `'Loading...'` | Teks loading |

**Return:** `HTMLElement | null` (node loading, atau `null` jika `containerEl` undefined)

#### `Toast.removeLoading(containerEl)`

**Side effects:** Hapus node dengan `data-loading`.

**Catatan:** Modul ini melakukan `import './supabase.js'` yang tidak diperlukan — efek samping import yang tidak relevan.

---

### 2.15 `animation.js`

**Lokasi:** `src/js/animation.js`

**Dependency:** (tidak ada)

#### Exports

| Export | Tipe | Deskripsi |
|---|---|---|
| `Animations` | `Object` | Namespace animasi |

#### `Animations.fadeIn(el, duration)`

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `el` | `HTMLElement` | — | Elemen target |
| `duration` | `number` | `500` | Durasi dalam ms |

**Behavior:** Set `opacity: 0` lalu `transition: opacity` lalu `opacity: 1` setelah 10ms.

#### `Animations.slideDown(el, duration)`

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `el` | `HTMLElement` | — | Elemen target |
| `duration` | `number` | `300` | Durasi dalam ms |

**Behavior:** Set `height: 0` → `height: scrollHeight` dengan transition.

#### `Animations.initPage()`

**Behavior:** Otomatis apply `fadeIn` ke semua `.fade-in` element saat DOMContentLoaded.

**Catatan:** File ini export `Animations` tapi **tidak ada modul lain yang mengimpornya**. Auto-initialization dilakukan di `DOMContentLoaded` listener.

---

## 3. Dependency Graph

Diagram ketergantungan antar modul:

```
                       supabase.js
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
     auth.js            service.js          booking.js (legacy)
        │                   │                   │
        │                   │                   │
        │                   ▼                   │
        │              (dashboardFreelancer.js)
        │              (dashboardCustomer.js)
        │                   │
        ├─► chat.js ◄────────┤
        │   │               │
        │   └─► storage     │
        │                   │
        ├─► profile.js      │
        │                   │
        ├─► orderUtils.js   │
        │   │               │
        │   └─► (used by)   │
        │       dashboard*  │
        │                   │
        ├─► notifications.js
        │   │               │
        │   └─► toast.js    │
        │                   │
        ├─► income.js       │
        │                   │
        ├─► realtime.js     │
        │                   │
        └─► navigation.js   │
                │           │
                └─► (consumed by every page)
```

### 3.1 Detail Impor per Modul

| Modul | Import dari |
|---|---|
| `supabase.js` | (tidak ada) |
| `auth.js` | `supabase.js` |
| `service.js` | `supabase.js` |
| `booking.js` | `supabase.js`, `service.js` |
| `profile.js` | `supabase.js` |
| `chat.js` | `supabase.js` |
| `realtime.js` | `supabase.js` |
| `notifications.js` | `supabase.js`, `toast.js` |
| `orderUtils.js` | `supabase.js` |
| `dashboardCustomer.js` | `supabase.js`, `auth.js`, `toast.js`, `orderUtils.js`, `notifications.js`, `realtime.js`, `chat.js` |
| `dashboardFreelancer.js` | `supabase.js`, `auth.js`, `toast.js`, `orderUtils.js`, `chat.js`, `notifications.js`, `realtime.js` |
| `income.js` | `supabase.js`, `auth.js`, `toast.js`, `orderUtils.js` |
| `navigation.js` | `auth.js`, `supabase.js` (dynamic) |
| `toast.js` | `supabase.js` (unused side-effect) |
| `animation.js` | (tidak ada) |

### 3.2 Pola Pemakaian Umum

- **Halaman login-required** (dashboard, profile, chat, income) → import `Navigation` → panggil `Navigation.setupForLoggedInPage(activePage)`.
- **Halaman publik** (login, signup, index) → import `Navigation` → panggil `Navigation.setupFullPage()`.
- **Halaman customer** → import `CustomerDashboard` dari `dashboardCustomer.js`.
- **Halaman freelancer** → dynamic import `dashboardFreelancer.js`.

---

## 4. Known Issues

Bagian ini merangkum masalah yang ditemukan di codebase, berdasarkan pembacaan langsung kode. Setiap issue memiliki severity dan rekomendasi (tanpa perubahan kode).

### 4.1 Bug

#### BUG-01: Delay 1000 ms `setTimeout` setelah `signUp` (race condition)
- **Lokasi:** `auth.js` `signup()` line 38
- **Detail:** `await new Promise(resolve => setTimeout(resolve, 1000))` menunggu 1 detik secara paksa setelah `supabase.auth.signUp()`. Ini adalah **workaround non-deterministik** untuk masalah timing di mana profil di-insert sebelum `auth.users` siap di Supabase.
- **Dampak:** Jika Supabase lambat, signup gagal. Jika cepat, signup menunggu 1 detik sia-sia.
- **Rekomendasi:** Pakai `supabase.auth.signUp({ ..., options: { data: { name, role } }})` untuk metadata, atau retry INSERT dengan backoff.

#### BUG-02: `bookService` parameter `date` tidak digunakan
- **Lokasi:** `service.js` `bookService(serviceId, date, client)`
- **Detail:** Parameter `date` diterima tapi tidak dimasukkan ke `INSERT orders`. Query hanya menyimpan `service_id`, `customer_id`, `freelancer_id`, `total_price`, `status`, `notes`. Field `deadline` di schema tidak pernah di-populate.
- **Dampak:** Field `orders.deadline` selalu `NULL`.
- **Rekomendasi:** Tambahkan `deadline: date` ke INSERT, atau hapus parameter `date`.

#### BUG-03: Direct chat `INSERT` di `chat.html` tidak menyertakan `sender_id`
- **Lokasi:** `src/chat.html` line 116-122
- **Detail:** `INSERT messages` hanya menyertakan `sender_id, receiver_id, content, file_url, order_id` — `sender_id` di-set, tapi tidak eksplisit (sebenarnya ada di payload). Namun RLS `messages` (jika ada) mungkin akan menolak karena `auth.uid() != sender_id` yang akan di-validate server-side.
- **Catatan:** Mungkin bukan bug; `auth.uid()` otomatis jadi `sender_id` lewat RLS. Perlu verifikasi RLS di schema.

#### BUG-04: `chat.js` realtime subscription tanpa filter
- **Lokasi:** `chat.js` `setupRealtime()`
- **Detail:** Subscribe channel `'messages'` dengan event `*` **tanpa filter** `order_id` atau `sender_id/receiver_id`. Setiap perubahan pada tabel `messages` (di seluruh database) diterima.
- **Dampak:** Payload besar, performa buruk, bandwidth tidak perlu.
- **Rekomendasi:** Filter dengan `order_id=eq.<id>` atau `or(sender_id.eq.me,receiver_id.eq.me)`.

#### BUG-05: `booking.js` polling `setInterval(5000)` tidak pernah di-clear
- **Lokasi:** `booking.js` `init()` line 67
- **Detail:** `setInterval` di-set tanpa referensi. Tidak ada `clearInterval`. Setiap kali `init()` dipanggil, interval baru ditambahkan — memory leak dan double-render.
- **Dampak:** Multiple interval berjalan seiring waktu.
- **Rekomendasi:** Simpan interval ID dan clear sebelum re-init.

#### BUG-06: `Booking.updateStatus()` menggunakan `alert()` bukan toast
- **Lokasi:** `booking.js` `updateStatus()` line 52
- **Detail:** Error ditampilkan via `alert('Update failed: ' + error.message)`. Inkonsisten dengan UX modern (menggunakan `Toast.error`).
- **Rekomendasi:** Ganti ke `Toast.error(error.message)`.

#### BUG-07: `Profile.getRating` RPC mungkin tidak ada
- **Lokasi:** `profile.js` line 42
- **Detail:** RPC `get_user_rating` hanya didefinisikan sebagai komentar di `profile.js` (line 49-62). Tidak di-deploy otomatis. Jika DBA lupa create, `Profile.getRating()` selalu return error.
- **Dampak:** Rating di profile page selalu "No reviews".
- **Rekomendasi:** Pindahkan definisi RPC ke migration SQL atau `supabase-schema.sql`.

#### BUG-08: Direct chat UI meminta user input `recipient_id` manual
- **Lokasi:** `chat.html` line 24-27
- **Detail:** User harus memasukkan UUID recipient secara manual. Tidak ada UI untuk memilih kontak.
- **Dampak:** Direct chat praktis tidak bisa dipakai end-user.
- **Rekomendasi:** Buat halaman list chat (inbox) dengan daftar order/customer.

#### BUG-09: `chat.html` `sendMessage` duplikat dengan `Chat.sendMessage`
- **Lokasi:** `chat.html` line 97-134 vs `chat.js` `Chat.sendMessage`
- **Detail:** `chat.html` memiliki inline `sendMessage()` yang **tidak memanggil** `Chat.sendMessage()`. Melakukan INSERT langsung dengan `supabase.from('messages').insert(...)`. Hanya Direct chat, tidak mendukung order-scoped.
- **Dampak:** Inkonsistensi; direct chat via HTML tidak realtime-refresh.
- **Rekomendasi:** Refactor untuk menggunakan `Chat.sendMessage()` dari modul.

#### BUG-10: `FreelancerDashboard.selectOrder` auto-call tanpa proteksi null
- **Lokasi:** `dashboardFreelancer.js` `loadOrders()` line 518
- **Detail:** `await this.selectOrder(this.state.orders[0]?.id)` — jika `state.orders` kosong, `selectOrder(undefined)` dipanggil. Di dalam `selectOrder`, `find()` return `undefined`, dan DOM masih di-render.
- **Dampak:** UI error kecil; tidak crash.
- **Rekomendasi:** Tambah early return jika `orderId === undefined`.

---

### 4.2 Kode Duplikat

#### DUP-01: Inline `sendMessage` di `chat.html` vs `Chat.sendMessage` di `chat.js`
- **Lokasi:** `chat.html` line 97-134 vs `chat.js` line 74-101
- **Detail:** Dua implementasi `sendMessage` yang melakukan hal serupa. Inline di HTML hanya insert message + manual load, sedangkan `Chat.sendMessage` di JS delegate ke module.
- **Rekomendasi:** Hapus inline, gunakan `Chat.sendMessage`.

#### DUP-02: Polling + Realtime untuk `orders`
- **Lokasi:** `booking.js` (polling via `setInterval`) vs `dashboardFreelancer.js` (realtime via `Realtime.subscribeTable`).
- **Detail:** Dua mekanisme refresh order yang berbeda untuk data yang sama.
- **Rekomendasi:** Hapus `booking.js` atau refactor.

#### DUP-03: Status badge & currency formatting
- **Lokasi:** `orderUtils.js` vs inline di `dashboard*.html` (legacy)
- **Detail:** Status badge CSS class didefinisikan di `orderUtils.statusToMeta`, tapi beberapa template HTML inline di legacy code masih hard-code string.
- **Rekomendasi:** Standarkan lewat `OrderUtils.statusToMeta()`.

#### DUP-04: Realtime subscription helper di 2 tempat
- **Lokasi:** `supabase.js` `subscribe()` (tidak dipakai) vs `realtime.js` `subscribeTable()` (dipakai).
- **Detail:** `supabase.js` memiliki helper realtime legacy yang tidak pernah dipanggil.
- **Rekomendasi:** Hapus `supabase.subscribe()`.

#### DUP-05: File upload di `chat.html` dan `chat.js`
- **Lokasi:** `chat.html` line 105-113 (inline validasi + upload) vs `chat.js` `uploadFile()` (modul).
- **Detail:** Validasi max 10MB di-duplikasi di kedua tempat. Inline di HTML tidak menggunakan `Chat.uploadFile()`.
- **Rekomendasi:** Hapus inline, gunakan `Chat.uploadFile()`.

#### DUP-06: `renderNotLoggedIn` di kedua dashboard
- **Lokasi:** `dashboardCustomer.js` & `dashboardFreelancer.js`
- **Detail:** Implementasi serupa (sama-sama render "Please login" dengan link). Perbedaan kecil di URL.
- **Rekomendasi:** Ekstrak ke helper `Navigation.renderLoginPrompt()`.

---

### 4.3 Potensi Masalah Keamanan

#### SEC-01: `localStorage` menyimpan `authUser` JSON
- **Lokasi:** `auth.js` `loadUserProfile()` line 99
- **Detail:** `localStorage.setItem('authUser', JSON.stringify(this.currentUser))`. `currentUser` adalah gabungan `auth.users` + `profiles`, sehingga berisi `email`, `role`, dan metadata lainnya.
- **Risiko:** XSS dapat membaca localStorage. Token JWT sebenarnya ada di cookie HttpOnly Supabase, tapi profile data terekspos.
- **Rekomendasi:** Hanya simpan `id` dan `role` di localStorage, fetch data lain via `getSession()` atau query ke DB.

#### SEC-02: `import.meta.env.VITE_SUPABASE_ANON_KEY` terekspos
- **Lokasi:** `supabase.js` line 5
- **Detail:** Vite menggunakan env dengan prefix `VITE_` yang akan di-bundle ke client. ANON_KEY adalah public key (aman), tapi VITE_SUPABASE_URL juga terekspos. Ini by-design untuk Supabase (RLS melindungi data), namun developer perlu sadar.
- **Mitigasi:** Pastikan RLS policy aktif di semua tabel.

#### SEC-03: Bucket `chat-attachments` diasumsikan publik
- **Lokasi:** `chat.js` `uploadFile()` line 125
- **Detail:** `getPublicUrl()` menghasilkan URL publik. Siapapun yang memiliki URL dapat membaca file. Tidak ada policy Storage eksplisit di `supabase-schema.sql`.
- **Risiko:** File lampiran chat dapat diakses siapapun yang tahu URL.
- **Rekomendasi:** Ganti ke signed URL dengan expiry, atau tambahkan policy Storage.

#### SEC-04: `push_notification` SECURITY DEFINER menembus RLS
- **Lokasi:** `supabase-schema.sql` function `push_notification`
- **Detail:** `SECURITY DEFINER` membuat function berjalan dengan privilege owner, menembus RLS. Ini cara trigger mengirim notifikasi, namun jika function vulnerable bisa disalahgunakan.
- **Rekomendasi:** Pastikan function hanya dipanggil dari trigger, dan tidak ada cara lain untuk memanggilnya dari client.

#### SEC-05: `INSERT reviews` tidak ada validasi ownership
- **Lokasi:** `dashboardCustomer.js` `renderReviewArea()` form submit
- **Detail:** Frontend mengirim `order_id, reviewer_id, reviewed_id`. RLS diasumsikan memvalidasi. Jika RLS lemah, user bisa me-review order orang lain.
- **Rekomendasi:** Tambahkan server-side check di trigger.

#### SEC-06: `messages.content` tidak di-escape saat render
- **Lokasi:** `chat.js` `renderMessages()` line 62-69
- **Detail:** Template literal `\`${msg.content || isFile}\`` menyisipkan content langsung ke HTML. XSS risk jika user mengirim script.
- **Rekomendasi:** Escape content dengan `textContent` atau library DOMPurify.

#### SEC-07: `prompt()` untuk edit profile menggunakan raw input
- **Lokasi:** `profile.html` line 144-155 & `dashboardFreelancer.js` edit service/portfolio
- **Detail:** `prompt('New name:')` mengembalikan string mentah yang langsung di-INSERT/UPDATE. Tidak ada validasi panjang, sanitasi, atau trim otomatis.
- **Rekomendasi:** Ganti ke form input dengan validasi proper.

---

### 4.4 Potensi Refactor

#### REF-01: Hapus modul legacy `booking.js`
- **Lokasi:** `src/js/booking.js`
- **Detail:** Modul ini **tidak dipakai** di dashboard modern. Subscribe realtime di-comment, polling fallback aktif. Membingungkan untuk developer baru.
- **Rekomendasi:** Hapus file atau refactor ke legacy `dashboard.html` (yang sudah redirect-only).

#### REF-02: Konsolidasi chat logic
- **Lokasi:** `chat.js` + `chat.html` inline
- **Detail:** Banyak duplikasi: `sendMessage`, `loadMessages`, file upload. `chat.html` memiliki inline logic yang harusnya delegate ke `Chat.sendMessage`.
- **Rekomendasi:** Refactor `chat.html` agar seluruh logic ada di `chat.js` module.

#### REF-03: Hapus `import './supabase.js'` di `toast.js`
- **Lokasi:** `toast.js` line 1
- **Detail:** Side-effect import yang tidak relevan. `Toast` tidak menggunakan Supabase.
- **Rekomendasi:** Hapus baris `import './supabase.js';`.

#### REF-04: Hapus `subscribe()` helper di `supabase.js`
- **Lokasi:** `supabase.js` line 10-22
- **Detail:** Helper legacy yang **tidak pernah dipanggil** dari modul lain. `realtime.js` `subscribeTable()` adalah implementasi yang dipakai.
- **Rekomendasi:** Hapus `subscribe()`.

#### REF-05: Centralisasi konstanta (table names, status values)
- **Lokasi:** Tersebar di banyak file (`'orders'`, `'services'`, `'profiles'`, `'pending'`, `'completed'`, dll.)
- **Detail:** Magic strings di banyak tempat. Typo dapat menyebabkan bug.
- **Rekomendasi:** Buat `constants.js` dengan `TABLES`, `ORDER_STATUS`, `ROLE`, dll.

#### REF-06: Hapus `src/home.html` (orphan)
- **Lokasi:** `src/home.html` (tidak masuk Vite entry)
- **Detail:** File ada tapi tidak di-import atau di-link.
- **Rekomendasi:** Hapus atau integrasikan.

#### REF-07: TypeScript / JSDoc types
- **Lokasi:** Semua modul
- **Detail:** Tidak ada type annotation. Developer baru harus membaca seluruh fungsi untuk memahami signature.
- **Rekomendasi:** Migrasi ke TypeScript atau tambah JSDoc.

#### REF-08: Error handling tidak konsisten
- **Lokasi:** Tersebar
- **Detail:** `console.error` di beberapa tempat, `alert()` di `booking.js`, `Toast.error` di dashboard. Tidak ada pattern seragam.
- **Rekomendasi:** Buat wrapper `tryOrToast()` yang standard.

#### REF-09: Inline style di HTML
- **Lokasi:** Banyak `*.html` files
- **Detail:** Style ditulis langsung di HTML (`style="..."`) daripada di CSS file. Maintenance sulit.
- **Rekomendasi:** Ekstrak ke `src/css/*.css`.

#### REF-10: Hardcoded `setTimeout` untuk UI animation
- **Lokasi:** `toast.js` line 38, `animation.js` line 6
- **Detail:** `setTimeout` untuk transition timing. Tidak ada cara cancel.
- **Rekomendasi:** Gunakan Web Animations API.

---

### 4.5 Potensi Peningkatan Performa

#### PERF-01: `dashboardCustomer.loadStats()` melakukan 4 query terpisah
- **Lokasi:** `dashboardCustomer.js` `loadStats()` line 133-184
- **Detail:** 4 round-trip Supabase. Bisa digabung dengan conditional aggregation dalam 1 query.
- **Rekomendasi:** Gunakan 1 query dengan multiple subselect atau RPC.

#### PERF-02: `booking.js` polling `setInterval(5000)`
- **Lokasi:** `booking.js` line 67
- **Detail:** 12 request/menit per user aktif. Tidak scalable.
- **Rekomendasi:** Pakai realtime subscription (seperti `dashboardFreelancer`).

#### PERF-03: `chat.js` re-load semua messages pada setiap event
- **Lokasi:** `chat.js` `setupRealtime()`
- **Detail:** Setiap event realtime memicu `loadMessages()` yang me-reload semua pesan. Render ulang seluruh thread untuk 1 pesan baru.
- **Rekomendasi:** Append 1 message saja saat event INSERT, atau pakai diff-based update.

#### PERF-04: `income.js` 4 query terpisah
- **Lokasi:** `income.js` `getIncomeStats()`
- **Detail:** 4 round-trip ke `orders` (total, month, year, count). Bisa digabung.
- **Rekomendasi:** Single query dengan conditional aggregation, atau RPC.

#### PERF-05: `notifications.loadForUser` limit 50 tanpa filter is_read
- **Lokasi:** `notifications.js` `loadForUser()`
- **Detail:** Selalu 50 terbaru, tidak memprioritaskan unread. User yang sudah mark-all-read akan melihat 50 notif lama terus.
- **Rekomendasi:** Filter `is_read = false` first, atau tambahkan tab "Unread/All".

#### PERF-06: Missing composite index untuk embed join
- **Lokasi:** `service.js` `getServices()`, dashboard embed queries
- **Detail:** JOIN berat ke `orders` dan `profiles`. Index pada FK (`services.freelancer_id`, `orders.customer_id`, dll.) belum dijamin ada di schema awal.
- **Rekomendasi:** Tambah index di Supabase + buat database view untuk query kompleks.

#### PERF-07: Tidak ada caching untuk `categories`
- **Lokasi:** `service.js` `getCategories()`, `dashboardFreelancer.js`
- **Detail:** Categories di-fetch setiap render dashboard. Data jarang berubah.
- **Rekomendasi:** Cache di memory atau localStorage dengan TTL.

#### PERF-08: `FreelancerDashboard.loadOrders()` load semua order tanpa pagination
- **Lokasi:** `dashboardFreelancer.js` `loadOrders()`
- **Detail:** SELECT semua orders freelancer. Akan berat pada skala besar.
- **Rekomendasi:** Tambah `range()` pagination, atau filter by status aktif.

#### PERF-09: `chat.html` inline `<script>` besar
- **Lokasi:** `chat.html`
- **Detail:** Inline script panjang. Tidak ter-cache terpisah dari HTML.
- **Rekomendasi:** Ekstrak ke file `chat-page.js` atau biarkan di module `chat.js`.

#### PERF-10: Sequential `supabase.from(...).select()` calls
- **Lokasi:** Banyak file (mis. `loadStats`, `loadOrders`)
- **Detail:** Query dipanggil satu per satu. Tidak ada batching paralel. Supabase mendukung parallel dengan `Promise.all`.
- **Rekomendasi:** Audit setiap tempat dan gunakan `Promise.all` untuk independent queries.

---

### 4.6 Ringkasan Severity

| ID | Severity | Kategori |
|---|---|---|
| BUG-01 | High | Bug |
| BUG-02 | Medium | Bug |
| BUG-04 | High | Bug |
| BUG-05 | Medium | Bug |
| BUG-07 | Medium | Bug |
| BUG-08 | High | UX Bug |
| BUG-09 | High | Code Quality |
| DUP-01 | High | Duplikat |
| DUP-02 | High | Duplikat |
| SEC-03 | High | Security |
| SEC-06 | High | Security (XSS) |
| REF-02 | High | Refactor |
| PERF-02 | High | Performa |
| PERF-06 | High | Performa |
| (lainnya) | Medium/Low | berbagai |

**Total: 41 issues teridentifikasi (10 bugs, 6 duplikat, 7 security, 10 refactor, 10 performa).**

---

## Penutup

Dokumen ini melengkapi trilogi dokumentasi NimTask:

- **`docs/project-overview.md`** — Struktur & fondasi teknis.
- **`docs/database-documentation.md`** — Skema database & backend.
- **`docs/application-flow.md`** — Fitur & business process.
- **`docs/code-reference.md`** (dokumen ini) — Referensi source code JS + Known Issues.

### Onboarding untuk Developer Baru

1. **Mulai dari `project-overview.md`** untuk paham stack dan entry point.
2. **Lanjut ke `application-flow.md`** untuk paham fitur.
3. **Cross-check dengan `database-documentation.md`** untuk paham data model.
4. **Gunakan `code-reference.md`** sebagai cheat sheet API module saat coding.

### Untuk AI Assistant / Code Reviewer

- Modul-modul saling tergantung lewat `supabase.js` sebagai root.
- `Navigation` adalah orchestrator UI yang dipakai setiap halaman.
- `Auth.currentUser` adalah state utama yang merepresentasikan user.
- Selalu periksa `supabase-schema.sql` untuk struktur DB aktual.

Terima kasih telah membaca dokumentasi ini. Selamat coding! 🚀
