'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginUser } from '@/lib/auth';
import MotionWrapper from '@/components/MotionWrapper';

export default function LoginPage() {
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
      await loginUser(email, password);
      router.push('/news');
    } catch (error: any) {
      setError(error.message || 'Terjadi kesalahan saat login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MotionWrapper>
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <h2 className="text-center text-2xl font-bold text-gray-900">
            Login User
          </h2>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
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

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <Link href="/register" className="font-medium text-[#1d2d68] hover:text-[#1d2d68]/80">
              Belum punya akun? Daftar di sini
            </Link>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1d2d68] hover:bg-[#1d2d68]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1d2d68] disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Masuk...' : 'Masuk'}
          </button>
        </div>

        {/* 🔥 Bagian ini diubah jadi tombol register */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => router.push('/register')}
            className="w-full flex justify-center py-2 px-4 border border-[#1d2d68] rounded-md shadow-sm text-sm font-medium text-[#1d2d68] hover:bg-[#1d2d68]/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1d2d68] transition-colors"
          >
            Register
          </button>
        </div>
      </form>
    </MotionWrapper>
  );
}