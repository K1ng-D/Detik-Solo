"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MotionWrapper from "@/components/MotionWrapper";

import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit,
  getCountFromServer,
  collectionGroup,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

import { motion } from "framer-motion";
import {
  FiFileText,
  FiUsers,
  FiMessageCircle,
  FiPlus,
  FiArrowRight,
  FiClock,
  FiTag,
} from "react-icons/fi";

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
    recentNews: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [countLoading, setCountLoading] = useState(true);

  // --- Realtime: total news + recent news
  useEffect(() => {
    const qRecent = query(
      collection(db, "news"),
      orderBy("createdAt", "desc"),
      limit(5),
    );

    const unsub = onSnapshot(
      qRecent,
      async (snap) => {
        setStats((prev) => ({
          ...prev,
          recentNews: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        }));

        // totalNews realtime (lebih ringan pakai snapshot.size pada collection news langsung)
        // Tapi karena kita subscribe recent, kita ambil count pakai getCountFromServer (akurat).
        try {
          const countSnap = await getCountFromServer(collection(db, "news"));
          setStats((prev) => ({ ...prev, totalNews: countSnap.data().count }));
        } catch (e) {
          // fallback: minimal tidak crash
          // (kalau mau realtime total, bisa onSnapshot(collection(db,'news')) tapi itu lebih berat)
        }
      },
      (err) => console.error("news snapshot error:", err),
    );

    return () => unsub();
  }, []);

  // --- Realtime: total users
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snap) => {
        setStats((prev) => ({ ...prev, totalUsers: snap.size }));
      },
      (err) => console.error("users snapshot error:", err),
    );

    return () => unsub();
  }, []);

  // --- Count comments (akurat) via collectionGroup + getCountFromServer
  // Best practice: refresh on mount + (opsional) interval
  useEffect(() => {
    let alive = true;

    const run = async () => {
      setCountLoading(true);
      try {
        const countSnap = await getCountFromServer(
          collectionGroup(db, "comments"),
        );
        if (!alive) return;
        setStats((prev) => ({
          ...prev,
          totalComments: countSnap.data().count,
        }));
      } catch (e) {
        console.error("count comments error:", e);
      } finally {
        if (alive) setCountLoading(false);
      }
    };

    run();
    setIsLoading(false);

    // Optional: refresh tiap 60 detik (biar tetap update)
    const t = setInterval(run, 60_000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const cards = useMemo(
    () => [
      {
        label: "Total Berita",
        value: stats.totalNews,
        icon: <FiFileText className="w-5 h-5" />,
        accent: "text-[#1d2d68]",
        bg: "bg-[#1d2d68]/10",
      },
      {
        label: "Total Pengguna",
        value: stats.totalUsers,
        icon: <FiUsers className="w-5 h-5" />,
        accent: "text-emerald-700",
        bg: "bg-emerald-500/10",
      },
      {
        label: "Total Komentar",
        value: stats.totalComments,
        hint: countLoading ? "Memuat..." : undefined,
        icon: <FiMessageCircle className="w-5 h-5" />,
        accent: "text-orange-700",
        bg: "bg-orange-500/10",
      },
    ],
    [stats.totalNews, stats.totalUsers, stats.totalComments, countLoading],
  );

  const skeleton = (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );

  if (isLoading) return skeleton;

  return (
    <MotionWrapper>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Dashboard Admin
            </h1>
            <p className="text-gray-600 mt-1">
              Ringkasan statistik & aktivitas terbaru portal berita.
            </p>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/create-news"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white
              bg-gradient-to-r from-[#1d2d68] to-indigo-700 hover:to-indigo-800 transition shadow-lg shadow-black/10"
            >
              <FiPlus />
              Buat Berita
            </Link>

            <Link
              href="/admin/manage-news"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border bg-white hover:bg-gray-50 transition"
            >
              Kelola Berita <FiArrowRight />
            </Link>
          </div>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {cards.map((c) => (
            <div
              key={c.label}
              className="bg-white rounded-2xl border shadow-sm p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-500">{c.label}</div>
                  <div className={`text-3xl font-extrabold mt-2 ${c.accent}`}>
                    {c.value}
                  </div>
                  {c.hint && (
                    <div className="text-xs text-gray-500 mt-2">{c.hint}</div>
                  )}
                </div>
                <div
                  className={`w-11 h-11 rounded-2xl ${c.bg} flex items-center justify-center ${c.accent}`}
                >
                  {c.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent News */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">
                Berita Terbaru
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                5 berita paling update berdasarkan createdAt.
              </p>
            </div>

            <Link
              href="/admin/manage-news"
              className="text-sm font-semibold text-[#1d2d68] hover:underline inline-flex items-center gap-1"
            >
              Lihat semua <FiArrowRight />
            </Link>
          </div>

          {stats.recentNews.length === 0 ? (
            <div className="p-6 text-gray-500">Belum ada berita.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Judul
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Tanggal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-white">
                  {stats.recentNews.map((n: any) => {
                    const category =
                      n.categoryName ?? n.category ?? "Tanpa Kategori";
                    return (
                      <tr key={n.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900 line-clamp-2">
                            {String(n.title || "-").length > 70
                              ? String(n.title).substring(0, 70) + "..."
                              : String(n.title || "-")}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1">
                            <FiClock />{" "}
                            {n.createdAt?.toDate
                              ? n.createdAt
                                  .toDate()
                                  .toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                              : "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-3 py-1 bg-[#1d2d68]/10 text-[#1d2d68]">
                            <FiTag /> {category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {n.createdAt?.toDate
                            ? n.createdAt.toDate().toLocaleDateString("id-ID")
                            : "N/A"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MotionWrapper>
  );
}
