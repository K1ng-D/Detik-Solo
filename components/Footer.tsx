'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FiFacebook, FiTwitter, FiInstagram, FiMail } from 'react-icons/fi';

export default function Footer() {
  const categories = [
    'Politik',
    'Ekonomi',
    'Olahraga',
    'Teknologi',
    'Hiburan',
    'Kesehatan',
    'Pendidikan',
  ];

  return (
    <footer className="relative bg-gradient-to-r from-[#1d2d68] via-[#1d2d68] to-[#2a3f8f] text-white mt-12">
      {/* Wave efek atas footer */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none">
        <svg
          className="relative block w-full h-6 sm:h-8 md:h-10"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 1200 120"
        >
          <path
            d="M321.39 56.44c58.21 4.09 114.21 22.88 172.4 27.69 72.16 6.02 144.3-11.59 216.45-22.42 88.62-13.44 177.24-17.29 265.86-6.58 75.09 9.02 146.59 27.72 224.9 35.42 39.58 3.82 79.88 5.55 119.99 3.42v67.03H0V64.83c106.39-14.19 213.51-24.64 321.39-8.39z"
            className="fill-current text-gray-100 opacity-10"
          ></path>
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold mb-3">DETIK SOLO</h2>
          <p className="text-sm text-gray-200">
            Portal berita terpercaya menyajikan informasi terkini dari berbagai kategori,
            cepat dan akurat untuk Anda.
          </p>
        </motion.div>

        {/* Kategori */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold mb-3">Kategori</h3>
          <ul className="space-y-2">
            {categories.map((cat) => (
              <li key={cat}>
                <Link
                  href={`/news`}
                  className="hover:text-[#facd8c] transition-colors"
                >
                  {cat}
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Kontak & Sosial Media */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="text-lg font-semibold mb-3">Kontak</h3>
          <p className="text-sm">Email: redaksi@detiksolo.com</p>
          <p className="text-sm">Telp: (0271) 123456</p>

          <div className="flex gap-4 mt-4">
            <Link href="#" className="hover:text-[#facd8c] transition-colors">
              <FiFacebook size={20} />
            </Link>
            <Link href="#" className="hover:text-[#facd8c] transition-colors">
              <FiTwitter size={20} />
            </Link>
            <Link href="#" className="hover:text-[#facd8c] transition-colors">
              <FiInstagram size={20} />
            </Link>
            <Link href="mailto:redaksi@detiksolo.com" className="hover:text-[#facd8c] transition-colors">
              <FiMail size={20} />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Bottom */}
      <div className="bg-[#1d2d68] text-center py-4 text-sm text-gray-200 relative z-10">
        © {new Date().getFullYear()} DETIK SOLO. All Rights Reserved.
      </div>
    </footer>
  );
}