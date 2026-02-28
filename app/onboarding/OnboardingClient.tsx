"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

type Category = { id: string; name: string; isActive?: boolean };

type UserInterests = {
  categoryIds: string[];
  categoryNames: string[];
  keywords: string[];
};

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // mode=edit => boleh edit walau sudah onboarding
  const isEditMode = searchParams.get("mode") === "edit";

  const [uid, setUid] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [keywordsInput, setKeywordsInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ✅ 1) Pastikan user login + ambil data user untuk prefill
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setUid(user.uid);

      const snap = await getDoc(doc(db, "users", user.uid));

      // kalau sudah onboarding dan bukan edit mode => langsung balik
      if (
        snap.exists() &&
        snap.data()?.onboardingCompleted === true &&
        !isEditMode
      ) {
        router.replace("/news");
        return;
      }

      // prefill saat edit mode (atau saat ada data lama)
      if (snap.exists()) {
        const data: any = snap.data();
        const interests: any = data.interests || {};

        const ids = Array.isArray(interests.categoryIds)
          ? interests.categoryIds
          : [];
        const keywords = Array.isArray(interests.keywords)
          ? interests.keywords
          : [];

        setSelectedIds(ids);
        setKeywordsInput(keywords.join(", "));
      }

      setLoading(false);
    });

    return () => unsub();
  }, [router, isEditMode]);

  // ✅ 2) Ambil kategori aktif
  useEffect(() => {
    const q = query(collection(db, "categories"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }) as Category)
        .filter((c) => c.isActive !== false);

      setCategories(list);
    });

    return () => unsub();
  }, []);

  const selectedNames = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return selectedIds.map((id) => map.get(id)).filter(Boolean) as string[];
  }, [categories, selectedIds]);

  const toggleCategory = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const parseKeywords = (input: string) =>
    input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 15);

  const handleSave = async () => {
    setError("");

    // ✅ Kalau mode wajib: minimal 3 kategori (ubah kalau mau)
    // ✅ Kalau edit: tetap dipaksa minimal 1/3 agar rekomendasi tetap jalan
    const minPick = 3;

    if (selectedIds.length < minPick) {
      setError(
        `Pilih minimal ${minPick} kategori agar rekomendasi lebih akurat.`,
      );
      return;
    }

    if (!uid) {
      setError("User tidak valid. Silakan login ulang.");
      return;
    }

    setSaving(true);
    try {
      const keywords = parseKeywords(keywordsInput);

      const payload = {
        onboardingCompleted: true,
        interests: {
          categoryIds: selectedIds,
          categoryNames: selectedNames,
          keywords,
        } as UserInterests,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "users", uid), payload);

      router.replace("/news");
    } catch (e: any) {
      setError(e.message || "Gagal menyimpan preferensi.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode
              ? "Ubah Preferensi Rekomendasi"
              : "Lengkapi Preferensi Berita"}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditMode
              ? "Perbarui minatmu kapan saja. Rekomendasi akan menyesuaikan."
              : "Ini wajib diisi agar sistem rekomendasi berita dapat bekerja sesuai minatmu."}
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                Pilih Kategori Favorit
              </h2>
              <div className="text-sm text-gray-500">
                Dipilih:{" "}
                <span className="font-medium">{selectedIds.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {categories.map((cat) => {
                const active = selectedIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={[
                      "px-3 py-2 rounded-xl border text-sm text-left transition",
                      active
                        ? "bg-[#1d2d68] text-white border-[#1d2d68]"
                        : "bg-white hover:bg-gray-50 text-gray-800",
                    ].join(" ")}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Minimal pilih <b>3</b> kategori.
            </p>
          </div>

          <div className="mt-6">
            <h2 className="font-semibold text-gray-900">
              Kata Kunci Minat (Opsional)
            </h2>
            <p className="text-sm text-gray-600 mt-1">Pisahkan dengan koma.</p>
            <input
              value={keywordsInput}
              onChange={(e) => setKeywordsInput(e.target.value)}
              placeholder="Contoh: beasiswa, UMKM, AI"
              className="mt-3 w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d2d68]"
            />
          </div>

          <div className="mt-8 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => router.replace("/news")}
              className="px-5 py-2 rounded-xl border bg-white hover:bg-gray-50"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#1d2d68] text-white hover:bg-[#1d2d68]/90 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
