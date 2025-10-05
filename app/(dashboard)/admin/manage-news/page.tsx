"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import MotionWrapper from "@/components/MotionWrapper";
import { uploadImage } from "@/lib/cloudinary";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiPlus,
  FiFileText,
  FiHeart,
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
} from "react-icons/fi";
import { FaRegEye } from "react-icons/fa";

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
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // State untuk edit
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Animasi - Diperbaiki tipe TypeScript-nya
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
      },
    },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring" as const,
        damping: 25,
        stiffness: 300,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.2 },
    },
  };

  useEffect(() => {
    const newsRef = collection(db, "news");
    const q = query(newsRef);

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const newsData: News[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        // Hitung jumlah komentar
        const commentsSnapshot = await getDocs(
          collection(db, "news", docSnap.id, "comments")
        );
        const commentsCount = commentsSnapshot.size;

        newsData.push({
          id: docSnap.id,
          title: data.title,
          category: data.category,
          author: data.author,
          content: data.content,
          imageUrl: data.imageUrl,
          createdAt: data.createdAt,

          views: data.views || 0,
          commentsCount: commentsCount,
        });
      }

      // Sort by date descending
      newsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setNews(newsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus berita ini?")) {
      return;
    }

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

  const fetchComments = async (newsId: string, newsItem: News) => {
    setCommentsLoading(true);
    setSelectedNews(newsItem);

    try {
      const commentsSnapshot = await getDocs(
        collection(db, "news", newsId, "comments")
      );
      const commentsData: Comment[] = [];

      commentsSnapshot.forEach((doc) => {
        const data = doc.data();
        commentsData.push({
          id: doc.id,
          userName: data.userName || "Anonymous",
          content: data.content,
          createdAt: data.createdAt,
        });
      });

      // Sort comments by date (newest first)
      commentsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setComments(commentsData);
      setShowCommentsModal(true);
    } catch (error) {
      console.error("Error fetching comments:", error);
      alert("Gagal memuat komentar");
    } finally {
      setCommentsLoading(false);
    }
  };

  const closeCommentsModal = () => {
    setShowCommentsModal(false);
    setSelectedNews(null);
    setComments([]);
  };

  // Fungsi update berita
  const handleUpdateNews = async () => {
    if (!editingNews) return;
    setEditLoading(true);

    try {
      let imageUrl = editingNews.imageUrl || "";

      if (newImage) {
        imageUrl = await uploadImage(newImage);
      }

      const docRef = doc(db, "news", editingNews.id);
      await updateDoc(docRef, {
        title: editingNews.title,
        category: editingNews.category,
        author: editingNews.author,
        content: editingNews.content,
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

  // Handle image preview
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewImage(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <MotionWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"
          ></motion.div>
        </div>
      </MotionWrapper>
    );
  }

  return (
    <MotionWrapper>
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-between items-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">
            Kelola Berita
          </h1>
          <Link
            href="/admin/create-news"
            className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center shadow-md hover:shadow-lg"
          >
            <FiPlus className="w-5 h-5 mr-2" />
            Buat Berita Baru
          </Link>
        </motion.div>

        {news.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100"
          >
            <div className="flex justify-center">
              <FiFileText className="w-16 h-16 text-gray-300" />
            </div>
            <p className="mt-4 text-gray-500 text-lg">Belum ada berita.</p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-100"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Judul
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Kategori
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Penulis
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>

                    <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                      Komentar
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {news.map((item) => (
                    <motion.tr
                      key={item.id}
                      variants={itemVariants}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 line-clamp-2">
                          {item.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="text-sm text-gray-900 flex items-center">
                          <FiTag className="mr-1 text-gray-400" size={14} />
                          {item.category}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-sm text-gray-900 flex items-center">
                          <FiUser className="mr-1 text-gray-400" size={14} />
                          {item.author}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 flex items-center">
                          <FiCalendar
                            className="mr-1 text-gray-400"
                            size={14}
                          />
                          {item.createdAt?.toDate
                            ? item.createdAt
                                .toDate()
                                .toLocaleDateString("id-ID")
                            : "N/A"}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => fetchComments(item.id, item)}
                          className="text-sm text-purple-600 hover:text-purple-900 transition-colors duration-150 flex items-center justify-center"
                        >
                          <FiMessageCircle className="w-4 h-4 mr-1" />
                          {item.commentsCount}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <Link
                            href={`/news/${item.id}`}
                            target="_blank"
                            className="text-blue-600 hover:text-blue-900 transition-colors duration-150 p-1 rounded-md hover:bg-blue-50"
                            title="Lihat Berita"
                          >
                            <FiEye size={18} />
                          </Link>
                          <button
                            onClick={() => setEditingNews(item)}
                            className="text-green-600 hover:text-green-900 transition-colors duration-150 p-1 rounded-md hover:bg-green-50"
                            title="Edit Berita"
                          >
                            <FiEdit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="text-red-600 hover:text-red-900 transition-colors duration-150 disabled:opacity-50 p-1 rounded-md hover:bg-red-50"
                            title="Hapus Berita"
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

        {/* Modal Edit Berita */}
        <AnimatePresence>
          {editingNews && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                      Edit Berita
                    </h2>
                    <button
                      onClick={() => {
                        setEditingNews(null);
                        setImagePreview(null);
                      }}
                      className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <FiX size={24} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Judul
                      </label>
                      <input
                        type="text"
                        value={editingNews.title}
                        onChange={(e) =>
                          setEditingNews({
                            ...editingNews,
                            title: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kategori
                      </label>
                      <input
                        type="text"
                        value={editingNews.category}
                        onChange={(e) =>
                          setEditingNews({
                            ...editingNews,
                            category: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Penulis
                      </label>
                      <input
                        type="text"
                        value={editingNews.author}
                        onChange={(e) =>
                          setEditingNews({
                            ...editingNews,
                            author: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Konten
                      </label>
                      <textarea
                        rows={6}
                        value={editingNews.content || ""}
                        onChange={(e) =>
                          setEditingNews({
                            ...editingNews,
                            content: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gambar Berita
                      </label>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <FiImage className="w-8 h-8 mb-3 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">
                                Klik untuk upload
                              </span>{" "}
                              atau drag and drop
                            </p>
                            <p className="text-xs text-gray-500">
                              PNG, JPG, GIF (MAX. 5MB)
                            </p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {(imagePreview || editingNews.imageUrl) && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-500 mb-2">Preview:</p>
                          <img
                            src={imagePreview || editingNews.imageUrl}
                            alt="Preview"
                            className="h-48 w-full object-contain rounded-lg border"
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
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-150 flex items-center"
                    >
                      <FiX className="mr-2" />
                      Batal
                    </button>
                    <button
                      onClick={handleUpdateNews}
                      disabled={editLoading}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-colors duration-150 disabled:opacity-50 flex items-center"
                    >
                      {editLoading ? (
                        <>
                          <FiLoader className="animate-spin mr-2" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <FiSave className="mr-2" />
                          Simpan Perubahan
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal Komentar */}
        <AnimatePresence>
          {showCommentsModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
              >
                <div className="flex justify-between items-center px-6 py-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Komentar untuk: {selectedNews?.title}
                  </h3>
                  <button
                    onClick={closeCommentsModal}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <FiX size={24} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto flex-grow">
                  {commentsLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"
                      ></motion.div>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-8">
                      <FiMessageCircle className="w-16 h-16 mx-auto text-gray-300" />
                      <p className="mt-4 text-gray-500">Belum ada komentar</p>
                    </div>
                  ) : (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-4"
                    >
                      {comments.map((c) => (
                        <motion.div
                          key={c.id}
                          variants={itemVariants}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                        >
                          <div className="flex justify-between items-start">
                            <p className="font-medium text-gray-900">
                              {c.userName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {c.createdAt?.toDate
                                ? c.createdAt.toDate().toLocaleString("id-ID")
                                : "N/A"}
                            </p>
                          </div>
                          <p className="mt-2 text-gray-700">{c.content}</p>
                        </motion.div>
                      ))}
                    </motion.div>
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
