"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadImage } from "@/lib/cloudinary";
import MotionWrapper from "@/components/MotionWrapper";

type Category = { id: string; name: string };

export default function CreateNewsPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // ✅ ambil kategori aktif dari Firestore (sinkron dengan halaman kategori)
  useEffect(() => {
    const q = query(collection(db, "categories"), orderBy("name", "asc"));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((x) => x.isActive === true); // ✅ filter di client
      setCategories(list);
    });

    return () => unsub();
  }, []);

  const categoryName = useMemo(() => {
    return categories.find((c) => c.id === categoryId)?.name || "";
  }, [categoryId, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!title || !content || !categoryId) {
      setError("Semua field wajib diisi");
      setIsLoading(false);
      return;
    }

    try {
      let imageUrl = "";
      if (image) imageUrl = await uploadImage(image);

      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      await addDoc(collection(db, "news"), {
        title,
        content,

        // ✅ simpan dua-duanya biar enak buat query + tampilan + rekomendasi
        categoryId,
        categoryName,

        imageUrl,
        author: user.displayName || user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        views: 0,
      });

      router.push("/admin");
    } catch (err: any) {
      console.error("Error creating news:", err);
      setError(err.message || "Terjadi kesalahan saat membuat berita");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setImage(e.target.files[0]);
  };

  return (
    <MotionWrapper>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Buat Berita Baru
            </h1>
            <p className="text-sm text-gray-600">
              Kategori diambil dari Firestore. Tambah kategori di{" "}
              <b>/admin/categories</b>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/admin/categories")}
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            Kelola Kategori
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-md rounded-xl px-8 pt-6 pb-8 mb-4"
        >
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="title"
            >
              Judul Berita
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1d2d68]"
              placeholder="Masukkan judul berita"
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="category"
            >
              Kategori
            </label>

            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1d2d68]"
            >
              <option value="">Pilih Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {categories.length === 0 && (
              <p className="text-xs text-red-600 mt-2">
                Belum ada kategori aktif. Tambahkan kategori dulu di halaman
                Kelola Kategori.
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="content"
            >
              Konten Berita
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1d2d68]"
              placeholder="Tulis konten berita di sini..."
            />
          </div>

          <div className="mb-6">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="image"
            >
              Gambar Berita (Opsional)
            </label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
            />
            {image && (
              <p className="text-sm text-gray-600 mt-2">
                File terpilih: {image.name}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || categories.length === 0}
            className="bg-[#1d2d68] hover:bg-[#1d2d68]/90 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
          >
            {isLoading ? "Menyimpan..." : "Simpan Berita"}
          </button>
        </form>
      </div>
    </MotionWrapper>
  );
}
