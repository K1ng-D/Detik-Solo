'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { FiHome, FiPlusSquare, FiFileText, FiUsers, FiMenu, FiX, FiLogOut } from 'react-icons/fi';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: <FiHome className="w-5 h-5" />
    },
    {
      name: 'Buat Berita',
      href: '/admin/create-news',
      icon: <FiPlusSquare className="w-5 h-5" />
    },
    {
      name: 'Kelola Berita',
      href: '/admin/manage-news',
      icon: <FiFileText className="w-5 h-5" />
    },
    {
      name: 'Kelola User',
      href: '/admin/manage-users',
      icon: <FiUsers className="w-5 h-5" />
    }
  ];

  const isActive = (href: string) => pathname === href;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/admin-login');
    } catch (error) {
      console.error('Error saat logout:', error);
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-blue-600 text-white p-2 rounded-md"
      >
        {isOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-br from-blue-900 to-indigo-800 text-white transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 h-screen flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-center h-16 bg-gradient-to-br from-blue-900 to-indigo-800">
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>

        {/* Menu list */}
        <nav className="flex-1 mt-8 overflow-y-auto">
          <ul className="space-y-2 px-4">
            {menuItems.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout button di bawah */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
          >
            <FiLogOut className="w-5 h-5 mr-2" />
            Logout
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
