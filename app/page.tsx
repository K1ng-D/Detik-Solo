'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FiUser, FiClock } from 'react-icons/fi';
import { motion } from 'framer-motion';

interface News {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  author: string;
  createdAt: any;
  likesCount: number;
}

export default function HomePage() {
  const [featuredNews, setFeaturedNews] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const newsRef = collection(db, 'news');
    const q = query(newsRef, orderBy('createdAt', 'desc'), limit(12));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newsData: News[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        newsData.push({
          id: doc.id,
          title: data.title,
          content: data.content,
          excerpt: data.excerpt || data.content.substring(0, 150) + '...',
          imageUrl: data.imageUrl,
          category: data.category,
          author: data.author,
          createdAt: data.createdAt,
          likesCount: data.likesCount || 0,
        });
      });
      setFeaturedNews(newsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const categories = [
    'Politik',
    'Ekonomi',
    'Olahraga',
    'Teknologi',
    'Hiburan',
    'Kesehatan',
    'Pendidikan'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-items-start h-16">
            <h1 className="text-2xl font-bold text-[#1d2d68]">DETIK SOLO</h1>
          </div>
        </div>
      </header>

      {/* Breaking News */}
      <div className="bg-[#1d2d68] text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center overflow-hidden mr-6">
        
            <div className="flex-1">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: '-100%' }}
                transition={{
                  repeat: Infinity,
                  repeatType: 'loop',
                  duration: 30,
                  ease: 'linear',
                }}
                className="whitespace-nowrap"
              >
                {featuredNews.length > 0
                  ? featuredNews[0].title
                  : 'Selamat datang di portal berita terpercaya...'}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main News Section */}
          <div className="lg:w-2/3">
          <div className="border-b-2 border-[#1d2d68] pb-2 mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  BERITA TERBARU
                </h2>
              </div>
            {/* Headline */}
            {featuredNews.length > 0 && (
              <div className="mb-8">
                <Link href={`/news/${featuredNews[0].id}`}>
                  <div className="relative overflow-hidden rounded-lg">
                    <img
                      src={featuredNews[0].imageUrl}
                      alt={featuredNews[0].title}
                      className="w-full h-96 object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
                      <span className="bg-[#1d2d68] text-white text-sm px-3 py-1 rounded-full">
                        {featuredNews[0].category}
                      </span>
                      <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">
                        {featuredNews[0].title}
                      </h2>
                      <div className="flex items-center text-white text-sm mt-2">
                        <FiUser className="mr-1" /> {featuredNews[0].author}
                        <FiClock className="ml-4 mr-1" />{' '}
                        {featuredNews[0].createdAt?.toDate
                          ? featuredNews[0]
                              .createdAt.toDate()
                              .toLocaleDateString('id-ID')
                          : 'Hari ini'}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* News Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse"
                    >
                      <div className="h-48 bg-gray-200"></div>
                      <div className="p-4">
                        <div className="h-6 bg-gray-200 rounded mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  ))
                : featuredNews.slice(1, 5).map((news) => (
                    <div
                      key={news.id}
                      className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:shadow-lg"
                    >
                      <Link href={`/news/${news.id}`}>
                        <img
                          src={news.imageUrl}
                          alt={news.title}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-4">
                          <span className="text-[#1d2d68] text-sm font-semibold">
                            {news.category}
                          </span>
                          <h3 className="font-bold text-lg mt-2 mb-3 line-clamp-2">
                            {news.title}
                          </h3>
                          <div className="flex items-center text-gray-500 text-sm">
                            <FiUser className="mr-1" /> {news.author}
                            <FiClock className="ml-4 mr-1" />{' '}
                            {news.createdAt?.toDate
                              ? news.createdAt
                                  .toDate()
                                  .toLocaleDateString('id-ID')
                              : 'Hari ini'}
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
            </div>

            {/* Latest News */}
            <div className="mb-8">
             

              <div className="space-y-4">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex gap-4 animate-pulse">
                        <div className="w-24 h-16 bg-gray-200 rounded"></div>
                        <div className="flex-1">
                          <div className="h-5 bg-gray-200 rounded mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      </div>
                    ))
                  : featuredNews.slice(5).map((news) => (
                      <div
                        key={news.id}
                        className="flex gap-4 pb-4 border-b border-gray-100"
                      >
                        <div className="w-24 h-16 flex-shrink-0">
                          <img
                            src={news.imageUrl}
                            alt={news.title}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                        <div>
                          <Link href={`/news/${news.id}`}>
                            <h3 className="font-semibold text-gray-900 hover:text-[#1d2d68] line-clamp-2">
                              {news.title}
                            </h3>
                          </Link>
                          <div className="flex items-center text-gray-500 text-xs mt-1">
                            <span>{news.category}</span>
                            <span className="mx-2">•</span>
                            <span>
                              {news.createdAt?.toDate
                                ? news.createdAt
                                    .toDate()
                                    .toLocaleDateString('id-ID')
                                : 'Hari ini'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-1/3">
            {/* Popular News */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="border-b-2 border-[#1d2d68] pb-2 mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  BERITA POPULER
                </h2>
              </div>

              <div className="space-y-4">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-16 h-12 bg-gray-200 rounded"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      </div>
                    ))
                  : featuredNews.slice(0, 5).map((news) => (
                      <div key={news.id} className="flex gap-3">
                        <div className="w-16 h-12 flex-shrink-0">
                          <img
                            src={news.imageUrl}
                            alt={news.title}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                        <div>
                          <Link href={`/news/${news.id}`}>
                            <h3 className="text-sm font-medium text-gray-900 hover:text-[#fdcc89] line-clamp-2">
                              {news.title}
                            </h3>
                          </Link>
                          <div className="text-xs text-gray-500 mt-1">
                            {news.createdAt?.toDate
                              ? news.createdAt
                                  .toDate()
                                  .toLocaleDateString('id-ID')
                              : 'Hari ini'}
                          </div>
                        </div>
                      </div>
                    ))}
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="border-b-2 border-[#1d2d68] pb-2 mb-4">
                <h2 className="text-xl font-bold text-gray-900">KATEGORI</h2>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {categories.map((category) => (
                  <Link
                    key={category}
                    href={`/news`}
                    className="px-3 py-2 bg-gray-100 hover:bg-[#1d2d68] hover:text-[#facd8c] rounded text-sm text-center transition-colors"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative bg-gradient-to-r from-[#1d2d68] via-[#1d2d68] to-[#1d2d68] text-white mt-12">
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">DETIK SOLO</h3>
            <p className="text-gray-200">
              Portal berita terpercaya menyajikan informasi terkini dan terpercaya dari berbagai kategori.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">KATEGORI</h4>
            <ul className="space-y-2">
              {categories.slice(0, 7).map((category) => (
                <li key={category}>
                  <Link
                    href={`/news`}
                    className="text-gray-200 hover:text-[#facd8c] transition-colors"
                  >
                    {category}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">KONTAK</h4>
            <address className="text-gray-200 not-italic">
              Jl. Contoh Alamat No. 123
              <br />
              Kota, Provinsi 12345
              <br />
              Email: info@soloposnews.com
              <br />
              Telp: (021) 123-4567
            </address>
          </div>
        </div>
      <div className="bg-[#1d2d68] text-center py-4 text-sm text-gray-200 relative z-10">
        © {new Date().getFullYear()} DETIK SOLO. All Rights Reserved.
      </div>
      </footer>
    </div>
  );
}