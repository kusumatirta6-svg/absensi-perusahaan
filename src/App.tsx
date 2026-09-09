import React, { useState } from 'react';

export default function App() {
  const [nama, setNama] = useState('');
  const [status, setStatus] = useState('Hadir');
  const [daftarAbsen, setDaftarAbsen] = useState<Array<{nama: string, status: string, waktu: string}>>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;
    
    const waktuBaru = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setDaftarAbsen([{ nama, status, waktu: waktuBaru }, ...daftarAbsen]);
    setNama('');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{ color: '#1f2937', textAlign: 'center', marginBottom: '8px' }}>Aplikasi Absensi Perusahaan</h1>
        <p style={{ color: '#4b5563', textAlign: 'center', marginBottom: '24px' }}>Silakan catat kehadiran Anda hari ini</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Nama Karyawan:</label>
            <input 
              type="text" 
              value={nama} 
              onChange={(e) => setNama(e.target.value)} 
              placeholder="Masukkan nama Anda..." 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Status Kehadiran:</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
            >
              <option value="Hadir">Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
            </select>
          </div>

          <button 
            type="submit" 
            style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Kirim Absen
          </button>
        </form>

        <h2 style={{ fontSize: '18px', color: '#1f2937', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', marginBottom: '12px' }}>Riwayat Absensi</h2>
        {daftarAbsen.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center' }}>Belum ada data absensi hari ini.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {daftarAbsen.map((item, index) => (
              <li key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb', marginBottom: '6px', borderRadius: '4px' }}>
                <span><strong>{item.nama}</strong> - <span style={{ color: item.status === 'Hadir' ? '#16a34a' : '#ca8a04' }}>{item.status}</span></span>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>{item.waktu}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
