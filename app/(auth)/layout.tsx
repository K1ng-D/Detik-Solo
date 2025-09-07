import { ReactNode } from 'react';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1d2d68]/10 via-[#1d2d68]/5 to-[#facd8c]/10 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-r from-[#1d2d68]/5 to-[#1d2d68]/10"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#1d2d68]/10 rounded-full filter blur-3xl"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#facd8c]/10 rounded-full filter blur-3xl"></div>
      
      <div className="relative z-10">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Link 
            href="/" 
            className="flex items-center justify-center group mb-2"
          >
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm py-2 px-4 rounded-full shadow-sm border border-gray-200/50 group-hover:bg-white transition-colors duration-200">
              <FiArrowLeft className="h-4 w-4 text-[#1d2d68] group-hover:text-[#1d2d68]/80 transition-colors" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#1d2d68] to-[#1d2d68]/80 bg-clip-text text-transparent">
                Portal Berita
              </h1>
            </div>
          </Link>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl sm:rounded-2xl border border-white/20 relative overflow-hidden">
            {/* Decorative corner elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#1d2d68]/5 to-transparent rounded-bl-full"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#facd8c]/5 to-transparent rounded-tr-full"></div>
            
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 font-medium">
            © 2025 Portal Berita. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}