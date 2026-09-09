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

interface PengaturanKantor {
  id: string;
  nama_perusahaan: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
}

export default function App() {
  const [role, setRole] = useState<'pilih' | 'karyawan' | 'daftar_karyawan' | 'lupa_password' | 'admin'>('pilih');
  const [adminPassword, setAdminPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'absen' | 'karyawan' | 'riwayat' | 'pengaturan'>('absen');

  const [daftarKaryawan, setDaftarKaryawan] = useState<Karyawan[]>([]);
  const [riwayatAbsen, setRiwayatAbsen] = useState<Absen[]>([]);
  const [loading, setLoading] = useState(false);

  const [kantorConfig, setKantorConfig] = useState<PengaturanKantor>({
    id: '',
    nama_perusahaan: 'PT. Perusahaan Enterprise Indonesia',
    latitude: -6.1751,
    longitude: 106.8650,
    radius_meter: 200
  });

  const [inputNamaPerusahaan, setInputNamaPerusahaan] = useState('PT. Perusahaan Enterprise Indonesia');
  const [inputLat, setInputLat] = useState('-6.1751');
  const [inputLng, setInputLng] = useState('106.8650');
  const [inputRadius, setInputRadius] = useState('200');

  const [regIdKaryawan, setRegIdKaryawan] = useState('');
  const [regNama, setRegNama] = useState('');
  const [regJabatan, setRegJabatan] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPin, setRegPin] = useState('');

  const [selectedKaryawanId, setSelectedKaryawanId] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [karyawanLogin, setKaryawanLogin] = useState<Karyawan | null>(null);

  const [lupaEmail, setLupaEmail] = useState('');
  const [jenisAbsen, setJenisAbsen] = useState<'Masuk' | 'Pulang'>('Masuk');
  const [statusAbsen, setStatusAbsen] = useState('Hadir');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTanggal, setFilterTanggal] = useState('');

  const [lokasiUser, setLokasiUser] = useState<string>('Mendeteksi lokasi...');
  const [jarakKantorMeter, setJarakKantorMeter] = useState<number | null>(null);
  const [fotoSnapshot, setFotoSnapshot] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const JAM_MASUK_JAM = 8;
  const JAM_MASUK_MENIT = 0;

  useEffect(() => {
    fetchDataKaryawan();
    fetchDataAbsensi();
    fetchPengaturanKantor();
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

  const fetchPengaturanKantor = async () => {
    try {
      const { data, error } = await supabase.from('pengaturan_kantor').select('*').limit(1).maybeSingle();
      if (!error && data) {
        setKantorConfig(data);
        setInputNamaPerusahaan(data.nama_perusahaan || '');
        setInputLat(data.latitude?.toString() || '-6.1751');
        setInputLng(data.longitude?.toString() || '106.8650');
        setInputRadius(data.radius_meter?.toString() || '200');
      }
    } catch (e) {
      console.log('Menggunakan konfigurasi default kantor');
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
          const targetLat = kantorConfig?.latitude ?? -6.1751;
          const targetLng = kantorConfig?.longitude ?? 106.8650;
          const jarak = hitungJarakGPS(lat, lng, targetLat, targetLng);
          setJarakKantorMeter(Math.round(jarak));
          setLokasiUser(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)} (Jarak ±${Math.round(jarak)}m)`);
        },
        () => {
          setLokasiUser('Gagal mendeteksi GPS (Izin lokasi ditolak)');
        }
      );
    } else {
      setLokasiUser('GPS tidak didukung browser');
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

  const handleSimpanPengaturanKantor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputLat || !inputLng || !inputRadius) {
      alert('Semua kolom wajib diisi!');
      return;
    }

    setLoading(true);
    if (kantorConfig.id) {
      const { error } = await supabase.from('pengaturan_kantor').update({
        nama_perusahaan: inputNamaPerusahaan,
        latitude: parseFloat(inputLat),
        longitude: parseFloat(inputLng),
        radius_meter: parseInt(inputRadius)
      }).eq('id', kantorConfig.id);

      setLoading(false);
      if (error) alert('Gagal: ' + error.message);
      else { alert('Pengaturan diperbarui!'); fetchPengaturanKantor(); }
    } else {
      const { error } = await supabase.from('pengaturan_kantor').insert([{
        nama_perusahaan: inputNamaPerusahaan,
        latitude: parseFloat(inputLat),
        longitude: parseFloat(inputLng),
        radius_meter: parseInt(inputRadius)
      }]);

      setLoading(false);
      if (error) alert('Gagal: ' + error.message);
      else { alert('Pengaturan disimpan!'); fetchPengaturanKantor(); }
    }
  };

  const handleLoginKaryawan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKaryawanId) {
      alert('Pilih nama karyawan terlebih dahulu.');
      return;
    }
    const found = daftarKaryawan.find(k => k.id === selectedKaryawanId);
    if (!found) return;

    const pinUser = found.pin || '1234';
    if (inputPin === pinUser) {
      setKaryawanLogin(found);
      alert(`Selamat datang, ${found.nama}!`);
    } else {
      alert('PIN Rahasia salah!');
    }
  };

  const handlePendaftaranMandiri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regIdKaryawan.trim() || !regNama.trim() || !regJabatan.trim() || !regEmail.trim() || !regPin.trim()) {
      alert('Semua kolom wajib diisi!');
      return;
    }

    setLoading(true);
    await supabase.auth.signUp({
      email: regEmail,
      password: regPin,
      options: { data: { nama: regNama, jabatan: regJabatan } }
    });

    const { error: dbError } = await supabase.from('karyawan').insert([
      { id_karyawan: regIdKaryawan, nama: regNama, jabatan: regJabatan, email: regEmail, pin: regPin }
    ]);
    
    setLoading(false);
    if (dbError) alert('Gagal mendaftar: ' + dbError.message);
    else {
      alert('Akun berhasil dibuat! Silakan login.');
      setRegIdKaryawan(''); setRegNama(''); setRegJabatan(''); setRegEmail(''); setRegPin('');
      setRole('karyawan');
      fetchDataKaryawan();
    }
  };

  const handleKirimOTPGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lupaEmail.trim()) {
      alert('Masukkan email.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(lupaEmail, { redirectTo: window.location.origin });
    setLoading(false);

    if (error) alert('Gagal: ' + error.message);
    else {
      alert(`Instruksi pemulihan dikirim ke: ${lupaEmail}.`);
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

    const maxRadius = kantorConfig?.radius_meter ?? 200;
    if (jarakKantorMeter !== null && jarakKantorMeter > maxRadius) {
      alert(`GAGAL: Di luar radius kantor (${jarakKantorMeter}m > ${maxRadius}m).`);
      return;
    }

    if (!fotoSnapshot) {
      alert('Ambil foto verifikasi wajah terlebih dahulu!');
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
      .maybeSingle();

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
      alert(`Absen Masuk berhasil dicatat!`);
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
      alert(`Absen Pulang berhasil dicatat!`);
    }

    setLoading(false);
    setFotoSnapshot(null);
    setKaryawanLogin(null);
    setSelectedKaryawanId('');
    setInputPin('');
    fetchDataAbsensi();
  };

  const handleHapusKaryawan = async (id: string, nama: string) => {
    if (window.confirm(`Hapus karyawan "${nama}"?`)) {
      setLoading(true);
      const { error } = await supabase.from('karyawan').delete().eq('id', id);
      setLoading(false);
      if (error) alert('Gagal: ' + error.message);
      else { alert('Terhapus.'); fetchDataKaryawan(); }
    }
  };

  const handleResetRiwayat = async () => {
    if (window.confirm('Bersihkan semua riwayat absensi?')) {
      setLoading(true);
      const { error } = await supabase.from('absensi').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setLoading(false);
      if (error) alert('Gagal: ' + error.message);
      else { alert('Riwayat dibersihkan.'); fetchDataAbsensi(); }
    }
  };

  const filteredAbsen = riwayatAbsen.filter(item => {
    const matchSearch = item.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (item.id_karyawan && item.id_karyawan.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchTanggal = filterTanggal ? item.tanggal.includes(filterTanggal) : true;
    return matchSearch && matchTanggal;
  });

  const totalHadir = riwayatAbsen.filter(r => r.status?.includes('Hadir')).length;
  const totalTerlambat = riwayatAbsen.filter(r => r.status?.includes('Terlambat')).length;
  const totalIzinSakit = riwayatAbsen.filter(r => r.status === 'Izin' || r.status === 'Sakit' || r.status === 'Cuti').length;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #93c5fd 100%)', padding: '40px 20px', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '1000px', background: 'rgba(255, 255, 255, 0.96)', backdropFilter: 'blur(10px)', padding: '32px', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
        
        {role === 'pilih' && (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏢📍</div>
            <h1 style={{ color: '#1e293b', marginBottom: '8px', fontSize: '28px', fontWeight: '800' }}>{kantorConfig?.nama_perusahaan || 'Sistem Absensi'}</h1>
            <p style={{ color: '#64748b', marginBottom: '36px', fontSize: '15px' }}>Sistem Absensi Enterprise Terpadu</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <button onClick={() => setRole('karyawan')} style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', padding: '16px 28px', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>👤 Login Karyawan</button>
              <button onClick={() => setRole('daftar_karyawan')} style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: 'white', padding: '16px 28px', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>✍️ Daftar Akun Baru</button>
              
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'left', minWidth: '260px' }}>
                <form onSubmit={handleLoginAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#334155' }}>🔐 Portal Admin:</label>
                  <input type="password" placeholder="Password Admin..." value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  <button type="submit" style={{ background: '#10b981', color: 'white', padding: '8px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>Login Admin</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {role === 'daftar_karyawan' && (
          <div style={{ padding: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, color: '#1e293b', fontSize: '20px' }}>Pendaftaran Akun</h2>
              <button onClick={() => setRole('pilih')} style={{ background: '#64748b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>← Kembali</button>
            </div>
            <form onSubmit={handlePendaftaranMandiri} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input type="text" placeholder="ID Karyawan..." value={regIdKaryawan} onChange={(e) => setRegIdKaryawan(e.target.value)} style={{ padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                <input type="password" maxLength={6} placeholder="PIN Rahasia..." value={regPin} onChange={(e) => setRegPin(e.target.value)} style={{ padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              <input type="text" placeholder="Nama Lengkap..." value={regNama} onChange={(e) => setRegNama(e.target.value)} style={{ padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input type="text" placeholder="Jabatan..." value={regJabatan} onChange={(e) => setRegJabatan(e.target.value)} style={{ padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input type="email" placeholder="Email Gmail..." value={regEmail} onChange={(e) => setRegEmail(e.target.value)} style={{ padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <button type="submit" disabled={loading} style={{ background: '#0284c7', color: 'white', padding: '13px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>{loading ? 'Memproses...' : 'Daftar'}</button>
            </form>
          </div>
        )}

        {role === 'karyawan' && !karyawanLogin && (
          <div style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#1e293b', fontSize: '20px' }}>Login Karyawan</h2>
              <button onClick={() => setRole('pilih')} style={{ background: '#64748b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>← Kembali</button>
            </div>
            <form onSubmit={handleLoginKaryawan} style={{ maxWidth: '380px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#334155' }}>Pilih Nama:</label>
                <select value={selectedKaryawanId} onChange={(e) => setSelectedKaryawanId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}>
                  <option value="">-- Pilih Nama Karyawan --</option>
                  {daftarKaryawan.map(k => <option key={k.id} value={k.id}>{k.nama} — {k.jabatan}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#334155' }}>PIN:</label>
                <input type="password" maxLength={6} placeholder="PIN..." value={inputPin} onChange={(e) => setInputPin(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', letterSpacing: '3px' }} />
              </div>
              <button type="submit" style={{ background: '#2563eb', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Masuk</button>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '8px' }}>
                <span onClick={() => setRole('lupa_password')} style={{ color: '#0284c7', cursor: 'pointer', fontWeight: 'bold' }}>Lupa PIN?</span>
                <span onClick={() => setRole('daftar_karyawan')} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 'bold' }}>Daftar Akun</span>
              </div>
            </form>
          </div>
        )}

        {role === 'lupa_password' && (
          <div style={{ padding: '20px 10px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, color: '#1e293b', fontSize: '20px' }}>Pemulihan PIN</h2>
              <button onClick={() => setRole('karyawan')} style={{ background: '#64748b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>← Kembali</button>
            </div>
            <form onSubmit={handleKirimOTPGmail} style={{ maxWidth: '360px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <input type="email" placeholder="Email Gmail..." value={lupaEmail} onChange={(e) => setLupaEmail(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <button type="submit" disabled={loading} style={{ background: '#0284c7', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Kirim Pemulihan</button>
            </form>
          </div>
        )}

        {role === 'karyawan' && karyawanLogin && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px' }}>Halo, {karyawanLogin.nama}</h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>Lokasi: <strong style={{ color: '#0284c7' }}>{lokasiUser}</strong></p>
              </div>
              <button onClick={() => { setKaryawanLogin(null); setSelectedKaryawanId(''); setInputPin(''); }} style={{ background: '#64748b', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer' }}>Ganti Akun</button>
            </div>

            <form onSubmit={handleKirimAbsen} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#334155' }}>📸 Verifikasi Wajah:</label>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <video ref={videoRef} autoPlay playsInline style={{ width: '220px', height: '165px', borderRadius: '8px', background: '#000', objectFit: 'cover' }} />
                  {fotoSnapshot ? (
                    <div>
                      <img src={fotoSnapshot} alt="Snapshot" style={{ width: '220px', height: '165px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #10b981' }} />
                      <p style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', margin: '4px 0 0 0' }}>✔ Terverifikasi</p>
                    </div>
                  ) : (
                    <div style={{ width: '220px', height: '165px', borderRadius: '8px', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Belum Foto</span>
                    </div>
                  )}
                </div>
                <button type="button" onClick={ambilFoto} style={{ marginTop: '12px', background: '#0284c7', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Ambil Foto</button>
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>Kategori:</label>
                  <select value={jenisAbsen} onChange={(e) => setJenisAbsen(e.target.value as 'Masuk' | 'Pulang')} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}>
                    <option value="Masuk">🟢 Absen Masuk</option>
                    <option value="Pulang">🔴 Absen Pulang</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>Status:</label>
                  <select value={statusAbsen} onChange={(e) => setStatusAbsen(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}>
                    <option value="Hadir">Hadir</option>
                    <option value="Izin">Izin</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Cuti">Cuti</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', padding: '14px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>{loading ? 'Menyimpan...' : 'Kirim Absen'}</button>
            </form>
          </div>
        )}

        {role === 'admin' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>
              <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px' }}>Dashboard Admin</h2>
              <button onClick={() => setRole('pilih')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer' }}>Logout</button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button onClick={() => setActiveTab('riwayat')} style={{ padding: '10px 18px', background: activeTab === 'riwayat' ? '#2563eb' : '#f1f5f9', color: activeTab === 'riwayat' ? 'white' : '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📊 Rekap</button>
              <button onClick={() => setActiveTab('karyawan')} style={{ padding: '10px 18px', background: activeTab === 'karyawan' ? '#2563eb' : '#f1f5f9', color: activeTab === 'karyawan' ? 'white' : '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>👥 Karyawan</button>
              <button onClick={() => setActiveTab('pengaturan')} style={{ padding: '10px 18px', background: activeTab === 'pengaturan' ? '#2563eb' : '#f1f5f9', color: activeTab === 'pengaturan' ? 'white' : '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>⚙️ Pengaturan GPS</button>
            </div>

            {activeTab === 'riwayat' && (
              <div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <input type="text" placeholder="Cari Nama..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  <button onClick={handleResetRiwayat} style={{ backgroundColor: '#ef4444', color: 'white', padding: '8px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Reset Riwayat</button>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px' }}>Tanggal</th>
                        <th style={{ padding: '12px' }}>Nama</th>
                        <th style={{ padding: '12px' }}>Masuk</th>
                        <th style={{ padding: '12px' }}>Pulang</th>
                        <th style={{ padding: '12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAbsen.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px' }}>{item.tanggal}</td>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.nama}</td>
                          <td style={{ padding: '12px', color: '#2563eb' }}>{item.jam_masuk}</td>
                          <td style={{ padding: '12px', color: '#9333ea' }}>{item.jam_pulang}</td>
                          <td style={{ padding: '12px' }}>{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'karyawan' && (
              <div>
                <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Daftar Karyawan ({daftarKaryawan.length})</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {daftarKaryawan.map(k => (
                    <li key={k.id} style={{ padding: '10px 14px', background: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{k.nama} ({k.jabatan})</span>
                      <button onClick={() => handleHapusKaryawan(k.id, k.nama)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Hapus</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === 'pengaturan' && (
              <div>
                <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>⚙️ Pengaturan Titik Koordinat Kantor</h3>
                <form onSubmit={handleSimpanPengaturanKantor} style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <input type="text" value={inputNamaPerusahaan} onChange={(e) => setInputNamaPerusahaan(e.target.value)} placeholder="Nama Perusahaan" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input type="text" placeholder="Latitude" value={inputLat} onChange={(e) => setInputLat(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    <input type="text" placeholder="Longitude" value={inputLng} onChange={(e) => setInputLng(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <input type="number" placeholder="Radius (Meter)" value={inputRadius} onChange={(e) => setInputRadius(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  <button type="submit" disabled={loading} style={{ background: '#10b981', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Simpan Pengaturan</button>
                </form>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
