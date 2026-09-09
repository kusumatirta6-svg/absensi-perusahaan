import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

interface Karyawan {
  id: string;
  id_karyawan: string;
  nama: string;
  jabatan: string;
  email?: string;
  pin?: string;
}

interface Absen {
  id: string;
  karyawan_id: string;
  id_karyawan: string;
  nama: string;
  jabatan: string;
  tanggal: string;
  jam_masuk: string;
  jam_pulang: string;
  total_jam: string;
  status: string;
  lokasi?: string;
}

export default function App() {
  const [role, setRole] = useState<'pilih' | 'karyawan' | 'daftar_karyawan' | 'lupa_password' | 'admin'>('pilih');
  const [adminPassword, setAdminPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'absen' | 'karyawan' | 'riwayat'>('absen');

  const [daftarKaryawan, setDaftarKaryawan] = useState<Karyawan[]>([]);
  const [riwayatAbsen, setRiwayatAbsen] = useState<Absen[]>([]);
  const [loading, setLoading] = useState(false);

  // Form States Pendaftaran Mandiri
  const [regIdKaryawan, setRegIdKaryawan] = useState('');
  const [regNama, setRegNama] = useState('');
  const [regJabatan, setRegJabatan] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPin, setRegPin] = useState('');

  // Form States Login Karyawan
  const [selectedKaryawanId, setSelectedKaryawanId] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [karyawanLogin, setKaryawanLogin] = useState<Karyawan | null>(null);

  // Form States Lupa Password via Gmail
  const [lupaEmail, setLupaEmail] = useState('');

  // Form States Absen
  const [jenisAbsen, setJenisAbsen] = useState<'Masuk' | 'Pulang'>('Masuk');
  const [statusAbsen, setStatusAbsen] = useState('Hadir');

  // Filter & Search Admin States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTanggal, setFilterTanggal] = useState('');

  // Fitur GPS & Kamera State
  const [lokasiUser, setLokasiUser] = useState<string>('Mendeteksi lokasi...');
  const [jarakKantorMeter, setJarakKantorMeter] = useState<number | null>(null);
  const [fotoSnapshot, setFotoSnapshot] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const KANTOR_LAT = -6.1751; 
  const KANTOR_LNG = 106.8650;
  const MAKS_RADIUS_METER = 200; 

  const JAM_MASUK_JAM = 8;
  const JAM_MASUK_MENIT = 0;

  useEffect(() => {
    fetchDataKaryawan();
    fetchDataAbsensi();
  }, []);

  useEffect(() => {
    if (role === 'karyawan' && karyawanLogin) {
      startCamera();
      ambilLokasiGPS();
    } else {
      stopCamera();
    }
  }, [role, karyawanLogin]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Gagal mengakses kamera:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const ambilFoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setFotoSnapshot(dataUrl);
        alert('Verifikasi wajah berhasil diambil!');
      }
    }
  };

  const hitungJarakGPS = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const ambilLokasiGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const jarak = hitungJarakGPS(lat, lng, KANTOR_LAT, KANTOR_LNG);
          setJarakKantorMeter(Math.round(jarak));
          setLokasiUser(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)} (Jarak ±${Math.round(jarak)}m dari kantor)`);
        },
        () => {
          setLokasiUser('Gagal mendeteksi GPS (Izin lokasi ditolak)');
        }
      );
    } else {
      setLokasiUser('GPS tidak didukung browser ini');
    }
  };

  const fetchDataKaryawan = async () => {
    const { data, error } = await supabase.from('karyawan').select('*').order('nama', { ascending: true });
    if (!error && data) setDaftarKaryawan(data);
  };

  const fetchDataAbsensi = async () => {
    const { data, error } = await supabase.from('absensi').select('*').order('created_at', { ascending: false });
    if (!error && data) setRiwayatAbsen(data);
  };

  const handleLoginKaryawan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKaryawanId) {
      alert('Silakan pilih nama karyawan terlebih dahulu.');
      return;
    }
    const found = daftarKaryawan.find(k => k.id === selectedKaryawanId);
    if (!found) return;

    const pinUser = found.pin || '1234';
    if (inputPin === pinUser) {
      setKaryawanLogin(found);
      alert(`Selamat datang, ${found.nama}!`);
    } else {
      alert('PIN Rahasia salah! Silakan coba lagi atau pilih "Lupa Password".');
    }
  };

  // Pendaftaran Mandiri Terintegrasi Supabase Auth & Users Table
  const handlePendaftaranMandiri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regIdKaryawan.trim() || !regNama.trim() || !regJabatan.trim() || !regEmail.trim() || !regPin.trim()) {
      alert('Semua kolom wajib diisi termasuk Email Gmail dan PIN!');
      return;
    }

    if (!regEmail.includes('@gmail.com')) {
      alert('Harap masukkan alamat Email Gmail yang valid!');
      return;
    }

    setLoading(true);

    // 1. Daftarkan akun ke Supabase Auth (Agar menu Authentication > Users terisi)
    const { error: authError } = await supabase.auth.signUp({
      email: regEmail,
      password: regPin, // Menggunakan PIN sebagai sandi akun
      options: {
        data: { nama: regNama, jabatan: regJabatan }
      }
    });

    if (authError) {
      setLoading(false);
      alert('Gagal membuat akun Auth: ' + authError.message);
      return;
    }

    // 2. Masukkan data profil ke tabel database 'karyawan'
    const { error: dbError } = await supabase.from('karyawan').insert([
      { 
        id_karyawan: regIdKaryawan, 
        nama: regNama, 
        jabatan: regJabatan, 
        email: regEmail, 
        pin: regPin 
      }
    ]);
    
    setLoading(false);

    if (dbError) {
      alert('Gagal menyimpan data karyawan: ' + dbError.message);
    } else {
      alert('Akun berhasil dibuat dan terdaftar di sistem! Silakan login.');
      setRegIdKaryawan('');
      setRegNama('');
      setRegJabatan('');
      setRegEmail('');
      setRegPin('');
      setRole('karyawan');
      fetchDataKaryawan();
    }
  };

  const handleKirimOTPGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lupaEmail.trim() || !lupaEmail.includes('@gmail.com')) {
      alert('Masukkan alamat Email Gmail yang valid.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(lupaEmail, {
      redirectTo: window.location.origin,
    });
    setLoading(false);

    if (error) {
      alert('Gagal mengirim email pemulihan: ' + error.message);
    } else {
      alert(`Instruksi pemulihan PIN / Kode OTP telah dikirimkan ke Gmail: ${lupaEmail}.`);
      setLupaEmail('');
      setRole('karyawan');
    }
  };

  const handleLoginAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'admin123') {
      setRole('admin');
      setActiveTab('riwayat');
    } else {
      alert('Password Admin salah!');
    }
  };

  const hitungDurasiJam = (masuk: string, pulang: string) => {
    if (masuk === '-' || pulang === '-') return '-';
    try {
      const [jamM, menitM] = masuk.split(':').map(Number);
      const [jamP, menitP] = pulang.split(':').map(Number);
      const selisihMenit = (jamP * 60 + menitP) - (jamM * 60 + menitM);
      if (selisihMenit <= 0) return '0 jam';
      return `${Math.floor(selisihMenit / 60)} jam ${selisihMenit % 60} menit`;
    } catch {
      return '-';
    }
  };

  const cekStatusKeterlambatan = (jamMasuk: string, statusPilihan: string) => {
    if (statusPilihan !== 'Hadir') return statusPilihan;
    if (jamMasuk === '-') return 'Hadir';
    try {
      const [jam, menit] = jamMasuk.split(':').map(Number);
      const totalMenitMasuk = jam * 60 + menit;
      const batasMenitNormal = JAM_MASUK_JAM * 60 + JAM_MASUK_MENIT;

      if (totalMenitMasuk > batasMenitNormal) {
        const selisih = totalMenitMasuk - batasMenitNormal;
        return `Terlambat (${selisih} mnt)`;
      }
    } catch {}
    return 'Hadir';
  };

  const handleKirimAbsen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!karyawanLogin) return;

    if (jarakKantorMeter !== null && jarakKantorMeter > MAKS_RADIUS_METER) {
      alert(`GAGAL ABSEN: Anda berada di luar radius kantor! Jarak Anda sekitar ${jarakKantorMeter} meter.`);
      return;
    }

    if (!fotoSnapshot) {
      alert('Harap ambil foto verifikasi wajah terlebih dahulu sebelum absen!');
      return;
    }

    setLoading(true);
    const now = new Date();
    const tanggalHariIni = now.toLocaleDateString('id-ID');
    const jamSekarang = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const { data: existingData } = await supabase
      .from('absensi')
      .select('*')
      .eq('karyawan_id', karyawanLogin.id)
      .eq('tanggal', tanggalHariIni)
      .single();

    const statusFinal = cekStatusKeterlambatan(jamSekarang, statusAbsen);

    if (jenisAbsen === 'Masuk') {
      if (existingData) {
        const total = hitungDurasiJam(jamSekarang, existingData.jam_pulang);
        await supabase
          .from('absensi')
          .update({ jam_masuk: jamSekarang, total_jam: total, status: statusFinal, lokasi: lokasiUser })
          .eq('id', existingData.id);
      } else {
        await supabase.from('absensi').insert([{
          karyawan_id: karyawanLogin.id,
          id_karyawan: karyawanLogin.id_karyawan || '-',
          nama: karyawanLogin.nama,
          jabatan: karyawanLogin.jabatan,
          tanggal: tanggalHariIni,
          jam_masuk: jamSekarang,
          jam_pulang: '-',
          total_jam: '-',
          status: statusFinal,
          lokasi: lokasiUser
        }]);
      }
      alert(`Absen Masuk berhasil dicatat untuk ${karyawanLogin.nama}!`);
    } else {
      if (existingData) {
        const total = hitungDurasiJam(existingData.jam_masuk, jamSekarang);
        await supabase
          .from('absensi')
          .update({ jam_pulang: jamSekarang, total_jam: total, lokasi: lokasiUser })
          .eq('id', existingData.id);
      } else {
        await supabase.from('absensi').insert([{
          karyawan_id: karyawanLogin.id,
          id_karyawan: karyawanLogin.id_karyawan || '-',
          nama: karyawanLogin.nama,
          jabatan: karyawanLogin.jabatan,
          tanggal: tanggalHariIni,
          jam_masuk: '-',
          jam_pulang: jamSekarang,
          total_jam: '-',
          status: statusFinal,
          lokasi: lokasiUser
        }]);
      }
      alert(`Absen Pulang berhasil dicatat untuk ${karyawanLogin.nama}!`);
    }

    setLoading(false);
    setFotoSnapshot(null);
    setKaryawanLogin(null);
    setSelectedKaryawanId('');
    setInputPin('');
    fetchDataAbsensi();
  };

  const handleHapusKaryawan = async (id: string, nama: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data karyawan "${nama}"?`)) {
      setLoading(true);
      const { error } = await supabase.from('karyawan').delete().eq('id', id);
      setLoading(false);

      if (error) {
        alert('Gagal menghapus karyawan: ' + error.message);
      } else {
        alert(`Karyawan ${nama} berhasil dihapus.`);
        fetchDataKaryawan();
      }
    }
  };

  const handleResetRiwayat = async () => {
    if (window.confirm('PERINGATAN: Semua riwayat absensi akan dihapus permanen. Lanjutkan?')) {
      setLoading(true);
      const { error } = await supabase.from('absensi').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setLoading(false);

      if (error) {
        alert('Gagal mereset riwayat: ' + error.message);
      } else {
        alert('Semua riwayat absensi berhasil dibersihkan.');
        fetchDataAbsensi();
      }
    }
  };

  const handleCetakPDF = () => {
    const printWindow = window.open('', '', 'height=700,width=900');
    if (!printWindow) return;

    let htmlContent = `
      <html>
        <head>
          <title>Laporan Rekapitulasi Absensi Perusahaan</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 22px; color: #1e3a8a; }
            .header p { margin: 4px 0; font-size: 13px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; color: #111; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px; }
            .sign { text-align: center; margin-top: 60px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PT. PERUSAHAAN ENTERPRISE INDONESIA</h1>
            <p><b>LAPORAN RESMI REKAPITULASI KEHADIRAN KARYAWAN</b></p>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Email Gmail</th>
                <th>Tanggal</th>
                <th>Nama Karyawan</th>
                <th>Jabatan</th>
                <th>Masuk</th>
                <th>Pulang</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
    `;

    filteredAbsen.forEach(r => {
      const kryData = daftarKaryawan.find(k => k.id === r.karyawan_id);
      const emailVal = kryData?.email || '-';
      htmlContent += `
        <tr>
          <td>${r.id_karyawan || '-'}</td>
          <td>${emailVal}</td>
          <td>${r.tanggal}</td>
          <td><b>${r.nama}</b></td>
          <td>${r.jabatan}</td>
          <td>${r.jam_masuk}</td>
          <td>${r.jam_pulang}</td>
          <td>${r.status}</td>
        </tr>
      `;
    });

    htmlContent += `
            </tbody>
          </table>
          <div class="footer">
            <div></div>
            <div class="sign">
              <p>Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <br><br><br>
              <p><b>HRD & Operational Manager</b></p>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const filteredAbsen = riwayatAbsen.filter(item => {
    const matchSearch = item.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (item.id_karyawan && item.id_karyawan.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchTanggal = filterTanggal ? item.tanggal.includes(filterTanggal) : true;
    return matchSearch && matchTanggal;
  });

  const totalHadir = riwayatAbsen.filter(r => r.status.includes('Hadir')).length;
  const totalTerlambat = riwayatAbsen.filter(r => r.status.includes('Terlambat')).length;
  const totalIzinSakit = riwayatAbsen.filter(r => r.status === 'Izin' || r.status === 'Sakit' || r.status === 'Cuti').length;

  const exportToExcel = () => {
    if (filteredAbsen.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }
    let csv = "data:text/csv;charset=utf-8,ID Karyawan;Email Gmail;Nama Karyawan;Jabatan;Tanggal;Jam Masuk;Jam Pulang;Total Jam Kerja;Lokasi GPS;Status\n";
    filteredAbsen.forEach(r => {
      const idKry = r.id_karyawan || '-';
      const kryData = daftarKaryawan.find(k => k.id === r.karyawan_id);
      const emailVal = kryData?.email || '-';
      const lok = r.lokasi || '-';
      csv += `"${idKry}";"${emailVal}";"${r.nama}";"${r.jabatan}";${r.tanggal};${r.jam_masuk};${r.jam_pulang};"${r.total_jam}";"${lok}";${r.status}\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `Rekap_Absensi_Enterprise_${new Date().toLocaleDateString('id-ID')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #93c5fd 100%)', 
      padding: '40px 20px', 
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{ 
        width: '100%',
        maxWidth: '1000px', 
        background: 'rgba(255, 255, 255, 0.96)', 
        backdropFilter: 'blur(10px)',
        padding: '32px', 
        borderRadius: '20px', 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)' 
      }}>
        
        {role === 'pilih' && (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏢🔐</div>
            <h1 style={{ color: '#1e293b', marginBottom: '8px', fontSize: '28px', fontWeight: '800' }}>Sistem Absensi Enterprise Terpadu</h1>
            <p style={{ color: '#64748b', marginBottom: '36px', fontSize: '15px' }}>Pilih Nama & PIN, Pendaftaran Mandiri ke Supabase Auth, & Geofencing GPS</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setRole('karyawan')}
                style={{ 
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
                  color: 'white', 
                  padding: '16px 28px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  fontSize: '15px', 
                  fontWeight: 'bold', 
                  cursor: 'pointer', 
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                }}
              >
                👤 Login Karyawan (Pilih Nama & PIN)
              </button>

              <button 
                onClick={() => setRole('daftar_karyawan')}
                style={{ 
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
                  color: 'white', 
                  padding: '16px 28px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  fontSize: '15px', 
                  fontWeight: 'bold', 
                  cursor: 'pointer', 
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                }}
              >
                ✍️ Daftar Akun Karyawan Baru
              </button>
              
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'left', minWidth: '260px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <form onSubmit={handleLoginAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#334155' }}>🔐 Portal Admin:</label>
                  <input 
                    type="password" 
                    placeholder="Password Admin..." 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                  <button type="submit" style={{ background: '#10b981', color: 'white', padding: '8px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                    Login Admin
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {role === 'daftar_karyawan' && (
          <div style={{ padding: '10px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, color: '#1e293b', fontSize: '20px', fontWeight: '700' }}>Pendaftaran Akun Karyawan Mandiri</h2>
              <button onClick={() => setRole('pilih')} style={{ background: '#64748b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>← Kembali</button>
            </div>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>Daftarkan data diri Anda beserta Email Gmail dan PIN (Otomatis tercatat di Supabase Auth & Database).</p>

            <form onSubmit={handlePendaftaranMandiri} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input 
                  type="text" 
                  placeholder="ID Karyawan / NIP (Cth: EMP001)..." 
                  value={regIdKaryawan} 
                  onChange={(e) => setRegIdKaryawan(e.target.value)} 
                  style={{ padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
                <input 
                  type="password" 
                  maxLength={6}
                  placeholder="Buat PIN Rahasia (Cth: 5678)..." 
                  value={regPin} 
                  onChange={(e) => setRegPin(e.target.value)} 
                  style={{ padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>
              <input 
                type="text" 
                placeholder="Nama Lengkap Karyawan..." 
                value={regNama} 
                onChange={(e) => setRegNama(e.target.value)} 
                style={{ padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
              <input 
                type="text" 
                placeholder="Jabatan / Divisi (Cth: Staff IT)..." 
                value={regJabatan} 
                onChange={(e) => setRegJabatan(e.target.value)} 
                style={{ padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
              <input 
                type="email" 
                placeholder="Alamat Email Gmail (Cth: nama@gmail.com)..." 
                value={regEmail} 
                onChange={(e) => setRegEmail(e.target.value)} 
                style={{ padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
              <button type="submit" disabled={loading} style={{ background: '#0284c7', color: 'white', padding: '13px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', marginTop: '6px' }}>
                {loading ? 'Mendaftarkan Akun...' : 'Daftar Akun Sekarang'}
              </button>
            </form>
          </div>
        )}

        {role === 'karyawan' && !karyawanLogin && (
          <div style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#1e293b', fontSize: '20px' }}>Login Karyawan (Pilih Nama & PIN)</h2>
              <button onClick={() => setRole('pilih')} style={{ background: '#64748b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>← Kembali</button>
            </div>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Silakan pilih nama Anda dari daftar di bawah lalu masukkan PIN rahasia Anda.</p>
            
            <form onSubmit={handleLoginKaryawan} style={{ maxWidth: '380px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#334155' }}>Pilih Nama Anda:</label>
                <select 
                  value={selectedKaryawanId}
                  onChange={(e) => setSelectedKaryawanId(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
                >
                  <option value="">-- Pilih Nama Karyawan --</option>
                  {daftarKaryawan.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.nama} — {k.jabatan} [{k.id_karyawan || 'ID'}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#334155' }}>Masukkan PIN Rahasia:</label>
                <input 
                  type="password" 
                  maxLength={6}
                  placeholder="PIN Anda (Cth: 1234)..." 
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', letterSpacing: '3px' }}
                />
              </div>

              <button type="submit" style={{ background: '#2563eb', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', marginTop: '4px' }}>
                Masuk Menu Absensi
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '8px' }}>
                <span onClick={() => setRole('lupa_password')} style={{ color: '#0284c7', cursor: 'pointer', fontWeight: 'bold' }}>
                  🔑 Lupa Password / PIN?
                </span>
                <span onClick={() => setRole('daftar_karyawan')} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 'bold' }}>
                  Daftar Akun Baru
                </span>
              </div>
            </form>
          </div>
        )}

        {role === 'lupa_password' && (
          <div style={{ padding: '20px 10px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, color: '#1e293b', fontSize: '20px', fontWeight: '700' }}>Pemulihan PIN / Lupa Password</h2>
              <button onClick={() => setRole('karyawan')} style={{ background: '#64748b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>← Kembali</button>
            </div>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>Masukkan alamat Email Gmail terdaftar Anda. Supabase Auth akan mengirimkan tautan pemulihan sandi ke email Anda.</p>

            <form onSubmit={handleKirimOTPGmail} style={{ maxWidth: '360px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <input 
                type="email" 
                placeholder="Masukkan Email Gmail Anda..." 
                value={lupaEmail}
                onChange={(e) => setLupaEmail(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
              <button type="submit" disabled={loading} style={{ background: '#0284c7', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                {loading ? 'Mengirim Pemulihan...' : 'Kirim Tautan Pemulihan ke Gmail'}
              </button>
            </form>
          </div>
        )}

        {role === 'karyawan' && karyawanLogin && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: '700' }}>Halo, {karyawanLogin.nama} ({karyawanLogin.jabatan})</h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>Email: {karyawanLogin.email || '-'} | Lokasi: <strong style={{ color: '#0284c7' }}>{lokasiUser}</strong></p>
                {jarakKantorMeter !== null && (
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontWeight: 'bold', color: jarakKantorMeter <= MAKS_RADIUS_METER ? '#16a34a' : '#dc2626' }}>
                    {jarakKantorMeter <= MAKS_RADIUS_METER ? `✔ Dalam Radius Kantor (±${jarakKantorMeter}m)` : `❌ Di Luar Radius Kantor (±${jarakKantorMeter}m > ${MAKS_RADIUS_METER}m)`}
                  </p>
                )}
              </div>
              <button onClick={() => { setKaryawanLogin(null); setSelectedKaryawanId(''); setInputPin(''); }} style={{ background: '#64748b', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Ganti Akun</button>
            </div>

            <form onSubmit={handleKirimAbsen} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#334155' }}>📸 Verifikasi Wajah Karyawan:</label>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <video ref={videoRef} autoPlay playsInline style={{ width: '220px', height: '165px', borderRadius: '8px', background: '#000', objectFit: 'cover' }} />
                  </div>
                  <div>
                    {fotoSnapshot ? (
                      <div style={{ textAlign: 'center' }}>
                        <img src={fotoSnapshot} alt="Snapshot" style={{ width: '220px', height: '165px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #10b981' }} />
                        <p style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', margin: '4px 0 0 0' }}>✔ Wajah Terverifikasi</p>
                      </div>
                    ) : (
                      <div style={{ width: '220px', height: '165px', borderRadius: '8px', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Belum Ambil Foto</span>
                      </div>
                    )}
                  </div>
                </div>
                <button type="button" onClick={ambilFoto} style={{ marginTop: '12px', background: '#0284c7', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                  📷 Ambil Foto Wajah Sekarang
                </button>
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>Kategori Absen:</label>
                  <select 
                    value={jenisAbsen} 
                    onChange={(e) => setJenisAbsen(e.target.value as 'Masuk' | 'Pulang')}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', background: '#fff' }}
                  >
                    <option value="Masuk">🟢 Absen Masuk</option>
                    <option value="Pulang">🔴 Absen Pulang</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>Status Kehadiran:</label>
                  <select 
                    value={statusAbsen} 
                    onChange={(e) => setStatusAbsen(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', background: '#fff' }}
                  >
                    <option value="Hadir">Hadir (Batas Masuk {String(JAM_MASUK_JAM).padStart(2, '0')}:{String(JAM_MASUK_MENIT).padStart(2, '0')})</option>
                    <option value="Izin">Izin</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Cuti">Cuti</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', padding: '14px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginTop: '10px', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)' }}
              >
                {loading ? 'Menyimpan...' : `Kirim Absen ${jenisAbsen} (Dengan Geofencing GPS)`}
              </button>
            </form>
          </div>
        )}

        {role === 'admin' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: '700' }}>Dashboard Admin Enterprise</h2>
                <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 'bold' }}>● Standar Masuk: {String(JAM_MASUK_JAM).padStart(2, '0')}:{String(JAM_MASUK_MENIT).padStart(2, '0')} WIB</span>
              </div>
              <button onClick={() => setRole('pilih')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Logout Admin</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                <span style={{ color: '#1e40af', fontSize: '13px', fontWeight: 'bold' }}>Total Karyawan</span>
                <h3 style={{ margin: '6px 0 0 0', color: '#1e3a8a', fontSize: '24px' }}>{daftarKaryawan.length} Orang</h3>
              </div>
              <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <span style={{ color: '#166534', fontSize: '13px', fontWeight: 'bold' }}>Total Hadir</span>
                <h3 style={{ margin: '6px 0 0 0', color: '#15803d', fontSize: '24px' }}>{totalHadir}</h3>
              </div>
              <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '12px', border: '1px solid #fecaca' }}>
                <span style={{ color: '#991b1b', fontSize: '13px', fontWeight: 'bold' }}>Terlambat</span>
                <h3 style={{ margin: '6px 0 0 0', color: '#b91c1c', fontSize: '24px' }}>{totalTerlambat}</h3>
              </div>
              <div style={{ background: '#fefce8', padding: '16px', borderRadius: '12px', border: '1px solid #fef08a' }}>
                <span style={{ color: '#854d0e', fontSize: '13px', fontWeight: 'bold' }}>Izin / Sakit / Cuti</span>
                <h3 style={{ margin: '6px 0 0 0', color: '#a16207', fontSize: '24px' }}>{totalIzinSakit}</h3>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button 
                onClick={() => setActiveTab('riwayat')}
                style={{ padding: '10px 18px', background: activeTab === 'riwayat' ? '#2563eb' : '#f1f5f9', color: activeTab === 'riwayat' ? 'white' : '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
              >
                📊 Rekap Kehadiran & Filter
              </button>
              <button 
                onClick={() => setActiveTab('karyawan')}
                style={{ padding: '10px 18px', background: activeTab === 'karyawan' ? '#2563eb' : '#f1f5f9', color: activeTab === 'karyawan' ? 'white' : '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
              >
                👥 Kelola Data Karyawan
              </button>
            </div>

            {activeTab === 'riwayat' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                    <input 
                      type="text" 
                      placeholder="🔍 Cari Nama / ID Karyawan..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '200px' }}
                    />
                    <input 
                      type="text" 
                      placeholder="📅 Filter Tanggal (Cth: 10/06)..." 
                      value={filterTanggal}
                      onChange={(e) => setFilterTanggal(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '160px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {filteredAbsen.length > 0 && (
                      <>
                        <button 
                          onClick={exportToExcel}
                          style={{ backgroundColor: '#10b981', color: 'white', padding: '8px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                        >
                          📥 Excel
                        </button>
                        <button 
                          onClick={handleCetakPDF}
                          style={{ backgroundColor: '#0284c7', color: 'white', padding: '8px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                        >
                          🖨️ Cetak PDF Resmi
                        </button>
                      </>
                    )}
                    <button 
                      onClick={handleResetRiwayat}
                      style={{ backgroundColor: '#ef4444', color: 'white', padding: '8px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                    >
                      🗑️ Reset
                    </button>
                  </div>
                </div>

                {filteredAbsen.length === 0 ? (
                  <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>Tidak ada data absensi yang cocok.</p>
                ) : (
                  <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, color: '#475569' }}>
                          <th style={{ padding: '12px' }}>ID</th>
                          <th style={{ padding: '12px' }}>Email Gmail</th>
                          <th style={{ padding: '12px' }}>Tanggal</th>
                          <th style={{ padding: '12px' }}>Nama Karyawan</th>
                          <th style={{ padding: '12px' }}>Jabatan</th>
                          <th style={{ padding: '12px' }}>Masuk</th>
                          <th style={{ padding: '12px' }}>Pulang</th>
                          <th style={{ padding: '12px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAbsen.map((item) => {
                          const kryData = daftarKaryawan.find(k => k.id === item.karyawan_id);
                          return (
                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px', fontWeight: 'bold', color: '#475569' }}>{item.id_karyawan || '-'}</td>
                              <td style={{ padding: '12px', color: '#0284c7', fontSize: '12px' }}>{kryData?.email || '-'}</td>
                              <td style={{ padding: '12px', color: '#64748b' }}>{item.tanggal}</td>
                              <td style={{ padding: '12px', fontWeight: 'bold', color: '#1e293b' }}>{item.nama}</td>
                              <td style={{ padding: '12px', color: '#64748b' }}>{item.jabatan}</td>
                              <td style={{ padding: '12px', color: '#2563eb', fontWeight: 'bold' }}>{item.jam_masuk}</td>
                              <td style={{ padding: '12px', color: '#9333ea', fontWeight: 'bold' }}>{item.jam_pulang}</td>
                              <td style={{ padding: '12px' }}>
                                <span style={{ 
                                  padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', 
                                  backgroundColor: item.status.includes('Terlambat') ? '#fee2e2' : '#dcfce7', 
                                  color: item.status.includes('Terlambat') ? '#991b1b' : '#166534' 
                                }}>
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'karyawan' && (
              <div>
                <h3 style={{ fontSize: '16px', color: '#334155', marginBottom: '12px' }}>Daftar Seluruh Karyawan Terdaftar ({daftarKaryawan.length} Orang)</h3>
                <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {daftarKaryawan.map(k => (
                      <li key={k.id} style={{ padding: '10px 14px', background: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                            {k.id_karyawan || 'ID-'}
                          </span>
                          <div>
                            <strong style={{ color: '#1e293b', display: 'block' }}>{k.nama} <span style={{ fontSize: '11px', color: '#64748b' }}>(PIN: {k.pin || '1234'})</span></strong>
                            <span style={{ color: '#0284c7', fontSize: '12px', display: 'block' }}>{k.email || 'Tanpa Email'}</span>
                            <span style={{ color: '#64748b', fontSize: '11px' }}>{k.jabatan}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleHapusKaryawan(k.id, k.nama)}
                          style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                        >
                          🗑️ Hapus
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
