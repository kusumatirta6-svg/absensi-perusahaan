import React, { useState, useEffect } from 'react';

interface Karyawan {
  id: string;
  nama: string;
  jabatan: string;
}

interface Absen {
  id: string;
  nama: string;
  jabatan: string;
  status: string;
  waktu: string;
  tanggal: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'absen' | 'karyawan' | 'riwayat'>('absen');
  
  // State Karyawan
  const [daftarKaryawan, setDaftarKaryawan] = useState<Karyawan[]>(() => {
    const saved = localStorage.getItem('daftar_karyawan');
    return saved ? JSON.parse(saved) : [
      { id: '1', nama: 'Budi Santoso', jabatan: 'Software Engineer' },
      { id: '2', nama: 'Siti Rahma', jabatan: 'HR Manager' }
    ];
  });

  // State Absensi
  const [riwayatAbsen, setRiwayatAbsen] = useState<Absen[]>(() => {
    const saved = localStorage.getItem('riwayat_absen');
    return saved ? JSON.parse(saved) : [];
  });

  // Input Form Karyawan Baru
  const [namaBaru, setNamaBaru] = useState('');
  const [jabatanBaru, setJabatanBaru] = useState('');

  // Input Form Absen
  const [selectedKaryawan, setSelectedKaryawan] = useState('');
  const [statusAbsen, setStatusAbsen] = useState('Hadir');

  // Simpan ke LocalStorage setiap ada perubahan
  useEffect(() => {
    localStorage.setItem('daftar_karyawan', JSON.stringify(daftarKaryawan));
  }, [daftarKaryawan]);

  useEffect(() => {
    localStorage.setItem('riwayat_absen', JSON.stringify(riwayatAbsen));
  }, [riwayatAbsen]);

