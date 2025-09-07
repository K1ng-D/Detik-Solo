'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import MotionWrapper from '@/components/MotionWrapper';

interface Stats {
  totalNews: number;
  totalUsers: number;
  totalComments: number;
  recentNews: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalNews: 0,
    totalUsers: 0,
    totalComments: 0,
    recentNews: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Listen for news count
        const newsUnsubscribe = onSnapshot(
          collection(db, 'news'),
          (snapshot) => {
            setStats(prev => ({
              ...prev,
              totalNews: snapshot.size,
              recentNews: snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a: any, b: any) => b.createdAt - a.createdAt)
                .slice(0, 5)
            }));
          }
        );

        // Listen for users count
        const usersUnsubscribe = onSnapshot(
          collection(db, 'users'),
          (snapshot) => {
            setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
          }
        );

        // Listen for comments count (this is approximate)
        const commentsUnsubscribe = onSnapshot(
          query(collection(db, 'news')),
          async (snapshot) => {
            let totalComments = 0;
            for (const doc of snapshot.docs) {
              const commentsSnapshot = await onSnapshot(
                collection(db, 'news', doc.id, 'comments'),
                (comments) => {
                  totalComments += comments.size;
                }
              );
            }
            setStats(prev => ({ ...prev, totalComments }));
          }
        );

        setIsLoading(false);

        return () => {
          newsUnsubscribe();
          usersUnsubscribe();
          commentsUnsubscribe();
        };
      } catch (error) {
        console.error('Error fetching stats:', error);
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <MotionWrapper>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard Admin</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900">Total Berita</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.totalNews}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900">Total Pengguna</h3>
            <p className="text-3xl font-bold text-green-600">{stats.totalUsers}</p>
          </div>
        </div>

        {/* Recent News */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Berita Terbaru</h2>
          
          {stats.recentNews.length === 0 ? (
            <p className="text-gray-500">Belum ada berita.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Judul
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentNews.map((news: any) => (
                    <tr key={news.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {news.title.length > 50 ? news.title.substring(0, 50) + '...' : news.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {news.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {news.createdAt?.toDate ? news.createdAt.toDate().toLocaleDateString('id-ID') : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MotionWrapper>
  );
}