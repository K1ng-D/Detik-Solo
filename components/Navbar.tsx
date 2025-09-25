'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getUserData } from '@/lib/auth';
import { UserData } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiLogOut, FiMenu, FiX, FiHome } from 'react-icons/fi';
import Image from 'next/image';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const data = await getUserData(user.uid);
        setUserData(data);
      } else {
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserData(null);
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/news?search=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const isActive = (path: string) => pathname === path;

  const getUserDisplayName = () => {
    if (userData?.displayName) return userData.displayName;
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  return (
    <>
      {/* Top Bar */}
      <div className="bg-[#1d2d68] text-[#facd8c] text-sm py-2">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <span>{new Date().toLocaleDateString('id-ID', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Solo, 28°C</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <motion.span
                  whileHover={{ scale: 1.02 }}
                  className="text-2xl font-bold text-[#1d2d68]"
                >
                  <Image
                  width={150}
                  height={50}
                  src="/faktra.png"
                  alt="Faktra Logo"
                  />
                </motion.span>
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center space-x-1">
            <Link 
                href="/" 
                className={`px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  isActive('/news') 
                    ? 'text-[#1d2d68] border-b-2 border-[#1d2d68]' 
                    : 'text-gray-700 hover:text-[#1d2d68]'
                }`}
              >
                Beranda
              </Link>
              <Link 
                href="/news" 
                className={`px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  isActive('/news') 
                    ? 'text-[#1d2d68] border-b-2 border-[#1d2d68]' 
                    : 'text-gray-700 hover:text-[#1d2d68]'
                }`}
              >
                Berita
              </Link>
              
              {user && userData?.role === 'admin' && (
                <Link 
                  href="/admin" 
                  className={`px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    pathname.startsWith('/dashboard') 
                      ? 'text-[#1d2d68] border-b-2 border-[#1d2d68]' 
                      : 'text-gray-700 hover:text-[#1d2d68]'
                  }`}
                >
                  Dashboard Admin
                </Link>
              )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-3">
              {/* User Actions */}
              {user ? (
                <div className="hidden md:flex items-center space-x-3">
                  {/* User Dropdown */}
                  <div className="relative group">
                    <button className="flex items-center space-x-2 p-2 text-gray-700 hover:text-[#1d2d68] transition-colors">
                      <FiUser size={18} />
                      <span className="text-sm font-medium">{getUserDisplayName()}</span>
                    </button>
                    
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <Link
                        href="/profile"
                        className="block px-4 py-3 text-sm text-gray-700 hover:bg-[#1d2d68]/10 hover:text-[#1d2d68] transition-colors"
                      >
                        Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-[#1d2d68]/10 hover:text-[#1d2d68] transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hidden md:flex items-center space-x-2">
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#1d2d68] transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 text-sm font-medium bg-[#1d2d68] text-white rounded hover:bg-[#1d2d68]/90 transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-600 hover:text-[#1d2d68] transition-colors lg:hidden"
              >
                {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-t border-gray-200 shadow-lg"
            >
              <div className="px-4 py-3 space-y-2">
                {/* Navigation Links */}
                <Link
                  href="/news"
                  className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-[#1d2d68]/10 hover:text-[#1d2d68] rounded transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FiHome size={16} />
                  <span>Berita</span>
                </Link>

                {/* User Actions */}
                {user ? (
                  <div className="space-y-2 border-t border-gray-200 pt-4">
                    <div className="flex items-center space-x-3 px-3 py-2">
                      <FiUser className="text-gray-500" size={18} />
                      <span className="text-sm font-medium text-gray-700">
                        {getUserDisplayName()}
                      </span>
                    </div>
                    
                    {userData?.role === 'admin' && (
                      <Link
                        href="/dashboard/admin"
                        className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-[#1d2d68]/10 hover:text-[#1d2d68] rounded transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Dashboard Admin
                      </Link>
                    )}
                    
                    <Link
                      href="/profile"
                      className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-[#1d2d68]/10 hover:text-[#1d2d68] rounded transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center space-x-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-[#1d2d68]/10 hover:text-[#1d2d68] rounded transition-colors"
                    >
                      <FiLogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 border-t border-gray-200 pt-4">
                    <Link
                      href="/login"
                      className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-[#1d2d68]/10 hover:text-[#1d2d68] rounded transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <FiUser size={16} />
                      <span>Login</span>
                    </Link>
                    <Link
                      href="/register"
                      className="flex items-center space-x-3 px-3 py-2 text-sm font-medium bg-[#1d2d68] text-white rounded hover:bg-[#1d2d68]/90 transition-colors justify-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>Register</span>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}