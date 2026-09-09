import React, { useState, useEffect } from 'react';
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

  // Ambil Data dari Supabase saat pertama kali buka
  useEffect(() => {
    fetchDataKaryawan();
    fetchDataAbsensi();
  }, []);

  const fetchDataKaryawan = async () => {
    const { data, error } = await supabase.from('karyawan').select('*').order('nama', { ascending: true });
    if (!error && data) {
      setDaftarKaryawan(data);
    }
  };

  const fetchDataAbsensi = async () => {
    const { data, error } = await supabase.from('absensi').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setRiwayatAbsen(data);
    }
  };

  // Login Admin (Ganti 'Moon1729' dengan password rahasia Anda)
  const handleLoginAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'admin123') {
      setRole('admin');
      setActiveTab('riwayat');
    } else {
      alert('Password Admin salah!');
    }
  };

  // Helper Hitung Durasi Jam Kerja
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

  // Kirim Absen (Masuk / Pulang) secara Real-time ke Supabase
  const handleKirimAbsen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKaryawan) {
      alert('Silakan pilih nama Anda terlebih dahulu.');
      return;
    }

    const kObj = daftarKaryawan.find(k => k.id === selectedKaryawan);
    if (!kObj) return;

    setLoading(true);
    const now = new Date();
    const tanggalHariIni = now.toLocaleDateString('id-ID');
    const jamSekarang = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Cek apakah sudah ada absen untuk hari ini
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
          .update({ jam_masuk: jamSekarang, total_jam: total, status: statusAbsen })
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
          status: statusAbsen
        }]);
      }
      alert(`Absen Masuk berhasil dicatat, ${kObj.nama}!`);
    } else {
      // Pulang
      if (existingData) {
        const total = hitungDurasiJam(existingData.jam_masuk, jamSekarang);
        await supabase
          .from('absensi')
          .update({ jam_pulang: jamSekarang, total_jam: total })
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
          status: statusAbsen
        }]);
      }
      alert(`Absen Pulang berhasil dicatat, ${kObj.nama}! Hati-hati di jalan.`);
    }

    setLoading(false);
    fetchDataAbsensi();
  };

  // Tambah Karyawan Baru dengan ID Karyawan / NIP
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
      alert('Karyawan baru dengan ID berhasil ditambahkan!');
      setIdKaryawanBaru('');
      setNamaBaru('');
      setJabatanBaru('');
      fetchDataKaryawan();
    }
  };

  // Download Excel Khusus Admin (Dengan Kolom ID Karyawan di Depan)
  const exportToExcel = () => {
    if (riwayatAbsen.length === 0) {
      alert('Belum ada data absensi.');
      return;
    }
    let csv = "data:text/csv;charset=utf-8,ID Karyawan;Nama Karyawan;Jabatan;Tanggal;Jam Masuk;Jam Pulang;Total Jam Kerja;Status\n";
    riwayatAbsen.forEach(r => {
      const idKry = r.id_karyawan || '-';
      csv += `"${idKry}";"${r.nama}";"${r.jabatan}";${r.tanggal};${r.jam_masuk};${r.jam_pulang};"${r.total_jam}";${r.status}\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `Rekap_Absensi_ID_${new Date().toLocaleDateString('id-ID')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        
        {/* PEMILIHAN PERAN */}
        {role === 'pilih' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <h1 style={{ color: '#1f2937', marginBottom: '8px' }}>Sistem Absensi Perusahaan Profesional</h1>
            <p style={{ color: '#6b7280', marginBottom: '32px' }}>Dilengkapi ID Karyawan / NIP, Real-Time Cloud, & Portal Admin</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setRole('karyawan')}
                style={{ background: '#2563eb', color: 'white', padding: '16px 32px', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                👤 Masuk sebagai Karyawan
              </button>
              
              <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #d1d5db', textAlign: 'left' }}>
                <form onSubmit={handleLoginAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#374151' }}>🔐 Login Khusus Admin:</label>
                  <input 
                    type="password" 
                    placeholder="Password Admin..." 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                  />
                  <button type="submit" style={{ background: '#16a34a', color: 'white', padding: '8px', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                    Masuk Admin
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* PORTAL KARYAWAN */}
        {role === 'karyawan' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: '20px' }}>Portal Absensi Karyawan</h2>
              <button onClick={() => setRole('pilih')} style={{ background: '#9ca3af', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Kembali</button>
            </div>

            <form onSubmit={handleKirimAbsen} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Pilih Nama / ID Karyawan:</label>
                <select 
                  value={selectedKaryawan} 
                  onChange={(e) => setSelectedKaryawan(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '15px' }}
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {daftarKaryawan.map(k => (
                    <option key={k.id} value={k.id}>
                      [{k.id_karyawan || 'Tanpa ID'}] {k.nama} — {k.jabatan}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Kategori Absen:</label>
                  <select 
                    value={jenisAbsen} 
                    onChange={(e) => setJenisAbsen(e.target.value as 'Masuk' | 'Pulang')}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  >
                    <option value="Masuk">Absen Masuk</option>
                    <option value="Pulang">Absen Pulang</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Keterangan:</label>
                  <select 
                    value={statusAbsen} 
                    onChange={(e) => setStatusAbsen(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
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
                style={{ background: '#2563eb', color: 'white', padding: '14px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginTop: '10px' }}
              >
                {loading ? 'Menyimpan...' : `Kirim Absen ${jenisAbsen} Sekarang`}
              </button>
            </form>
          </div>
        )}

        {/* DASHBOARD ADMIN EKSKLUSIF */}
        {role === 'admin' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1f2937', fontSize: '20px' }}>Dashboard Admin Perusahaan</h2>
                <span style={{ color: '#16a34a', fontSize: '13px', fontWeight: 'bold' }}>● Terhubung ke Cloud Supabase</span>
              </div>
              <button onClick={() => setRole('pilih')} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Logout Admin</button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button 
                onClick={() => setActiveTab('riwayat')}
                style={{ padding: '8px 16px', background: activeTab === 'riwayat' ? '#2563eb' : '#e5e7eb', color: activeTab === 'riwayat' ? 'white' : '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                📊 Rekap & Download Excel
              </button>
              <button 
                onClick={() => setActiveTab('karyawan')}
                style={{ padding: '8px 16px', background: activeTab === 'karyawan' ? '#2563eb' : '#e5e7eb', color: activeTab === 'karyawan' ? 'white' : '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                👥 Kelola Data Karyawan (50+)
              </button>
            </div>

            {/* TAB REKAP & EXCEL */}
            {activeTab === 'riwayat' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#374151' }}>Seluruh Riwayat Absensi & ID Karyawan</h3>
                  {riwayatAbsen.length > 0 && (
                    <button 
                      onClick={exportToExcel}
                      style={{ backgroundColor: '#15803d', color: 'white', padding: '8px 14px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                    >
                      📥 Download Excel (Dengan Kolom ID)
                    </button>
                  )}
                </div>

                {riwayatAbsen.length === 0 ? (
                  <p style={{ color: '#9ca3af', textAlign: 'center', padding: '30px' }}>Belum ada data absensi masuk.</p>
                ) : (
                  <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #d1d5db', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '8px' }}>ID</th>
                          <th style={{ padding: '8px' }}>Tanggal</th>
                          <th style={{ padding: '8px' }}>Nama Karyawan</th>
                          <th style={{ padding: '8px' }}>Jabatan</th>
                          <th style={{ padding: '8px' }}>Masuk</th>
                          <th style={{ padding: '8px' }}>Pulang</th>
                          <th style={{ padding: '8px' }}>Total Kerja</th>
                          <th style={{ padding: '8px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {riwayatAbsen.map((item) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '8px', fontWeight: 'bold', color: '#4b5563' }}>{item.id_karyawan || '-'}</td>
                            <td style={{ padding: '8px', color: '#4b5563' }}>{item.tanggal}</td>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.nama}</td>
                            <td style={{ padding: '8px', color: '#6b7280' }}>{item.jabatan}</td>
                            <td style={{ padding: '8px', color: '#2563eb', fontWeight: 'bold' }}>{item.jam_masuk}</td>
                            <td style={{ padding: '8px', color: '#9333ea', fontWeight: 'bold' }}>{item.jam_pulang}</td>
                            <td style={{ padding: '8px', color: '#047857', fontWeight: 'bold' }}>{item.total_jam}</td>
                            <td style={{ padding: '8px' }}>
                              <span style={{ padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#166534' }}>
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
                <h3 style={{ fontSize: '16px', color: '#374151', marginBottom: '12px' }}>Tambah Karyawan Baru (Beserta ID / NIP)</h3>
                <form onSubmit={handleTambahKaryawan} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="ID Karyawan / NIP (Contoh: EMP001)..." 
                    value={idKaryawanBaru} 
                    onChange={(e) => setIdKaryawanBaru(e.target.value)} 
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                  <input 
                    type="text" 
                    placeholder="Nama Lengkap Karyawan..." 
                    value={namaBaru} 
                    onChange={(e) => setNamaBaru(e.target.value)} 
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                  <input 
                    type="text" 
                    placeholder="Jabatan / Divisi..." 
                    value={jabatanBaru} 
                    onChange={(e) => setJabatanBaru(e.target.value)} 
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                  <button type="submit" disabled={loading} style={{ background: '#16a34a', color: 'white', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                    {loading ? 'Menambahkan...' : '+ Daftarkan Karyawan Baru'}
                  </button>
                </form>

                <h4 style={{ fontSize: '15px', color: '#374151', marginBottom: '8px' }}>Daftar Seluruh Karyawan ({daftarKaryawan.length} Orang)</h4>
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {daftarKaryawan.map(k => (
                      <li key={k.id} style={{ padding: '8px 12px', background: '#fff', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', borderRadius: '4px', marginBottom: '4px', alignItems: 'center' }}>
                        <div>
                          <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginRight: '8px' }}>
                            {k.id_karyawan || 'Tanpa ID'}
                          </span>
                          <strong>{k.nama}</strong>
                        </div>
                        <span style={{ color: '#6b7280', fontSize: '13px' }}>{k.jabatan}</span>
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
