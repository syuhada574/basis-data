# TODO - Project Documentation + Fix "Memuat Layanan Terus"

- [x] Buat `PROJECT_DOCUMENTATION.md` di root project
- [x] Analisis landing page penyebab "memuat services terus"
- [x] Tambahkan guard di `src/index.html` supaya `renderFindServicePage()` & `loadServices()` tidak terpanggil dobel
- [x] (Opsional) Tambahkan lock agar tidak ada concurrent `loadServices()` call
- [x] Verifikasi dengan cara buka halaman dan amati Network/Console: request ke `services` harus stabil (tidak spam)