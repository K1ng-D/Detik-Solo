'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, updatePassword, updateProfile } from 'firebase/auth';
import { getUserData, UserData } from '@/lib/auth';
import MotionWrapper from '@/components/MotionWrapper';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const data = await getUserData(user.uid);
        setUserData(data);
        setDisplayName(user.displayName || data?.displayName || '');
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ Helper format tanggal
  const formatDate = (val: any) => {
    if (!val) return 'Belum tercatat';
    try {
      const date: Date =
        typeof val?.toDate === 'function'
          ? val.toDate()
          : val instanceof Date
          ? val
          : typeof val === 'number'
          ? new Date(val)
          : typeof val === 'string'
          ? new Date(val)
          : null;

      if (!date || isNaN(date.getTime())) return 'Belum tercatat';
      return date.toLocaleString('id-ID', {
        dateStyle: 'long',
        timeStyle: 'short',
      });
    } catch {
      return 'Belum tercatat';
    }
  };

  const handleSave = async () => {
    setError('');
    setMessage('');

    try {
      if (!user) return;

      const updateObj: any = {};
      if (displayName !== user.displayName) {
        updateObj.displayName = displayName;
      }
      
      if (Object.keys(updateObj).length > 0) {
        await updateProfile(user, updateObj);
      }

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setError('Password dan konfirmasi password tidak cocok');
          return;
        }
        if (newPassword.length < 6) {
          setError('Password harus minimal 6 karakter');
          return;
        }
        await updatePassword(user, newPassword);
        setNewPassword('');
        setConfirmPassword('');
      }

      setMessage('Profil berhasil diperbarui');
      setIsEditing(false);
    } catch (error: any) {
      setError(error.message || 'Terjadi kesalahan saat memperbarui profil');
    }
  };

  if (!user || !userData) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <MotionWrapper>
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Profil Pengguna</h1>

          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Avatar dengan inisial */}
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 bg-[#1d2d68] rounded-full flex items-center justify-center text-[#facd8c] text-4xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-gray-900">{user.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
              {isEditing ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#1d2d68] focus:border-[#1d2d68]"
                />
              ) : (
                <p className="mt-1 text-gray-900">{displayName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <p className="mt-1 text-gray-900 capitalize">{userData.role}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tanggal Bergabung</label>
              <p className="mt-1 text-gray-900">{formatDate(userData.createdAt)}</p>
            </div>

            {isEditing && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#1d2d68] focus:border-[#1d2d68]"
                    placeholder="Kosongkan jika tidak ingin mengubah password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#1d2d68] focus:border-[#1d2d68]"
                    placeholder="Kosongkan jika tidak ingin mengubah password"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-6 flex space-x-4">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-[#1d2d68] text-white rounded-md hover:bg-[#1d2d68]/90 transition-colors"
                >
                  Simpan
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(user.displayName || userData.displayName || '');
                    setNewPassword('');
                    setConfirmPassword('');
                    setError('');
                    setMessage('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Batal
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-[#1d2d68] text-white rounded-md hover:bg-[#1d2d68]/90 transition-colors"
              >
                Edit Profil
              </button>
            )}
          </div>
        </div>
      </MotionWrapper>
    </div>
  );
}