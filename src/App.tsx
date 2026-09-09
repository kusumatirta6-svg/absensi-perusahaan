import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

interface Karyawan {
  id: string;
  id_karyawan: string;
  nama: string;
  jabatan: string;
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
  foto_url?: string;
}

export default function App() {
  const [role, setRole] = useState<'pilih' | 'karyawan' | 'admin'>('pilih');
  const [adminPassword, setAdminPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'absen' | 'karyawan' | 'riwayat'>('absen');

  const [daftarKaryawan, setDaftarKaryawan] = useState<Karyawan[]>([]);
  const [riwayatAbsen, setRiwayatAbsen] = useState<Absen[]>([]);
  const [loading, setLoading] = useState(false);

  // Form States Karyawan Baru
  const [idKaryawanBaru, setIdKaryawanBaru] = useState('');
  const [namaBaru, setNamaBaru] = useState('');
  const [jabatanBaru, setJabatanBaru] = useState('');

  // Form States Absen
  const [selectedKaryawan, setSelectedKaryawan] = useState('');
  const [jenisAbsen, setJenisAbsen] = useState<'Masuk' | 'Pulang'>('Masuk');
  const [statusAbsen, setStatusAbsen] = useState('Hadir');

  // Fitur GPS & Kamera State
  const [lokasiUser, setLokasiUser] = useState<string>('Mendeteksi lokasi...');
  const [koordinat, setKoordinat] = useState<{lat: number, lng: number} | null>(null);
  const [fotoSnapshot, setFotoSnapshot] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchDataKaryawan();
    fetchDataAbsensi();
  }, []);

  // Aktifkan Kamera saat masuk menu Karyawan
  useEffect(() => {
    if (role === 'karyawan') {
      startCamera();
      ambilLokasiGPS();
    } else {
      stopCamera();
    }
  }, [role]);

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
        alert('Verifikasi wajah / foto berhasil diambil!');
      }
    }
  };

  const ambilLokasiGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setKoordinat({ lat, lng });
          setLokasiUser(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
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

  const handleLoginAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'admin123') { // Ganti password admin jika diinginkan
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

  const handleKirimAbsen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKaryawan) {
      alert('Silakan pilih nama Anda terlebih dahulu.');
      return;
    }
    if (!fotoSnapshot) {
      alert('Harap ambil foto verifikasi wajah terlebih dahulu sebelum absen!');
      return;
    }

    const kObj = daftarKaryawan.find(k => k.id === selectedKaryawan);
    if (!kObj) return;

    setLoading(true);
    const now = new Date();
    const tanggalHariIni = now.toLocaleDateString('id-ID');
    const jamSekarang = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const { data: existingData } = await supabase
      .from('absensi')
      .select('*')
      .eq('karyawan_id', selectedKaryawan)
      .eq('tanggal', tanggalHariIni)
      .single();

    if (jenisAbsen === 'Masuk') {
      if (existingData) {
        const total = hitungDurasiJam(jamSekarang, existingData.jam_pulang);
        await supabase
          .from('absensi')
          .update({ jam_masuk: jamSekarang, total_jam: total, status: statusAbsen, lokasi: lokasiUser })
          .eq('id', existingData.id);
      } else {
        await supabase.from('absensi').insert([{
          karyawan_id: selectedKaryawan,
          id_karyawan: kObj.id_karyawan || '-',
          nama: kObj.nama,
          jabatan: kObj.jabatan,
          tanggal: tanggalHariIni,
          jam_masuk: jamSekarang,
          jam_pulang: '-',
          total_jam: '-',
          status: statusAbsen,
          lokasi: lokasiUser
        }]);
      }
      alert(`Absen Masuk berhasil dicatat untuk ${kObj.nama} beserta koordinat lokasi.`);
    } else {
      if (existingData) {
        const total = hitungDurasiJam(existingData.jam_masuk, jamSekarang);
        await supabase
          .from('absensi')
          .update({ jam_pulang: jamSekarang, total_jam: total, lokasi: lokasiUser })
          .eq('id', existingData.id);
      } else {
        await supabase.from('absensi').insert([{
          karyawan_id: selectedKaryawan,
          id_karyawan: kObj.id_karyawan || '-',
          nama: kObj.nama,
          jabatan: kObj.jabatan,
          tanggal: tanggalHariIni,
          jam_masuk: '-',
          jam_pulang: jamSekarang,
          total_jam: '-',
          status: statusAbsen,
          lokasi: lokasiUser
        }]);
      }
      alert(`Absen Pulang berhasil dicatat untuk ${kObj.nama}!`);
    }

    setLoading(false);
    setFotoSnapshot(null);
    fetchDataAbsensi();
  };

  const handleTambahKaryawan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idKaryawanBaru.trim() || !namaBaru.trim() || !jabatanBaru.trim()) {
      alert('Semua kolom wajib diisi!');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('karyawan').insert([
      { id_karyawan: idKaryawanBaru, nama: namaBaru, jabatan: jabatanBaru }
    ]);
    setLoading(false);

    if (error) {
      alert('Gagal menambahkan karyawan: ' + error.message);
    } else {
      alert('Karyawan baru berhasil ditambahkan!');
      setIdKaryawanBaru('');
      setNamaBaru('');
      setJabatanBaru('');
      fetchDataKaryawan();
    }
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

  const exportToExcel = () => {
    if (riwayatAbsen.length === 0) {
      alert('Belum ada data absensi.');
      return;
    }
    let csv = "data:text/csv;charset=utf-8,ID Karyawan;Nama Karyawan;Jabatan;Tanggal;Jam Masuk;Jam Pulang;Total Jam Kerja;Lokasi GPS;Status\n";
    riwayatAbsen.forEach(r => {
      const idKry = r.id_karyawan || '-';
      const lok = r.lokasi || '-';
      csv += `"${idKry}";"${r.nama}";"${r.jabatan}";${r.tanggal};${r.jam_masuk};${r.jam_pulang};"${r.total_jam}";"${lok}";${r.status}\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `Rekap_Absensi_GPS_${new Date().toLocaleDateString('id-ID')}.csv`);
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
        maxWidth: '950px', 
        background: 'rgba(255, 255, 255, 0.95)', 
        backdropFilter: 'blur(10px)',
        padding: '32px', 
        borderRadius: '20px', 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)' 
      }}>
        
        {/* PILIH ROLE */}
        {role === 'pilih' && (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📍📸</div>
            <h1 style={{ color: '#1e293b', marginBottom: '8px', fontSize: '28px', fontWeight: '800' }}>Sistem Absensi Berbasis GPS & Wajah</h1>
            <p style={{ color: '#64748b', marginBottom: '36px', fontSize: '15px' }}>Dilengkapi verifikasi titik lokasi akurat dan tangkapan kamera real-time</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setRole('karyawan')}
                style={{ 
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
                  color: 'white', 
                  padding: '18px 32px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  fontSize: '16px', 
                  fontWeight: 'bold', 
                  cursor: 'pointer', 
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                }}
              >
                👤 Masuk sebagai Karyawan
              </button>
              
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'left', minWidth: '260px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <form onSubmit={handleLoginAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#334155' }}>🔐 Portal Admin:</label>
                  <input 
                    type="password" 
                    placeholder="Masukkan Password Admin..." 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  />
                  <button type="submit" style={{ background: '#10b981', color: 'white', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                    Login Admin
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* PORTAL KARYAWAN DENGAN KAMERA & GPS */}
        {role === 'karyawan' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: '700' }}>Absensi Kehadiran & Verifikasi Wajah</h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>Lokasi Anda: <strong style={{ color: '#0284c7' }}>{lokasiUser}</strong></p>
              </div>
              <button onClick={() => setRole('pilih')} style={{ background: '#64748b', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>← Kembali</button>
            </div>

            <form onSubmit={handleKirimAbsen} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* TAMPILAN KAMERA & VERIFIKASI WAJAH */}
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

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>Pilih Nama / ID Karyawan:</label>
                <select 
                  value={selectedKaryawan} 
                  onChange={(e) => setSelectedKaryawan(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', background: '#fff' }}
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {daftarKaryawan.map(k => (
                    <option key={k.id} value={k.id}>
                      [{k.id_karyawan || 'ID-'}] {k.nama} — {k.jabatan}
                    </option>
                  ))}
                </select>
              </div>

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
                    <option value="Hadir">Hadir</option>
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
                {loading ? 'Menyimpan...' : `Kirim Absen ${jenisAbsen} (Dengan GPS & Wajah)`}
              </button>
            </form>
          </div>
        )}

        {/* DASHBOARD ADMIN */}
        {role === 'admin' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: '700' }}>Dashboard Admin Eksekutif</h2>
                <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 'bold' }}>● Cloud Supabase (GPS & Wajah Terintegrasi)</span>
              </div>
              <button onClick={() => setRole('pilih')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Logout Admin</button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <button 
                onClick={() => setActiveTab('riwayat')}
                style={{ padding: '10px 18px', background: activeTab === 'riwayat' ? '#2563eb' : '#f1f5f9', color: activeTab === 'riwayat' ? 'white' : '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
              >
                📊 Rekap Kehadiran & Lokasi
              </button>
              <button 
                onClick={() => setActiveTab('karyawan')}
                style={{ padding: '10px 18px', background: activeTab === 'karyawan' ? '#2563eb' : '#f1f5f9', color: activeTab === 'karyawan' ? 'white' : '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
              >
                👥 Kelola Karyawan (50+)
              </button>
            </div>

            {/* TAB REKAP DENGAN KOLOM LOKASI */}
            {activeTab === 'riwayat' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>Daftar Rekapitulasi Absensi & Koordinat</h3>
                  {riwayatAbsen.length > 0 && (
                    <button 
                      onClick={exportToExcel}
                      style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)' }}
                    >
                      📥 Download Excel (Beserta GPS)
                    </button>
                  )}
                </div>

                {riwayatAbsen.length === 0 ? (
                  <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>Belum ada data absensi tercatat.</p>
                ) : (
                  <div style={{ overflowX: 'auto', maxHeight: '420px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, color: '#475569' }}>
                          <th style={{ padding: '12px' }}>ID</th>
                          <th style={{ padding: '12px' }}>Tanggal</th>
                          <th style={{ padding: '12px' }}>Nama Karyawan</th>
                          <th style={{ padding: '12px' }}>Jabatan</th>
                          <th style={{ padding: '12px' }}>Masuk</th>
                          <th style={{ padding: '12px' }}>Pulang</th>
                          <th style={{ padding: '12px' }}>Total Kerja</th>
                          <th style={{ padding: '12px' }}>Titik GPS</th>
                          <th style={{ padding: '12px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {riwayatAbsen.map((item) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#475569' }}>{item.id_karyawan || '-'}</td>
                            <td style={{ padding: '12px', color: '#64748b' }}>{item.tanggal}</td>
                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#1e293b' }}>{item.nama}</td>
                            <td style={{ padding: '12px', color: '#64748b' }}>{item.jabatan}</td>
                            <td style={{ padding: '12px', color: '#2563eb', fontWeight: 'bold' }}>{item.jam_masuk}</td>
                            <td style={{ padding: '12px', color: '#9333ea', fontWeight: 'bold' }}>{item.jam_pulang}</td>
                            <td style={{ padding: '12px', color: '#059669', fontWeight: 'bold' }}>{item.total_jam}</td>
                            <td style={{ padding: '12px', color: '#0284c7', fontSize: '11px', fontWeight: '500' }}>{item.lokasi || '-'}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#166534' }}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB KELOLA KARYAWAN */}
            {activeTab === 'karyawan' && (
              <div>
                <h3 style={{ fontSize: '16px', color: '#334155', marginBottom: '12px' }}>Pendaftaran Karyawan Baru (50+ Pegawai)</h3>
                <form onSubmit={handleTambahKaryawan} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <input 
                    type="text" 
                    placeholder="ID Karyawan / NIP (Contoh: EMP001)..." 
                    value={idKaryawanBaru} 
                    onChange={(e) => setIdKaryawanBaru(e.target.value)} 
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                  <input 
                    type="text" 
                    placeholder="Nama Lengkap Karyawan..." 
                    value={namaBaru} 
                    onChange={(e) => setNamaBaru(e.target.value)} 
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                  <input 
                    type="text" 
                    placeholder="Jabatan / Divisi..." 
                    value={jabatanBaru} 
                    onChange={(e) => setJabatanBaru(e.target.value)} 
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                  <button type="submit" disabled={loading} style={{ background: '#10b981', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                    {loading ? 'Menambahkan...' : '+ Daftarkan Karyawan Baru'}
                  </button>
                </form>

                <h4 style={{ fontSize: '15px', color: '#334155', marginBottom: '8px' }}>Daftar Karyawan Terdaftar ({daftarKaryawan.length} Orang)</h4>
                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {daftarKaryawan.map(k => (
                      <li key={k.id} style={{ padding: '10px 14px', background: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                            {k.id_karyawan || 'ID-'}
                          </span>
                          <div>
                            <strong style={{ color: '#1e293b', display: 'block' }}>{k.nama}</strong>
                            <span style={{ color: '#64748b', fontSize: '12px' }}>{k.jabatan}</span>
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
