"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { slugify } from "@/lib/slug";

type Category = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const q = query(collection(db, "categories"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Category[];
      setCategories(list);
    });
    return () => unsub();
  }, []);

  const nameExists = useMemo(() => {
    const n = name.trim().toLowerCase();
    return categories.some((c) => c.name.toLowerCase() === n);
  }, [name, categories]);

  const addCategory = async () => {
    setErr("");
    const n = name.trim();
    if (!n) return setErr("Nama kategori wajib diisi");
    if (nameExists) return setErr("Kategori sudah ada");

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User belum login");

      await addDoc(collection(db, "categories"), {
        name: n,
        slug: slugify(n),
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
      });

      setName("");
    } catch (e: any) {
      setErr(e.message || "Gagal menambah kategori");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setErr("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setErr("");
  };

  const saveEdit = async () => {
    setErr("");
    if (!editingId) return;

    const n = editingName.trim();
    if (!n) return setErr("Nama kategori wajib diisi");

    // cegah duplikat saat edit (kecuali dirinya sendiri)
    const exists = categories.some(
      (c) => c.id !== editingId && c.name.toLowerCase() === n.toLowerCase(),
    );
    if (exists) return setErr("Nama kategori sudah dipakai");

    setLoading(true);
    try {
      await updateDoc(doc(db, "categories", editingId), {
        name: n,
        slug: slugify(n),
        updatedAt: serverTimestamp(),
      });
      cancelEdit();
    } catch (e: any) {
      setErr(e.message || "Gagal menyimpan perubahan");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (cat: Category) => {
    setErr("");
    setLoading(true);
    try {
      await updateDoc(doc(db, "categories", cat.id), {
        isActive: !cat.isActive,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      setErr(e.message || "Gagal mengubah status kategori");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Kategori</h1>
          <p className="text-gray-600 text-sm">
            Kategori di sini otomatis muncul di form Buat Berita.
          </p>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {err}
        </div>
      )}

      {/* Tambah kategori */}
      <div className="bg-white border rounded-xl p-4 mb-6">
        <div className="font-semibold mb-2">Tambah Kategori</div>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Misal: Kriminal"
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d2d68]"
          />
          <button
            onClick={addCategory}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-[#1d2d68] text-white disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Tambah"}
          </button>
        </div>
        {nameExists && (
          <div className="text-xs text-red-600 mt-2">
            Kategori dengan nama itu sudah ada.
          </div>
        )}
      </div>

      {/* List kategori */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold">Daftar Kategori</div>

        <div className="divide-y">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                {editingId === cat.id ? (
                  <div className="flex gap-2">
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d2d68]"
                    />
                    <button
                      onClick={saveEdit}
                      disabled={loading}
                      className="px-3 py-2 rounded-lg bg-[#1d2d68] text-white disabled:opacity-50"
                    >
                      Simpan
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-2 rounded-lg border"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="font-medium text-gray-900 truncate">
                      {cat.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      slug: {cat.slug} • status:{" "}
                      <span
                        className={
                          cat.isActive ? "text-green-600" : "text-gray-500"
                        }
                      >
                        {cat.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {editingId !== cat.id && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(cat)}
                    className="px-3 py-2 rounded-lg border text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(cat)}
                    disabled={loading}
                    className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
                  >
                    {cat.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </div>
              )}
            </div>
          ))}

          {categories.length === 0 && (
            <div className="px-4 py-6 text-gray-500 text-sm">
              Belum ada kategori.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
