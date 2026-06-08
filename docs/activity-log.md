# Dokumentasi Activity Log

Dokumen ini menjelaskan fitur **Activity Log** pada aplikasi. Penjelasan dibuat agar mudah dipahami mahasiswa saat presentasi.

---

## 1) Tujuan fitur Activity Log
Activity Log dipakai untuk:
- Mencatat aktivitas penting yang terjadi di sistem (contoh: membuat layanan, menerima order, menyelesaikan order).
- Menyediakan riwayat aktivitas untuk ditampilkan di dashboard pengguna.
- Membantu admin/pengguna memahami “apa yang terjadi” dan “kapan terjadinya”.

Dengan adanya Activity Log, pengguna bisa melihat histori aksi tanpa harus membuka detail transaksi satu per satu.

---

## 2) Struktur tabel `activity_logs`
Activity Log menyimpan data aktivitas pada tabel bernama **`activity_logs`**.

Berikut struktur kolom yang digunakan dari kode aplikasi:

- `user_id` (string/uuid)
  - ID pengguna yang melakukan aksi.
- `action` (string)
  - Nama aksi yang dicatat (misal `accept_order`).
- `target_type` (string, nullable)
  - Jenis objek target yang terkena aksi (misal `order`, `service`, `portfolio`).
- `target_id` (string, nullable)
  - ID objek target.
- `created_at` (timestamp)
  - Waktu aktivitas dibuat (dipakai untuk pengurutan dan tampilan waktu).


> Catatan: Kolom `created_at` digunakan untuk menentukan urutan aktivitas terbaru.

---

## 3) Daftar action yang dicatat

Nilai `action` yang dicatat mengikuti mapping di `src/js/activity.js` dan juga pemanggilan `Activity.log()` di dashboard serta modul layanan.

Berikut action yang digunakan di codebase saat ini:

- `create_service` — freelancer membuat layanan baru
- `update_service` — freelancer mengubah layanan
- `create_order` — customer membuat order
- `accept_order` — freelancer menerima order
- `complete_order` — freelancer menandai order selesai
- `create_review` — customer memberikan review
- `delete_service` — freelancer menghapus service
- `delete_portfolio` — freelancer menghapus portfolio item
- `update_portfolio` — freelancer mengubah portfolio item


---

## 4) Contoh data activity
Berikut contoh bentuk data yang mungkin masuk ke `activity_logs`:

```json
{
  "user_id": "user_123",
  "action": "accept_order",
  "target_type": "order",
  "target_id": "order_456",
  "created_at": "2026-06-02T10:30:00.000Z"
}
```

Contoh lain:

```json
{
  "user_id": "user_123",
  "action": "create_service",
  "target_type": "service",
  "target_id": "service_789",
  "created_at": "2026-06-01T08:15:00.000Z"
}
```

Pada UI, aplikasi akan melakukan pemetaan `action` menjadi teks yang lebih ramah untuk ditampilkan.

---

## 5) Flow pencatatan activity
Berikut flow pencatatan Activity Log secara ringkas:

1. **User melakukan aksi di aplikasi**
   - Contoh: freelancer menekan tombol “Accept” pada order.

2. **Aplikasi melakukan update/insert data utama**
   - Misalnya: update status order di tabel `orders`.

3. **Aplikasi mencatat aktivitas ke `activity_logs`**
   - Aplikasi membuat record baru berisi:
     - `user_id`
     - `action`
     - `target_type`
     - `target_id`

4. **Data aktivitas tersimpan dan bisa ditampilkan**
   - Saat dashboard dibuka, aplikasi mengambil data terbaru:
     - filter berdasarkan `user_id`
     - urutkan berdasarkan `created_at` terbaru
     - batasi jumlah (misal 20 aktivitas)

5. **UI menampilkan aktivitas**
   - `action` diubah menjadi teks tampilan melalui mapping (misal `accept_order` -> “Menerima pesanan”).
   - Aplikasi juga menampilkan waktu aktivitas.


> Catatan: UI yang ada di `dashboardCustomer.js` dan `dashboardFreelancer.js` mengambil **maksimal 20 aktivitas terbaru** per user.


---

## Ringkasan 1 kalimat
Activity Log adalah sistem pencatatan aksi pengguna ke tabel `activity_logs`, lalu data terbaru ditampilkan di dashboard untuk memberi konteks riwayat aktivitas.

