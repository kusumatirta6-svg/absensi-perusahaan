import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState('Sistem Absensi Siap Digunakan');

  useEffect(() => {
    cekKoneksiSupabase();
  }, []);

  const cekKoneksiSupabase = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('karyawan').select('*').limit(1);
      if (error) {
        setPesan('Gagal terhubung ke database Supabase: ' + error.message);
      } else {
        setPesan('Berhasil terhubung ke Supabase! Jumlah sampel data karyawan: ' + (data ? data.length : 0));
      }
    } catch (err: any) {
      setPesan('Terjadi kesalahan sistem: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', padding: '20px' }}>
      <div style={{ background: '#1e293b', padding: '40px', borderRadius: '16px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Status Koneksi Aplikasi</h1>
        <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>{pesan}</p>
        <button 
          onClick={cekKoneksiSupabase} 
          disabled={loading}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {loading ? 'Memeriksa...' : 'Cek Ulang Koneksi'}
        </button>
      </div>
    </div>
  );
}
