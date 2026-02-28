"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

import CommentBox from "@/components/CommentBox";
import CommentList from "@/components/CommentList";
import { motion } from "framer-motion";
import {
  FiCalendar,
  FiUser,
  FiArrowLeft,
  FiShare2,
  FiMessageSquare,
  FiHeart,
  FiClock,
  FiTrendingUp,
  FiStar,
} from "react-icons/fi";
import { onAuthStateChanged } from "firebase/auth";

interface News {
  id: string;
  title: string;
  content: string;
  imageUrl: string;

  // ✅ kompatibel: data lama & data baru
  category?: string; // lama (string)
  categoryId?: string; // baru
  categoryName?: string; // baru

  author: string;
  createdAt: any;
  views: number;
  excerpt?: string;
}

interface RelatedNews {
  id: string;
  title: string;
  imageUrl: string;

  category?: string;
  categoryId?: string;
  categoryName?: string;

  createdAt: any;
  author: string;
}

type UserInterests = {
  categoryIds: string[];
  categoryNames: string[];
  keywords: string[];
};

export default function NewsDetailPage() {
  const params = useParams();
  const newsId = params.id as string;

  const [news, setNews] = useState<News | null>(null);

  // sidebar
  const [relatedNews, setRelatedNews] = useState<RelatedNews[]>([]);
  const [latestNews, setLatestNews] = useState<RelatedNews[]>([]);
  const [recommendedNews, setRecommendedNews] = useState<RelatedNews[]>([]);

  const [interests, setInterests] = useState<UserInterests | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentRefresh, setCommentRefresh] = useState(0);

  // ✅ ambil interests user (untuk rekomendasi)
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
        console.error("Error load interests:", e);
        setInterests(null);
      } finally {
        setIsLoadingProfile(false);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const newsDoc = await getDoc(doc(db, "news", newsId));

        if (!newsDoc.exists()) {
          setError("Berita tidak ditemukan");
          setIsLoading(false);
          return;
        }

        const newsData = {
          id: newsDoc.id,
          ...(newsDoc.data() as any),
        } as News;
        setNews(newsData);

        // 1) Related news (sementara: 3 terbaru selain current)
        const relatedQuery = query(
          collection(db, "news"),
          orderBy("createdAt", "desc"),
          limit(8),
        );
        const relatedSnapshot = await getDocs(relatedQuery);
        const relatedData: RelatedNews[] = [];

        relatedSnapshot.forEach((d) => {
          if (d.id !== newsId && relatedData.length < 3) {
            const data = d.data() as any;
            relatedData.push({
              id: d.id,
              title: data.title,
              imageUrl: data.imageUrl,
              category: data.category,
              categoryId: data.categoryId,
              categoryName: data.categoryName,
              createdAt: data.createdAt,
              author: data.author,
            });
          }
        });
        setRelatedNews(relatedData);

        // 2) Latest news (paling update) — 5 terbaru selain current
        const latestQuery = query(
          collection(db, "news"),
          orderBy("createdAt", "desc"),
          limit(12),
        );
        const latestSnapshot = await getDocs(latestQuery);
        const latestData: RelatedNews[] = [];
        latestSnapshot.forEach((d) => {
          if (d.id !== newsId && latestData.length < 5) {
            const data = d.data() as any;
            latestData.push({
              id: d.id,
              title: data.title,
              imageUrl: data.imageUrl,
              category: data.category,
              categoryId: data.categoryId,
              categoryName: data.categoryName,
              createdAt: data.createdAt,
              author: data.author,
            });
          }
        });
        setLatestNews(latestData);

        // rekomendasi dihitung setelah interests siap (lihat useEffect lain)
      } catch (err) {
        console.error("Error fetching news:", err);
        setError("Terjadi kesalahan saat memuat berita");
      } finally {
        setIsLoading(false);
      }
    };

    if (newsId) fetchNews();
  }, [newsId]);

  // ✅ hitung rekomendasi ketika: interests siap + news sudah ada + latestNews sudah ada
  useEffect(() => {
    if (!news) return;
    if (isLoadingProfile) return;

    // sumber kandidat rekomendasi: ambil dari latestNews dulu (ringan)
    const candidates = latestNews;

    // kalau belum login / belum ada interests -> kosong
    if (!interests) {
      setRecommendedNews([]);
      return;
    }

    const catIdSet = new Set(interests.categoryIds || []);
    const catNameSet = new Set(
      (interests.categoryNames || []).map((x) => (x || "").toLowerCase()),
    );
    const keywords = (interests.keywords || [])
      .map((k) => (k || "").trim().toLowerCase())
      .filter(Boolean);

    const getLabel = (n: any) =>
      n.categoryName ?? n.category ?? "Tanpa Kategori";

    const score = (item: any) => {
      let s = 0;

      const itemCatId = item.categoryId || "";
      const itemCatName = (getLabel(item) || "").toLowerCase();

      if (itemCatId && catIdSet.has(itemCatId)) s += 10;
      if (itemCatName && catNameSet.has(itemCatName)) s += 8;

      const title = (item.title || "").toLowerCase();
      const text = (item.title + " " + (item.author || "")).toLowerCase();

      for (const k of keywords) {
        if (title.includes(k)) s += 3;
        if (text.includes(k)) s += 1;
      }

      return s;
    };

    const scored = candidates
      .filter((x) => x.id !== newsId)
      .map((x: any) => ({ ...x, _score: score(x) }))
      .filter((x: any) => x._score > 0)
      .sort((a: any, b: any) => {
        if (b._score !== a._score) return b._score - a._score;

        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      })
      .slice(0, 5)
      .map(({ _score, ...rest }: any) => rest);

    setRecommendedNews(scored);
  }, [news, latestNews, interests, isLoadingProfile, newsId]);

  const handleCommentAdded = () => {
    setCommentRefresh((prev) => prev + 1);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // === Share ===
  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: news?.title,
          text: news?.excerpt || "Baca berita menarik ini!",
          url: window.location.href,
        })
        .catch((err) => console.error("Error sharing:", err));
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert("Link berita berhasil disalin 📋");
      });
    }
  };

  // ✅ Helper kategori aman
  const categoryLabel =
    news?.categoryName ?? news?.category ?? "Tanpa Kategori";
  const categorySlug = (categoryLabel || "Tanpa Kategori").toLowerCase();

  const categoryHref = news?.categoryId
    ? `/news?category=${news.categoryId}`
    : `/#category/${categorySlug}`;

  // helper label utk list sidebar
  const labelOf = (n: any) => n.categoryName ?? n.category ?? "Tanpa Kategori";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse space-y-8">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className={`h-4 bg-gray-200 rounded ${
                    i === 3 ? "w-3/4" : "w-full"
                  }`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center border border-gray-200"
        >
          <div className="w-16 h-16 bg-[#1d2d68]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-[#1d2d68]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#1d2d68] mb-2">
            Berita Tidak Ditemukan
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "Berita yang Anda cari tidak ditemukan"}
          </p>
          <Link
            href="/"
            className="inline-flex items-center bg-[#1d2d68] text-white px-4 py-2 rounded hover:bg-[#1d2d68]/90 transition-colors duration-200"
          >
            <FiArrowLeft className="mr-2" />
            Kembali ke Beranda
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Breadcrumb and Back Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center text-sm text-gray-500">
            <Link href="/" className="hover:text-[#1d2d68]">
              Beranda
            </Link>
            <span className="mx-2">/</span>
            <Link
              href={categoryHref}
              className="hover:text-[#1d2d68] capitalize"
            >
              {categoryLabel}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 line-clamp-1">{news.title}</span>
          </div>

          <Link
            href="/"
            className="flex items-center text-[#1d2d68] hover:text-[#1d2d68]/80 text-sm"
          >
            <FiArrowLeft className="mr-1" />
            Kembali
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="lg:w-2/3">
            {/* Article Header */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                {news.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
                <div className="flex items-center">
                  <FiUser className="mr-1" size={14} />
                  {news.author}
                </div>
                <div className="flex items-center">
                  <FiCalendar className="mr-1" size={14} />
                  {news.createdAt?.toDate
                    ? formatDate(news.createdAt.toDate())
                    : "Tanggal tidak tersedia"}
                </div>
                <div className="flex items-center">
                  <FiClock className="mr-1" size={14} />
                  {news.createdAt?.toDate
                    ? formatTime(news.createdAt.toDate())
                    : ""}
                </div>
              </div>
            </div>

            {/* Featured Image */}
            {news.imageUrl && (
              <div className="relative h-64 md:h-96 w-full mb-6 rounded-lg overflow-hidden">
                <Image
                  src={news.imageUrl}
                  alt={news.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 66vw"
                />
              </div>
            )}

            {/* Social Share */}
            <div className="flex items-center justify-between py-4 border-t border-b border-gray-200 mb-6">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700">Bagikan:</span>
                <button
                  onClick={handleShare}
                  className="text-gray-500 hover:text-[#1d2d68] p-2 transition-colors"
                >
                  <FiShare2 size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="mb-8">
              <div
                className="prose max-w-none text-gray-800 leading-relaxed text-justify"
                dangerouslySetInnerHTML={{
                  __html: (news.content || "").replace(/\n/g, "<br/>"),
                }}
              />
            </div>

            {/* Comments */}
            <div className="border-t border-gray-200 pt-8 mb-8">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-[#1d2d68]/10 rounded-full flex items-center justify-center mr-3">
                  <FiMessageSquare className="text-[#1d2d68]" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Komentar Pembaca
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Bagikan pendapat Anda tentang berita ini
                  </p>
                </div>
              </div>

              <CommentBox newsId={newsId} onCommentAdded={handleCommentAdded} />

              <div className="mt-6">
                <CommentList newsId={newsId} key={commentRefresh} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-1/3">
            {/* Related News */}
            {relatedNews.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-5 mb-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-[#1d2d68]/10 rounded-full flex items-center justify-center mr-3">
                    <FiHeart className="text-[#1d2d68]" size={16} />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Berita Terkait
                  </h2>
                </div>

                <div className="space-y-4">
                  {relatedNews.map((item) => (
                    <div key={item.id} className="group">
                      <Link href={`/news/${item.id}`} className="flex gap-3">
                        <div className="flex-shrink-0 w-16 h-16 relative rounded overflow-hidden">
                          <Image
                            src={item.imageUrl || "/placeholder-news.jpg"}
                            alt={item.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                            sizes="64px"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-[#1d2d68] transition-colors duration-200 mb-1">
                            {item.title}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {labelOf(item)} •{" "}
                            {item.createdAt?.toDate
                              ? item.createdAt
                                  .toDate()
                                  .toLocaleDateString("id-ID")
                              : ""}
                          </p>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ✅ Latest News */}
            {latestNews.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-[#1d2d68]/10 rounded-full flex items-center justify-center mr-3">
                      <FiTrendingUp className="text-[#1d2d68]" size={16} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Berita Terkini
                    </h2>
                  </div>
                  <Link
                    href="/news"
                    className="text-xs text-[#1d2d68] hover:underline"
                  >
                    Lihat semua
                  </Link>
                </div>

                <div className="space-y-4">
                  {latestNews.map((item) => (
                    <div key={item.id} className="group">
                      <Link href={`/news/${item.id}`} className="flex gap-3">
                        <div className="flex-shrink-0 w-16 h-16 relative rounded overflow-hidden">
                          <Image
                            src={item.imageUrl || "/placeholder-news.jpg"}
                            alt={item.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                            sizes="64px"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-[#1d2d68] transition-colors duration-200 mb-1">
                            {item.title}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {labelOf(item)} •{" "}
                            {item.createdAt?.toDate
                              ? item.createdAt
                                  .toDate()
                                  .toLocaleDateString("id-ID")
                              : ""}
                          </p>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ✅ Recommended News */}
            {!isLoadingProfile && interests && (
              <div className="bg-gray-50 rounded-lg p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-[#1d2d68]/10 rounded-full flex items-center justify-center mr-3">
                      <FiStar className="text-[#1d2d68]" size={16} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Rekomendasi Untukmu
                    </h2>
                  </div>
                  <Link
                    href="/onboarding?mode=edit"
                    className="text-xs text-[#1d2d68] hover:underline"
                  >
                    Ubah
                  </Link>
                </div>

                {recommendedNews.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    Belum ada rekomendasi. Tambahkan kategori/keyword di
                    preferensi.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recommendedNews.map((item) => (
                      <div key={item.id} className="group">
                        <Link href={`/news/${item.id}`} className="flex gap-3">
                          <div className="flex-shrink-0 w-16 h-16 relative rounded overflow-hidden">
                            <Image
                              src={item.imageUrl || "/placeholder-news.jpg"}
                              alt={item.title}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                              sizes="64px"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-[#1d2d68] transition-colors duration-200 mb-1">
                              {item.title}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {labelOf(item)} •{" "}
                              {item.createdAt?.toDate
                                ? item.createdAt
                                    .toDate()
                                    .toLocaleDateString("id-ID")
                                : ""}
                            </p>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* kalau user belum login, optional: tampilkan ajakan login */}
            {!isLoadingProfile && !interests && (
              <div className="bg-gray-50 rounded-lg p-5 mb-6">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-[#1d2d68]/10 rounded-full flex items-center justify-center mr-3">
                    <FiStar className="text-[#1d2d68]" size={16} />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Rekomendasi Untukmu
                  </h2>
                </div>
                <p className="text-sm text-gray-600">
                  Login untuk melihat rekomendasi sesuai minatmu.
                </p>
                <Link
                  href="/login"
                  className="inline-block mt-3 text-sm text-[#1d2d68] hover:underline"
                >
                  Login sekarang →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