  // Tambah Karyawan
  const handleTambahKaryawan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaBaru.trim() || !jabatanBaru.trim()) return;

    const karyawanBaru: Karyawan = {
      id: Date.now().toString(),
      nama: namaBaru,
      jabatan: jabatanBaru
    };

    setDaftarKaryawan([...daftarKaryawan, karyawanBaru]);
    setNamaBaru('');
    setJabatanBaru('');
    alert('Karyawan berhasil didaftarkan!');
  };

  // Kirim Absen
  const handleKirimAbsen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKaryawan) {
      alert('Silakan pilih karyawan terlebih dahulu.');
      return;
    }

    const karyawanObj = daftarKaryawan.find(k => k.id === selectedKaryawan);
    if (!karyawanObj) return;

    const now = new Date();
    const absenBaru: Absen = {
      id: Date.now().toString(),
      nama: karyawanObj.nama,
      jabatan: karyawanObj.jabatan,
      status: statusAbsen,
      waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      tanggal: now.toLocaleDateString('id-ID')
    };

    setRiwayatAbsen([absenBaru, ...riwayatAbsen]);
    alert(`Absen berhasil dicatat untuk ${karyawanObj.nama}!`);
  };

  // Fungsi Ekspor ke Excel (CSV)
  const exportToExcel = () => {
    if (riwayatAbsen.length === 0) {
      alert('Belum ada data riwayat untuk diekspor.');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,ID,Nama Karyawan,Jabatan,Status,Tanggal,Waktu\n";
    riwayatAbsen.forEach(row => {
      csvContent += `${row.id},"${row.nama}","${row.jabatan}",${row.status},${row.tanggal},${row.waktu}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Absensi_${new Date().toLocaleDateString('id-ID')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '750px', margin: '0 auto', background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        
        {/* Header & Navigasi Tab */}
        <h1 style={{ color: '#1f2937', textAlign: 'center', marginBottom: '4px', fontSize: '24px' }}>Sistem Absensi Perusahaan Profesional</h1>
        <p style={{ color: '#4b5563', textAlign: 'center', marginBottom: '20px', fontSize: '14px' }}>Kelola kehadiran dan data karyawan dengan mudah</p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
          <button 
            onClick={() => setActiveTab('absen')}
            style={{ padding: '8px 16px', background: activeTab === 'absen' ? '#2563eb' : '#e5e7eb', color: activeTab === 'absen' ? 'white' : '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Form Absen
          </button>
          <button 
            onClick={() => setActiveTab('karyawan')}
            style={{ padding: '8px 16px', background: activeTab === 'karyawan' ? '#2563eb' : '#e5e7eb', color: activeTab === 'karyawan' ? 'white' : '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Pendaftaran Karyawan
          </button>
          <button 
            onClick={() => setActiveTab('riwayat')}
            style={{ padding: '8px 16px', background: activeTab === 'riwayat' ? '#2563eb' : '#e5e7eb', color: activeTab === 'riwayat' ? 'white' : '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Riwayat & Export Excel
          </button>
        </div>

        {/* TAB 1: FORM ABSEN */}
        {activeTab === 'absen' && (
          <form onSubmit={handleKirimAbsen} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '18px', color: '#1f2937' }}>Catat Kehadiran Hari Ini</h2>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Pilih Nama Karyawan:</label>
              <select 
                value={selectedKaryawan} 
                onChange={(e) => setSelectedKaryawan(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
              >
                <option value="">-- Pilih Karyawan --</option>
                {daftarKaryawan.map(k => (
                  <option key={k.id} value={k.id}>{k.nama} ({k.jabatan})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Status Kehadiran:</label>
              <select 
                value={statusAbsen} 
                onChange={(e) => setStatusAbsen(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
              >
                <option value="Hadir">Hadir</option>
                <option value="Izin">Izin</option>
                <option value="Sakit">Sakit</option>
                <option value="Cuti">Cuti</option>
              </select>
            </div>

            <button 
              type="submit" 
              style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Kirim Absen Sekarang
            </button>
          </form>
        )}

        {/* TAB 2: PENDAFTARAN KARYAWAN */}
        {activeTab === 'karyawan' && (
          <div>
            <h2 style={{ fontSize: '18px', color: '#1f2937', marginBottom: '16px' }}>Tambah Karyawan Baru</h2>
            <form onSubmit={handleTambahKaryawan} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Nama Lengkap:</label>
                <input 
                  type="text" 
                  value={namaBaru} 
                  onChange={(e) => setNamaBaru(e.target.value)} 
                  placeholder="Masukkan nama lengkap..." 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Jabatan / Posisi:</label>
                <input 
                  type="text" 
                  value={jabatanBaru} 
                  onChange={(e) => setJabatanBaru(e.target.value)} 
                  placeholder="Contoh: Staff Keuangan..." 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>
              <button 
                type="submit" 
                style={{ backgroundColor: '#16a34a', color: 'white', padding: '12px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Simpan Karyawan
              </button>
            </form>

            <h3 style={{ fontSize: '16px', color: '#374151', marginBottom: '8px' }}>Daftar Karyawan Terdaftar ({daftarKaryawan.length})</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {daftarKaryawan.map(k => (
                <li key={k.id} style={{ padding: '8px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', borderRadius: '4px', marginBottom: '4px' }}>
                  <span><strong>{k.nama}</strong></span>
                  <span style={{ color: '#6b7280' }}>{k.jabatan}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* TAB 3: RIWAYAT & EKSPOR EXCEL */}
        {activeTab === 'riwayat' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', color: '#1f2937', margin: 0 }}>Riwayat Kehadiran</h2>
              {riwayatAbsen.length > 0 && (
                <button 
                  onClick={exportToExcel}
                  style={{ backgroundColor: '#15803d', color: 'white', padding: '8px 14px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                >
                  📥 Download ke Excel (CSV)
                </button>
              )}
            </div>

            {riwayatAbsen.length === 0 ? (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>Belum ada catatan absensi masuk.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
                      <th style={{ padding: '10px' }}>Nama</th>
                      <th style={{ padding: '10px' }}>Jabatan</th>
                      <th style={{ padding: '10px' }}>Status</th>
                      <th style={{ padding: '10px' }}>Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riwayatAbsen.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.nama}</td>
                        <td style={{ padding: '10px', color: '#6b7280' }}>{item.jabatan}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                            backgroundColor: item.status === 'Hadir' ? '#dcfce7' : '#fef9c3',
                            color: item.status === 'Hadir' ? '#166534' : '#854d0e'
                          }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px', color: '#4b5563' }}>{item.tanggal} - {item.waktu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
