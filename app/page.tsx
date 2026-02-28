"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { FiUser, FiClock } from "react-icons/fi";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { onAuthStateChanged } from "firebase/auth";

interface News {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  imageUrl: string;

  // lama
  category?: string;

  // baru (kalau kamu sudah migrasi kategori)
  categoryId?: string;
  categoryName?: string;

  author: string;
  createdAt: any;
  likesCount: number;
}

type UserInterests = {
  categoryIds: string[];
  categoryNames: string[];
  keywords: string[];
};

export default function HomePage() {
  const [featuredNews, setFeaturedNews] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ ambil interests user untuk rekomendasi
  const [interests, setInterests] = useState<UserInterests | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    const newsRef = collection(db, "news");
    const q = query(newsRef, orderBy("createdAt", "desc"), limit(12));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newsData: News[] = [];
      snapshot.forEach((docSnap) => {
        const data: any = docSnap.data();
        newsData.push({
          id: docSnap.id,
          title: data.title,
          content: data.content,
          excerpt:
            data.excerpt ||
            (data.content ? data.content.substring(0, 150) + "..." : ""),
          imageUrl: data.imageUrl,

          category: data.category,
          categoryId: data.categoryId,
          categoryName: data.categoryName,

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

  // ✅ ambil profil user (interests)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setInterests(null);
        setIsLoadingProfile(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          setInterests(null);
          setIsLoadingProfile(false);
          return;
        }

        const data: any = snap.data();
        const i: any = data.interests || {};

        setInterests({
          categoryIds: Array.isArray(i.categoryIds) ? i.categoryIds : [],
          categoryNames: Array.isArray(i.categoryNames) ? i.categoryNames : [],
          keywords: Array.isArray(i.keywords) ? i.keywords : [],
        });
      } catch (e) {
        console.error("Error load user interests:", e);
        setInterests(null);
      } finally {
        setIsLoadingProfile(false);
      }
    });

    return () => unsub();
  }, []);

  // kategori label aman (support lama+baru)
  const withCategoryLabel = useMemo(() => {
    return featuredNews.map((n) => ({
      ...n,
      categoryLabel: n.categoryName ?? n.category ?? "Tanpa Kategori",
    }));
  }, [featuredNews]);

  // ✅ Berita Populer (berdasarkan likesCount, kalau sama ambil terbaru)
  const popularNews = useMemo(() => {
    const sorted = [...withCategoryLabel].sort((a: any, b: any) => {
      const diff = (b.likesCount || 0) - (a.likesCount || 0);
      if (diff !== 0) return diff;

      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });

    return sorted.slice(0, 5);
  }, [withCategoryLabel]);

  // ✅ Rekomendasi (kategori + keyword)
  const recommendedNews = useMemo(() => {
    if (!interests) return [];

    const catIdSet = new Set(interests.categoryIds || []);
    const catNameSet = new Set(
      (interests.categoryNames || []).map((x) => (x || "").toLowerCase()),
    );
    const keywords = (interests.keywords || [])
      .map((k) => (k || "").trim().toLowerCase())
      .filter(Boolean);

    const scoreItem = (item: any) => {
      let score = 0;

      const itemCatName = (item.categoryLabel || "").toLowerCase();
      const itemCatId = item.categoryId || "";

      // kategori paling kuat
      if (itemCatId && catIdSet.has(itemCatId)) score += 10;
      if (itemCatName && catNameSet.has(itemCatName)) score += 8;

      // keyword
      const title = (item.title || "").toLowerCase();
      const text = (
        (item.title || "") +
        " " +
        (item.excerpt || "") +
        " " +
        (item.content || "")
      ).toLowerCase();

      for (const k of keywords) {
        if (!k) continue;
        if (title.includes(k)) score += 3;
        if (text.includes(k)) score += 1;
      }

      return score;
    };

    const scored = withCategoryLabel
      .map((item: any) => ({ ...item, _score: scoreItem(item) }))
      .filter((x: any) => x._score > 0)
      .sort((a: any, b: any) => {
        if (b._score !== a._score) return b._score - a._score;

        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });

    // opsional: jangan tampilkan item yang sama dengan populer
    const popularIds = new Set(popularNews.map((x) => x.id));
    const unique = scored.filter((x: any) => !popularIds.has(x.id));

    return unique.slice(0, 5);
  }, [interests, withCategoryLabel, popularNews]);

  const categories = [
    "Politik",
    "Ekonomi",
    "Olahraga",
    "Teknologi",
    "Hiburan",
    "Kesehatan",
    "Pendidikan",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Breaking News */}
      <div className="bg-[#1d2d68] text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center overflow-hidden mr-6">
            <div className="flex-1">
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: "-100%" }}
                transition={{
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: 30,
                  ease: "linear",
                }}
                className="whitespace-nowrap"
              >
                {featuredNews.length > 0
                  ? featuredNews[0].title
                  : "Selamat datang di portal berita terpercaya..."}
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
                        {featuredNews[0].categoryName ??
                          featuredNews[0].category ??
                          "Tanpa Kategori"}
                      </span>
                      <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">
                        {featuredNews[0].title}
                      </h2>
                      <div className="flex items-center text-white text-sm mt-2">
                        <FiUser className="mr-1" /> {featuredNews[0].author}
                        <FiClock className="ml-4 mr-1" />{" "}
                        {featuredNews[0].createdAt?.toDate
                          ? featuredNews[0].createdAt
                              .toDate()
                              .toLocaleDateString("id-ID")
                          : "Hari ini"}
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
                            {news.categoryName ??
                              news.category ??
                              "Tanpa Kategori"}
                          </span>
                          <h3 className="font-bold text-lg mt-2 mb-3 line-clamp-2">
                            {news.title}
                          </h3>
                          <div className="flex items-center text-gray-500 text-sm">
                            <FiUser className="mr-1" /> {news.author}
                            <FiClock className="ml-4 mr-1" />{" "}
                            {news.createdAt?.toDate
                              ? news.createdAt
                                  .toDate()
                                  .toLocaleDateString("id-ID")
                              : "Hari ini"}
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
                            <span>
                              {news.categoryName ??
                                news.category ??
                                "Tanpa Kategori"}
                            </span>
                            <span className="mx-2">•</span>
                            <span>
                              {news.createdAt?.toDate
                                ? news.createdAt
                                    .toDate()
                                    .toLocaleDateString("id-ID")
                                : "Hari ini"}
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
                  : popularNews.map((news: any) => (
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
                                  .toLocaleDateString("id-ID")
                              : "Hari ini"}
                          </div>
                        </div>
                      </div>
                    ))}
              </div>
            </div>

            {/* ✅ Recommended News (dibawah populer) */}
            {!isLoadingProfile && interests && (
              <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <div className="border-b-2 border-[#1d2d68] pb-2 mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    BERITA REKOMENDASI
                  </h2>
                  <Link
                    href="/onboarding?mode=edit"
                    className="text-xs text-[#1d2d68] hover:underline"
                  >
                    Ubah
                  </Link>
                </div>

                <div className="space-y-4">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-16 h-12 bg-gray-200 rounded"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      </div>
                    ))
                  ) : recommendedNews.length === 0 ? (
                    <div className="text-sm text-gray-600">
                      Belum ada rekomendasi. Coba tambah keyword atau kategori
                      di preferensi.
                    </div>
                  ) : (
                    recommendedNews.map((news: any) => (
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
                                  .toLocaleDateString("id-ID")
                              : "Hari ini"}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

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

      <Footer />
    </div>
  );
}
