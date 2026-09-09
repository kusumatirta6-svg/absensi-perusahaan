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
  tanggal: string;
  jamMasuk: string;
  jamPulang: string;
  totalJam: string;
  status: string;
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
  const [jenisAbsen, setJenisAbsen] = useState<'Masuk' | 'Pulang'>('Masuk');
  const [statusAbsen, setStatusAbsen] = useState('Hadir');

  // Simpan ke LocalStorage
  useEffect(() => {
    localStorage.setItem('daftar_karyawan', JSON.stringify(daftarKaryawan));
  }, [daftarKaryawan]);

  useEffect(() => {
    localStorage.setItem('riwayat_absen', JSON.stringify(riwayatAbsen));
  }, [riwayatAbsen]);

  // Helper untuk menghitung durasi jam kerja
  const hitungDurasiJam = (masuk: string, pulang: string) => {
    if (masuk === '-' || pulang === '-') return '-';
    try {
      const [jamM, menitM] = masuk.split(':').map(Number);
      const [jamP, menitP] = pulang.split(':').map(Number);
      
      const totalMenitMasuk = jamM * 60 + menitM;
      const totalMenitPulang = jamP * 60 + menitP;
      
      let selisihMenit = totalMenitPulang - totalMenitMasuk;
      if (selisihMenit < 0) selisihMenit = 0; // Jika jam pulang mendahului
      
      const jam = Math.floor(selisihMenit / 60);
      const menit = selisihMenit % 60;
      
      return `${jam} jam ${menit} menit`;
    } catch {
      return '-';
    }
  };

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

  // Kirim Absen (Masuk / Pulang)
  const handleKirimAbsen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKaryawan) {
      alert('Silakan pilih karyawan terlebih dahulu.');
      return;
    }

    const karyawanObj = daftarKaryawan.find(k => k.id === selectedKaryawan);
    if (!karyawanObj) return;

    const now = new Date();
    const tanggalHariIni = now.toLocaleDateString('id-ID');
    const jamSekarang = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (jenisAbsen === 'Masuk') {
      const sudahAbsenMasuk = riwayatAbsen.find(
        r => r.id === selectedKaryawan && r.tanggal === tanggalHariIni
      );

      if (sudahAbsenMasuk) {
        const updated = riwayatAbsen.map(r => {
          if (r.id === selectedKaryawan && r.tanggal === tanggalHariIni) {
            const total = hitungDurasiJam(jamSekarang, r.jamPulang);
            return { ...r, jamMasuk: jamSekarang, totalJam: total, status: statusAbsen };
          }
          return r;
        });
        setRiwayatAbsen(updated);
        alert(`Jam Masuk diperbarui untuk ${karyawanObj.nama}`);
      } else {
        const absenBaru: Absen = {
          id: selectedKaryawan,
          nama: karyawanObj.nama,
          jabatan: karyawanObj.jabatan,
          tanggal: tanggalHariIni,
          jamMasuk: jamSekarang,
          jamPulang: '-',
          totalJam: '-',
          status: statusAbsen
        };
        setRiwayatAbsen([absenBaru, ...riwayatAbsen]);
        alert(`Absen Masuk berhasil dicatat untuk ${karyawanObj.nama}!`);
      }
    } else {
      // Absen Pulang
      const indexExist = riwayatAbsen.findIndex(
        r => r.id === selectedKaryawan && r.tanggal === tanggalHariIni
      );

      if (indexExist !== -1) {
        const updated = [...riwayatAbsen];
        updated[indexExist].jamPulang = jamSekarang;
        updated[indexExist].totalJam = hitungDurasiJam(updated[indexExist].jamMasuk, jamSekarang);
        setRiwayatAbsen(updated);
        alert(`Absen Pulang berhasil dicatat untuk ${karyawanObj.nama}!`);
      } else {
        const absenBaru: Absen = {
          id: selectedKaryawan,
          nama: karyawanObj.nama,
          jabatan: karyawanObj.jabatan,
          tanggal: tanggalHariIni,
          jamMasuk: '-',
          jamPulang: jamSekarang,
          totalJam: '-',
          status: statusAbsen
        };
        setRiwayatAbsen([absenBaru, ...riwayatAbsen]);
        alert(`Absen Pulang dicatat (Tanpa data masuk awal) untuk ${karyawanObj.nama}!`);
      }
    }
  };

  // Fungsi Ekspor ke Excel (CSV)
  const exportToExcel = () => {
    if (riwayatAbsen.length === 0) {
      alert('Belum ada data riwayat untuk diekspor.');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Nama Karyawan;Jabatan;Tanggal;Jam Masuk;Jam Pulang;Total Jam Kerja;Status\n";
    riwayatAbsen.forEach(row => {
      csvContent += `"${row.nama}";"${row.jabatan}";${row.tanggal};${row.jamMasuk};${row.jamPulang};"${row.totalJam}";${row.status}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Absensi_Jam_Kerja_${new Date().toLocaleDateString('id-ID')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '850px', margin: '0 auto', background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        
        <h1 style={{ color: '#1f2937', textAlign: 'center', marginBottom: '4px', fontSize: '24px' }}>Sistem Absensi & Jam Kerja Perusahaan</h1>
        <p style={{ color: '#4b5563', textAlign: 'center', marginBottom: '20px', fontSize: '14px' }}>Pencatatan Masuk, Pulang, dan Total Durasi Kerja Otomatis</p>

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
            <h2 style={{ fontSize: '18px', color: '#1f2937' }}>Catat Kehadiran (Masuk / Pulang)</h2>
            
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Pilih Karyawan:</label>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Jenis Absen:</label>
                <select 
                  value={jenisAbsen} 
                  onChange={(e) => setJenisAbsen(e.target.value as 'Masuk' | 'Pulang')}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                >
                  <option value="Masuk">Absen Masuk</option>
                  <option value="Pulang">Absen Pulang</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Status:</label>
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
            </div>

            <button 
              type="submit" 
              style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}
            >
              Simpan Absen {jenisAbsen}
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

        {/* TAB 3: RIWAYAT & EXCEL */}
        {activeTab === 'riwayat' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', color: '#1f2937', margin: 0 }}>Rekapitulasi & Jam Kerja</h2>
              {riwayatAbsen.length > 0 && (
                <button 
                  onClick={exportToExcel}
                  style={{ backgroundColor: '#15803d', color: 'white', padding: '8px 14px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                >
                  📥 Download Excel (Dengan Total Jam Kerja)
                </button>
              )}
            </div>

            {riwayatAbsen.length === 0 ? (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>Belum ada catatan absensi masuk atau pulang.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
                      <th style={{ padding: '8px' }}>Tanggal</th>
                      <th style={{ padding: '8px' }}>Nama</th>
                      <th style={{ padding: '8px' }}>Jabatan</th>
                      <th style={{ padding: '8px' }}>Masuk</th>
                      <th style={{ padding: '8px' }}>Pulang</th>
                      <th style={{ padding: '8px' }}>Total Kerja</th>
                      <th style={{ padding: '8px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riwayatAbsen.map((item, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '8px', color: '#4b5563' }}>{item.tanggal}</td>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.nama}</td>
                        <td style={{ padding: '8px', color: '#6b7280' }}>{item.jabatan}</td>
                        <td style={{ padding: '8px', color: '#2563eb', fontWeight: 'bold' }}>{item.jamMasuk}</td>
                        <td style={{ padding: '8px', color: '#9333ea', fontWeight: 'bold' }}>{item.jamPulang}</td>
                        <td style={{ padding: '8px', color: '#047857', fontWeight: 'bold' }}>{item.totalJam}</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{ 
                            padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                            backgroundColor: item.status === 'Hadir' ? '#dcfce7' : '#fef9c3',
                            color: item.status === 'Hadir' ? '#166534' : '#854d0e'
                          }}>
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

      </div>
    </div>
  );
}
