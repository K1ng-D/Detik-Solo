"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import NewsCard from "@/components/NewsCard";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiFilter,
  FiGrid,
  FiList,
  FiSearch,
  FiHome,
  FiStar,
} from "react-icons/fi";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

interface News {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  imageUrl: string;

  // ✅ support data lama + baru
  category?: string; // lama
  categoryId?: string; // baru
  categoryName?: string; // baru

  author: string;
  createdAt: any;
}

interface ExternalNews {
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  source: { name: string };
  publishedAt: string;
}

type UserInterests = {
  categoryIds: string[];
  categoryNames: string[];
  keywords: string[];
};

export default function NewsPage() {
  const router = useRouter();

  const [news, setNews] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // kategori dari berita (fallback), untuk UI filter versi lama
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const [externalNews, setExternalNews] = useState<ExternalNews[]>([]);
  const [isLoadingExternal, setIsLoadingExternal] = useState(true);

  // ✅ user onboarding interests
  const [interests, setInterests] = useState<UserInterests | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // ✅ GUARD + ambil profile interests
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      // kalau /news publik, biarkan user null (tidak ada rekomendasi personal)
      if (!user) {
        setInterests(null);
        setIsLoadingProfile(false);
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));
      const done = snap.exists() && snap.data()?.onboardingCompleted === true;

      if (!done) {
        router.replace("/onboarding");
        return;
      }

      const data: any = snap.data() || {};
      const i = data.interests || {};

      setInterests({
        categoryIds: Array.isArray(i.categoryIds) ? i.categoryIds : [],
        categoryNames: Array.isArray(i.categoryNames) ? i.categoryNames : [],
        keywords: Array.isArray(i.keywords) ? i.keywords : [],
      });

      setIsLoadingProfile(false);
    });

    return () => unsub();
  }, [router]);

  // 🔹 Ambil berita dari Firestore
  useEffect(() => {
    const newsRef = collection(db, "news");
    const q = query(newsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newsData: News[] = [];
      const categorySet = new Set<string>();

      snapshot.forEach((d) => {
        const data = d.data() as any;

        const categoryLabel =
          data.categoryName ?? data.category ?? "Tanpa Kategori";

        newsData.push({
          id: d.id,
          title: data.title,
          content: data.content,
          excerpt:
            data.excerpt ||
            (data.content ? data.content.substring(0, 150) + "..." : ""),
          imageUrl: data.imageUrl,
          category: data.category, // lama
          categoryId: data.categoryId, // baru
          categoryName: data.categoryName, // baru
          author: data.author,
          createdAt: data.createdAt,
        });

        categorySet.add(categoryLabel);
      });

      setNews(newsData);
      setCategories(["all", ...Array.from(categorySet)]);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🔹 Ambil berita eksternal via API route
  useEffect(() => {
    async function fetchExternalNews() {
      try {
        const res = await fetch("/api/external-news");
        const data = await res.json();
        setExternalNews(data.articles || []);
      } catch (err) {
        console.error("Error fetch external news:", err);
      } finally {
        setIsLoadingExternal(false);
      }
    }
    fetchExternalNews();
  }, []);

  // ✅ Helper agar kategori tidak pernah undefined
  const withCategoryLabel = useMemo(() => {
    return news.map((n) => ({
      ...n,
      categoryLabel: n.categoryName ?? n.category ?? "Tanpa Kategori",
    }));
  }, [news]);

  // 🔹 Filtering
  const filteredNews =
    selectedCategory === "all"
      ? withCategoryLabel
      : withCategoryLabel.filter(
          (item) => item.categoryLabel === selectedCategory,
        );

  // 🔹 Searching
  const qLower = searchQuery.trim().toLowerCase();

  const searchedNews = qLower
    ? filteredNews.filter((item) => {
        const title = (item.title ?? "").toLowerCase();
        const content = (item.content ?? "").toLowerCase();
        const cat = (item.categoryLabel ?? "").toLowerCase();
        return (
          title.includes(qLower) ||
          content.includes(qLower) ||
          cat.includes(qLower)
        );
      })
    : filteredNews;

  // =========================
  // ✅ REKOMENDASI UNTUKMU
  // =========================
  const recommendedNews = useMemo(() => {
    if (!interests) return [];

    const catIdSet = new Set(interests.categoryIds || []);
    const catNameSet = new Set(
      (interests.categoryNames || []).map((x) => (x || "").toLowerCase()),
    );
    const keywords = (interests.keywords || [])
      .map((k) => (k || "").trim().toLowerCase())
      .filter(Boolean);

    // skor sederhana content-based (sesuai onboarding)
    const scoreItem = (item: any) => {
      let score = 0;

      const itemCatName = (item.categoryLabel || "").toLowerCase();
      const itemCatId = item.categoryId || "";

      // kategori: faktor utama
      if (itemCatId && catIdSet.has(itemCatId)) score += 10;
      if (itemCatName && catNameSet.has(itemCatName)) score += 8;

      // keyword: faktor pendukung
      const title = (item.title || "").toLowerCase();
      const text = (
        (item.title || "") +
        " " +
        (item.excerpt || "") +
        " " +
        (item.content || "")
      ).toLowerCase();

      // bobot keyword di title lebih tinggi
      for (const k of keywords) {
        if (!k) continue;
        if (title.includes(k)) score += 3;
        if (text.includes(k)) score += 1;
      }

      return score;
    };

    const scored = withCategoryLabel
      .map((item: any) => ({
        ...item,
        _score: scoreItem(item),
      }))
      // buang yang skor 0 supaya rekomendasi beneran relevan
      .filter((x: any) => x._score > 0)
      // urut skor -> kalau sama, yang terbaru dulu
      .sort((a: any, b: any) => {
        if (b._score !== a._score) return b._score - a._score;

        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });

    // ambil top 6 (ubah sesuai kebutuhan)
    return scored.slice(0, 6);
  }, [interests, withCategoryLabel]);

  // 🔹 Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-[#1d2d68] flex items-center">
            <FiHome className="mr-1" size={14} /> Beranda
          </Link>
          <span className="mx-2">/</span>
          <span>Berita</span>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Berita Terkini
          </h1>
          <p className="text-gray-600 mb-8">
            Temukan berita terbaru dan terpercaya dari berbagai kategori
          </p>

          {/* ✅ Rekomendasi Untukmu */}
          {!isLoadingProfile && interests && recommendedNews.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-[#1d2d68]/10 flex items-center justify-center">
                    <FiStar className="text-[#1d2d68]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Rekomendasi Untukmu
                    </h2>
                    <p className="text-sm text-gray-500">
                      Berdasarkan preferensi onboarding kamu
                    </p>
                  </div>
                </div>

                <Link
                  href="/onboarding?mode=edit"
                  className="text-sm text-[#1d2d68] hover:underline"
                >
                  Ubah preferensi
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recommendedNews.map((item: any) => (
                  <NewsCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    excerpt={item.excerpt}
                    imageUrl={item.imageUrl}
                    category={item.categoryLabel}
                    author={item.author}
                    date={
                      item.createdAt?.toDate
                        ? item.createdAt.toDate().toISOString()
                        : new Date().toISOString()
                    }
                    variant="grid"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Search & Filter */}
          <div className="bg-white border rounded-lg p-5 mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari berita..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#1d2d68] focus:border-[#1d2d68]"
                />
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-md ${
                    viewMode === "grid"
                      ? "bg-white text-[#1d2d68] shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <FiGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-md ${
                    viewMode === "list"
                      ? "bg-white text-[#1d2d68] shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <FiList size={16} />
                </button>
              </div>
            </div>

            {/* Category */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FiFilter className="text-gray-500" size={16} />
                <span className="text-sm font-medium">Filter Kategori:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      selectedCategory === cat
                        ? "bg-[#1d2d68] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {cat === "all" ? "Semua" : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* News List */}
          <AnimatePresence mode="wait">
            {searchedNews.length === 0 ? (
              <motion.div className="text-center py-12 border rounded-lg">
                <FiSearch className="mx-auto mb-3 text-gray-400" size={32} />
                <p className="text-gray-600">Tidak ada berita ditemukan</p>
              </motion.div>
            ) : (
              <motion.div
                key={viewMode}
                className={`grid gap-6 ${
                  viewMode === "grid"
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1"
                }`}
              >
                {searchedNews.map((item: any) => (
                  <NewsCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    excerpt={item.excerpt}
                    imageUrl={item.imageUrl}
                    category={item.categoryLabel}
                    author={item.author}
                    date={
                      item.createdAt?.toDate
                        ? item.createdAt.toDate().toISOString()
                        : new Date().toISOString()
                    }
                    variant={viewMode}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* External News */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Berita Internasional</h2>
          {isLoadingExternal ? (
            <p className="text-gray-600">Sedang memuat...</p>
          ) : externalNews.length === 0 ? (
            <p className="text-gray-600">Tidak ada berita dari luar.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {externalNews.map((item, idx) => (
                <motion.a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {item.urlToImage && (
                    <img
                      src={item.urlToImage}
                      alt={item.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold mb-2 text-[#1d2d68]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {item.description || "Tidak ada deskripsi"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.source?.name} •{" "}
                      {new Date(item.publishedAt).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                </motion.a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
