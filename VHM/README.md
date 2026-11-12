# VHM SUB 2 — Running Training Tracker 🏃‍♂️💨

Website pelacak progres latihan lari interaktif yang dirancang khusus untuk mencapai target **Half Marathon Sub 2 Jam (< 02:00:00)** dengan kecepatan rata-rata target **5'41" /km**.

Template dan data awal disinkronkan 100% dari file Excel **`VHM SUB 2.xlsx`**.

---

## 🚀 Cara Membuka Website

Anda dapat membuka website ini dengan sangat mudah menggunakan salah satu cara berikut:

### Cara 1: Langsung Buka File (Paling Cepat)
- Cukup **klik dua kali** file [`buka-website.bat`](./buka-website.bat) atau langsung klik dua kali [`index.html`](./index.html).
- Website akan otomatis terbuka di browser favorit Anda (Chrome, Edge, Firefox, dll) tanpa perlu install server apapun.

### Cara 2: Menjalankan Server Lokal (Opsional)
Jalankan perintah berikut di terminal:
```bash
node server.js
```
Lalu buka browser di: `http://localhost:3000`

---

## 📋 4 Pilar Jenis Lari (Sesuai Template Excel)

1. **🟢 Easy Run**:
   - Membangun fondasi aerobik (Zone 2, ~135–152 bpm).
   - Parameter: Jarak (km), Waktu, Pace (min/km), Heart Rate (bpm), Lokasi (Indoor Treadmill / Outdoor).
2. **🟠 Tempo Run**:
   - Meningkatkan ambang batas laktat (Lactate Threshold, Zone 4, ~165–175 bpm).
   - Memiliki segmen pemanasan (Warm Up), segmen Tempo Inti (jarak atau blok waktu, misal 6 menit x 3 repetisi), dan pendinginan (Cool Down).
3. **🔴 Interval Run**:
   - Latihan kecepatan & VO2Max (Zone 5, > 175 bpm).
   - Pemanasan (Warm Up), tabel repetisi set dinamis (Set 1, Set 2, Set 3, Set 4, Set 5... 400m-1000m dengan target pace dan HR per set), serta pendinginan (Cool Down).
4. **🔵 Long Run**:
   - Membangun daya tahan jarak jauh menuju 21.0975 km.
   - Dilengkapi indikator progres jarak menuju target finish Half Marathon.

---

## ✨ Fitur-Fitur Utama Website

- **🎯 Sub-2 Target HUD & Readiness Score**:
  - Menghitung skor kesiapan menuju Half Marathon Sub 2 secara otomatis (berdasarkan jarak long run terjauh, pace tempo terbaik, dan konsistensi volume).
  - Progress bar jarak long run menuju 21.1 km.
- **📊 Grafik Analitik Interaktif (Chart.js)**:
  - **Distribusi Jarak Mingguan (Stacked Bar)**: Menampilkan breakdown kilometer Easy, Tempo, Interval, dan Long Run di setiap minggu.
  - **Tren Pace vs Target Sub-2 (Line Chart)**: Grafik perkembangan kecepatan lari berbanding garis batas 5:41 /km (terbalik: makin cepat berada di atas).
- **🔄 Dual View (Kartu Sesi & Template Excel Asli)**:
  - **Tampilan Kartu**: Kartu sesi modern dengan detail repetisi, segmen waktu, dan catatan.
  - **Tampilan Sheet Excel**: Matriks tabel yang mereplikasi susunan kolom dan baris asli file `VHM SUB 2.xlsx`.
- **➕ Modal Pencatatan Sesi Fleksibel**:
  - Kalkulator pace otomatis: Masukkan jarak dan waktu, pace dihitung seketika.
  - Form dinamis untuk Interval sets (tambah / hapus set) dan Tempo segments.
- **⏱️ Matriks Split Half Marathon**:
  - Rincian target waktu di pos 5K, 10K, 15K, 20K, hingga Finish 21.1K.
- **❤️ Panduan Heart Rate Zones**:
  - Penjelasan Zone 1 s/d Zone 5 untuk memandu batas detak jantung setiap jenis lari.
- **💾 Penyimpanan Otomatis & Backup**:
  - Menggunakan `localStorage` browser sehingga data tidak hilang saat halaman di-refresh.
  - Ekspor ke CSV / Excel spreadsheet.
  - Ekspor & Impor file cadangan JSON.
  - Tombol **Reset ke Data Excel Asli** untuk mengembalikan data awal kapan saja.

