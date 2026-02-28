"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MotionWrapper from "@/components/MotionWrapper";
import { uploadImage } from "@/lib/cloudinary";

import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

import { motion, AnimatePresence } from "framer-motion";
import {
  FiPlus,
  FiFileText,
  FiMessageCircle,
  FiEye,
  FiEdit,
  FiTrash2,
  FiX,
  FiCalendar,
  FiUser,
  FiTag,
  FiLoader,
  FiImage,
  FiSave,
  FiSearch,
  FiFilter,
} from "react-icons/fi";

interface News {
  id: string;
  title: string;
  category: string;
  author: string;
  content?: string;
  imageUrl?: string;
  createdAt: any;
  views: number;
  commentsCount: number;
}

interface Comment {
  id: string;
  userName: string;
  content: string;
  createdAt: any;
}

export default function ManageNewsPage() {
  const [news, setNews] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // comments modal
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // edit modal
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // UI controls
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // ---------- Animations ----------
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 120 },
    },
  };

  const modalVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring" as const, damping: 22, stiffness: 260 },
    },
    exit: { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.18 } },
  };

  // ---------- Fetch news ----------
  useEffect(() => {
    const newsRef = collection(db, "news");
    const q = query(newsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const base = snapshot.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          title: data.title ?? "",
          category: data.category ?? data.categoryName ?? "Tanpa Kategori",
          author: data.author ?? "-",
          content: data.content ?? "",
          imageUrl: data.imageUrl ?? "",
          createdAt: data.createdAt,
          views: data.views || 0,
          commentsCount: 0,
        } as News;
      });

      // hitung komentar pakai getCountFromServer (lebih ringan dari getDocs)
      const withCounts = await Promise.all(
        base.map(async (n) => {
          try {
            const countSnap = await getCountFromServer(
              collection(db, "news", n.id, "comments"),
            );
            return { ...n, commentsCount: countSnap.data().count };
          } catch {
            return n;
          }
        }),
      );

      setNews(withCounts);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ---------- Derived data ----------
  const categories = useMemo(() => {
    const set = new Set<string>();
    news.forEach((n) => set.add(n.category || "Tanpa Kategori"));
    return ["all", ...Array.from(set)];
  }, [news]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return news.filter((n) => {
      const catOk =
        selectedCategory === "all" ? true : n.category === selectedCategory;

      if (!q) return catOk;

      const t = (n.title ?? "").toLowerCase();
      const a = (n.author ?? "").toLowerCase();
      const c = (n.category ?? "").toLowerCase();

      return catOk && (t.includes(q) || a.includes(q) || c.includes(q));
    });
  }, [news, searchQuery, selectedCategory]);

  const stats = useMemo(() => {
    const total = news.length;
    const totalViews = news.reduce((acc, n) => acc + (n.views || 0), 0);
    const totalComments = news.reduce(
      (acc, n) => acc + (n.commentsCount || 0),
      0,
    );
    return { total, totalViews, totalComments };
  }, [news]);

  // ---------- Actions ----------
  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus berita ini?")) return;

    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "news", id));
    } catch (error) {
      console.error("Error deleting news:", error);
      alert("Gagal menghapus berita");
    } finally {
      setDeletingId(null);
    }
  };

  // NOTE: kamu sebelumnya ambil list komentar dengan getDocs.
  // Di sini aku biarkan gaya lama (tetap kompatibel).
  const fetchComments = async (newsId: string, newsItem: News) => {
    setCommentsLoading(true);
    setSelectedNews(newsItem);

    try {
      const snap = await fetch(
        `/api/comments?newsId=${encodeURIComponent(newsId)}`,
      );
      // kalau kamu belum punya api ini, fallback: kasih empty
      if (!snap.ok) {
        // fallback minimal: biar tidak crash
        setComments([]);
      } else {
        const data = await snap.json();
        setComments(Array.isArray(data?.comments) ? data.comments : []);
      }

      setShowCommentsModal(true);
    } catch (e) {
      console.error(e);
      alert(
        "Gagal memuat komentar (opsional: buat /api/comments untuk list komentar)",
      );
      setComments([]);
      setShowCommentsModal(true);
    } finally {
      setCommentsLoading(false);
    }
  };

  const closeCommentsModal = () => {
    setShowCommentsModal(false);
    setSelectedNews(null);
    setComments([]);
  };

  const handleUpdateNews = async () => {
    if (!editingNews) return;
    setEditLoading(true);

    try {
      let imageUrl = editingNews.imageUrl || "";
      if (newImage) imageUrl = await uploadImage(newImage);

      await updateDoc(doc(db, "news", editingNews.id), {
        title: editingNews.title,
        category: editingNews.category,
        author: editingNews.author,
        content: editingNews.content || "",
        imageUrl,
        updatedAt: serverTimestamp(),
      });

      setEditingNews(null);
      setNewImage(null);
      setImagePreview(null);
    } catch (error) {
      console.error("Error updating news:", error);
      alert("Gagal mengupdate berita");
    } finally {
      setEditLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const fmtDate = (ts: any) => {
    if (!ts?.toDate) return "N/A";
    return ts.toDate().toLocaleDateString("id-ID");
  };

  if (isLoading) {
    return (
      <MotionWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1d2d68]"
          />
        </div>
      </MotionWrapper>
    );
  }

  return (
    <MotionWrapper>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6"
        >
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Kelola Berita
            </h1>
            <p className="text-gray-600 mt-1">
              Kelola artikel, edit konten, dan pantau performa.
            </p>
          </div>

          <Link
            href="/admin/create-news"
            className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-white
              bg-gradient-to-r from-[#1d2d68] to-indigo-700 hover:to-indigo-800 transition
              shadow-lg shadow-black/10"
          >
            <FiPlus className="w-5 h-5 mr-2" />
            Buat Berita Baru
          </Link>
        </motion.div>

        {/* Stats + Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">Total Berita</div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.total}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">Total Komentar</div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalComments}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-xl">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul, author, kategori..."
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#1d2d68] focus:border-[#1d2d68]"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2.5 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#1d2d68] focus:border-[#1d2d68]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "Semua Kategori" : c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table / Empty */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center border">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
              <FiFileText className="w-7 h-7 text-gray-400" />
            </div>
            <p className="mt-4 text-gray-700 font-semibold">
              Tidak ada berita yang cocok.
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Coba ubah filter kategori atau kata kunci pencarian.
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl border shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Berita
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                      Kategori
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                      Penulis
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Komentar
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filtered.map((item) => (
                    <motion.tr
                      key={item.id}
                      variants={itemVariants}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border">
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <FiImage />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 line-clamp-2">
                              {item.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                              <span className="inline-flex items-center gap-1 md:hidden">
                                <FiTag className="text-gray-400" />{" "}
                                {item.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="text-sm text-gray-900 flex items-center">
                          <FiTag className="mr-1 text-gray-400" size={14} />
                          {item.category}
                        </div>
                      </td>

                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="text-sm text-gray-900 flex items-center">
                          <FiUser className="mr-1 text-gray-400" size={14} />
                          {item.author}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 flex items-center">
                          <FiCalendar
                            className="mr-1 text-gray-400"
                            size={14}
                          />
                          {fmtDate(item.createdAt)}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => fetchComments(item.id, item)}
                          className="inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-sm
                            text-purple-700 bg-purple-50 hover:bg-purple-100 transition"
                        >
                          <FiMessageCircle className="w-4 h-4" />
                          {item.commentsCount}
                        </button>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/news/${item.id}`}
                            target="_blank"
                            className="p-2 rounded-xl text-[#1d2d68] hover:bg-[#1d2d68]/10 transition"
                            title="Lihat"
                          >
                            <FiEye size={18} />
                          </Link>

                          <button
                            onClick={() => setEditingNews(item)}
                            className="p-2 rounded-xl text-emerald-700 hover:bg-emerald-50 transition"
                            title="Edit"
                          >
                            <FiEdit size={18} />
                          </button>

                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="p-2 rounded-xl text-red-700 hover:bg-red-50 transition disabled:opacity-60"
                            title="Hapus"
                          >
                            {deletingId === item.id ? (
                              <FiLoader className="w-5 h-5 animate-spin" />
                            ) : (
                              <FiTrash2 size={18} />
                            )}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ---------- EDIT MODAL ---------- */}
        <AnimatePresence>
          {editingNews && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                className="absolute inset-0 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setEditingNews(null);
                  setImagePreview(null);
                }}
              />

              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900">
                        Edit Berita
                      </h2>
                      <p className="text-sm text-gray-500">
                        Perbarui judul, kategori, author, konten, dan gambar.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setEditingNews(null);
                        setImagePreview(null);
                      }}
                      className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition"
                      aria-label="Close"
                    >
                      <FiX size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        Judul
                      </label>
                      <input
                        value={editingNews.title}
                        onChange={(e) =>
                          setEditingNews({
                            ...editingNews,
                            title: e.target.value,
                          })
                        }
                        className="mt-1 w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-[#1d2d68] focus:border-[#1d2d68]"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700">
                          Kategori
                        </label>
                        <input
                          value={editingNews.category}
                          onChange={(e) =>
                            setEditingNews({
                              ...editingNews,
                              category: e.target.value,
                            })
                          }
                          className="mt-1 w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-[#1d2d68] focus:border-[#1d2d68]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">
                          Penulis
                        </label>
                        <input
                          value={editingNews.author}
                          onChange={(e) =>
                            setEditingNews({
                              ...editingNews,
                              author: e.target.value,
                            })
                          }
                          className="mt-1 w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-[#1d2d68] focus:border-[#1d2d68]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        Konten
                      </label>
                      <textarea
                        rows={7}
                        value={editingNews.content || ""}
                        onChange={(e) =>
                          setEditingNews({
                            ...editingNews,
                            content: e.target.value,
                          })
                        }
                        className="mt-1 w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-[#1d2d68] focus:border-[#1d2d68]"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        Gambar
                      </label>

                      <label
                        className="mt-1 flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed cursor-pointer
                        hover:bg-gray-50 transition"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <FiImage className="w-7 h-7 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600">
                            <span className="font-semibold">
                              Klik untuk upload
                            </span>{" "}
                            (PNG/JPG)
                          </p>
                          <p className="text-xs text-gray-500">
                            Rekomendasi max 5MB
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>

                      {(imagePreview || editingNews.imageUrl) && (
                        <div className="mt-3 rounded-2xl border overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imagePreview || editingNews.imageUrl}
                            alt="Preview"
                            className="w-full h-56 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => {
                        setEditingNews(null);
                        setImagePreview(null);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition inline-flex items-center"
                    >
                      <FiX className="mr-2" />
                      Batal
                    </button>

                    <button
                      onClick={handleUpdateNews}
                      disabled={editLoading}
                      className="px-4 py-2.5 rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600
                        hover:from-emerald-700 hover:to-teal-700 transition inline-flex items-center disabled:opacity-60"
                    >
                      {editLoading ? (
                        <>
                          <FiLoader className="mr-2 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <FiSave className="mr-2" />
                          Simpan
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ---------- COMMENTS MODAL ---------- */}
        <AnimatePresence>
          {showCommentsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                className="absolute inset-0 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeCommentsModal}
              />

              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col border"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold text-gray-900 truncate">
                      Komentar
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {selectedNews?.title}
                    </p>
                  </div>

                  <button
                    onClick={closeCommentsModal}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-grow">
                  {commentsLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.9,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1d2d68]"
                      />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-10">
                      <FiMessageCircle className="w-14 h-14 mx-auto text-gray-300" />
                      <p className="mt-3 text-gray-600 font-semibold">
                        Belum ada komentar
                      </p>
                      <p className="text-gray-500 text-sm">
                        Komentar pembaca akan muncul di sini.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-2xl border bg-gray-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="font-semibold text-gray-900">
                              {c.userName || "Anonymous"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {c.createdAt?.toDate
                                ? c.createdAt.toDate().toLocaleString("id-ID")
                                : "N/A"}
                            </div>
                          </div>
                          <p className="mt-2 text-gray-700 leading-relaxed">
                            {c.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </MotionWrapper>
  );
}
