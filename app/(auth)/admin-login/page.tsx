'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginUser, getUserData } from '@/lib/auth';
import MotionWrapper from '@/components/MotionWrapper';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await loginUser(email, password);
      const userData = await getUserData(user.uid);
      
      if (userData && userData.role === 'admin') {
        router.push('/admin');
      } else {
        setError('Anda tidak memiliki akses admin. Silakan login sebagai user biasa.');
        // Logout user yang tidak memiliki akses admin
        await import('@/lib/auth').then(({ logoutUser }) => logoutUser());
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.code === 'auth/user-not-found') {
        setError('Email tidak ditemukan.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Password salah.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Format email tidak valid.');
      } else {
        setError(error.message || 'Terjadi kesalahan saat login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MotionWrapper>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Login Admin
          </h2>
          <p className="text-center text-sm text-gray-600 mt-2">
            Gunakan email admin untuk mengakses dashboard
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Admin
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-[#1d2d68] focus:border-[#1d2d68] sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-[#1d2d68] focus:border-[#1d2d68] sm:text-sm"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1d2d68] hover:bg-[#1d2d68]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1d2d68] disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Masuk...' : 'Masuk sebagai Admin'}
          </button>
        </div>
      </form>
    </MotionWrapper>
  );
}