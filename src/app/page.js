'use client';

import { useState } from 'react';
import FileCompressor from '@/components/FileCompressor';
import Auth from '@/components/Auth';

export default function Home() {
  const [token, setToken] = useState(null);

  const handleLogin = (newToken) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
  };

  return (
    <main className="min-h-screen bg-gray-100 py-8">
      {token ? (
        <FileCompressor token={token} />
      ) : (
        <Auth onLogin={handleLogin} />
      )}
    </main>
  );
}
