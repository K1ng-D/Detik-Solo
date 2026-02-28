"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUsers,
  FiSearch,
  FiRefreshCw,
  FiArrowLeft,
  FiStar,
  FiHash,
  FiInfo,
  FiTrendingUp,
  FiLock,
} from "react-icons/fi";

type UserRole = "user" | "admin";

type UserInterests = {
  categoryIds: string[];
  categoryNames: string[];
  keywords: string[];
};

type UserRow = {
  uid: string;
  email?: string;
  displayName?: string;
  role?: UserRole;
  onboardingCompleted?: boolean;
  interests?: UserInterests;
  createdAt?: any;
};

type NewsRow = {
  id: string;
  title: string;
  content?: string;
  excerpt?: string;
  imageUrl?: string;

  category?: string; // lama
  categoryId?: string; // baru
  categoryName?: string; // baru

  author?: string;
  createdAt?: any;
};

type RecRow = {
  news: NewsRow;
  cosine: number;
  matched: string[];
  debug?: {
    termsUsed: number;
  };
};

function safeToDate(x: any): Date | null {
  try {
    if (!x) return null;
    if (x.toDate) return x.toDate();
    if (x.seconds) return new Date(x.seconds * 1000);
    return null;
  } catch {
    return null;
  }
}

function formatIDDate(x: any) {
  const d = safeToDate(x);
  if (!d) return "-";
  return d.toLocaleDateString("id-ID");
}

/** ====== NLP ringan (tanpa library) ====== **/
const STOPWORDS = new Set([
  "yang",
  "dan",
  "di",
  "ke",
  "dari",
  "untuk",
  "pada",
  "ini",
  "itu",
  "atau",
  "dengan",
  "karena",
  "sebagai",
  "dalam",
  "oleh",
  "akan",
  "juga",
  "agar",
  "saat",
  "lebih",
  "bisa",
  "tidak",
  "ya",
  "para",
  "kami",
  "kita",
  "anda",
  "mereka",
  "dapat",
  "telah",
  "sudah",
  "masih",
  "adalah",
  "tersebut",
]);

function normalizeText(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s:_-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string) {
  const t = normalizeText(s)
    .split(" ")
    .map((x) => x.trim())
    .filter(Boolean);

  // buang stopwords + token pendek banget
  return t.filter((x) => x.length >= 2 && !STOPWORDS.has(x));
}

function buildUserText(u: UserRow) {
  const interests = u.interests || {
    categoryIds: [],
    categoryNames: [],
    keywords: [],
  };
  const catIdTokens = (interests.categoryIds || []).map((id) => `catid:${id}`);
  const catNameTokens = (interests.categoryNames || []).map(
    (n) => `cat:${normalizeText(n)}`,
  );
  const kwTokens = (interests.keywords || []).map(
    (k) => `kw:${normalizeText(k)}`,
  );

  return [
    ...catIdTokens,
    ...catNameTokens,
    ...kwTokens,
    // fallback raw juga
    ...(interests.categoryNames || []),
    ...(interests.keywords || []),
  ].join(" ");
}

function buildNewsText(n: NewsRow) {
  const catLabel = n.categoryName ?? n.category ?? "Tanpa Kategori";
  const catId = n.categoryId ? `catid:${n.categoryId}` : "";
  const catName = `cat:${normalizeText(catLabel)}`;

  return [
    n.title || "",
    n.excerpt || "",
    n.content || "",
    catId,
    catName,
    catLabel,
    n.author || "",
  ].join(" ");
}

function dot(a: Map<number, number>, b: Map<number, number>) {
  let s = 0;
  // iterasi map yang lebih kecil
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const [k, v] of small.entries()) {
    const bv = big.get(k);
    if (bv) s += v * bv;
  }
  return s;
}

function norm(a: Map<number, number>) {
  let s = 0;
  for (const v of a.values()) s += v * v;
  return Math.sqrt(s);
}

function cosineSimilarity(a: Map<number, number>, b: Map<number, number>) {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

/** buat TF-IDF vector */
function tfidfVector(
  tokens: string[],
  vocab: Map<string, number>,
  idf: number[],
) {
  const tf = new Map<number, number>();
  if (tokens.length === 0) return tf;

  const counts = new Map<number, number>();
  for (const tok of tokens) {
    const idx = vocab.get(tok);
    if (idx === undefined) continue;
    counts.set(idx, (counts.get(idx) || 0) + 1);
  }

  for (const [idx, c] of counts.entries()) {
    const tfVal = c / tokens.length;
    const w = tfVal * (idf[idx] || 0);
    if (w !== 0) tf.set(idx, w);
  }
  return tf;
}

function buildTfidfModel(userTokens: string[], docsTokens: string[][]) {
  // vocab
  const vocab = new Map<string, number>();
  const allDocs = [userTokens, ...docsTokens];

  for (const toks of allDocs) {
    for (const tok of toks) {
      if (!vocab.has(tok)) vocab.set(tok, vocab.size);
    }
  }

  // DF
  const df = new Array(vocab.size).fill(0);
  for (const toks of allDocs) {
    const seen = new Set<number>();
    for (const tok of toks) {
      const idx = vocab.get(tok)!;
      if (!seen.has(idx)) {
        seen.add(idx);
        df[idx] += 1;
      }
    }
  }

  // IDF
  const N = allDocs.length;
  const idf = df.map((d) => Math.log((N + 1) / (d + 1)) + 1);

  return { vocab, df, idf };
}

function getMatchedTerms(
  userTokens: string[],
  newsTokens: string[],
  take = 10,
) {
  const userSet = new Set(userTokens);
  const overlap: string[] = [];
  for (const t of newsTokens) {
    if (userSet.has(t)) overlap.push(t);
    if (overlap.length >= take) break;
  }
  // unique keep order
  return Array.from(new Set(overlap)).slice(0, take);
}

export default function AdminRekomendasiPage() {
  const [meRole, setMeRole] = useState<UserRole | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [news, setNews] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedUid, setSelectedUid] = useState<string>("");
  const [searchUser, setSearchUser] = useState("");
  const [topN, setTopN] = useState(10);
  const [candidateN, setCandidateN] = useState(50);

  const [recs, setRecs] = useState<RecRow[]>([]);
  const [modelInfo, setModelInfo] = useState<{
    vocabSize: number;
    docCount: number;
    sampleTerms: { term: string; df: number; idf: number }[];
  } | null>(null);

  // ✅ cek role admin
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setMeRole(null);
        setAuthReady(true);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const role = (snap.data()?.role || "user") as UserRole;
        setMeRole(role);
      } catch {
        setMeRole("user");
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // ✅ load users + news
  const loadAll = async () => {
    setLoading(true);
    try {
      // users
      const usersSnap = await getDocs(collection(db, "users"));
      const urows: UserRow[] = [];
      usersSnap.forEach((d) => {
        const data: any = d.data();
        urows.push({
          uid: d.id,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          onboardingCompleted: data.onboardingCompleted,
          interests: data.interests,
          createdAt: data.createdAt,
        });
      });

      // news candidates (baru)
      const newsQ = query(
        collection(db, "news"),
        orderBy("createdAt", "desc"),
        limit(200),
      );
      const newsSnap = await getDocs(newsQ);
      const nrows: NewsRow[] = [];
      newsSnap.forEach((d) => {
        const data: any = d.data();
        nrows.push({
          id: d.id,
          title: data.title,
          content: data.content,
          excerpt: data.excerpt,
          imageUrl: data.imageUrl,
          category: data.category,
          categoryId: data.categoryId,
          categoryName: data.categoryName,
          author: data.author,
          createdAt: data.createdAt,
        });
      });

      // sort: user lebih rapi
      urows.sort((a, b) =>
        (a.displayName || a.email || "").localeCompare(
          b.displayName || b.email || "",
        ),
      );

      setUsers(urows);
      setNews(nrows);

      // default pilih user pertama yang onboarding & bukan admin
      const first = urows.find(
        (x) => x.role !== "admin" && x.onboardingCompleted,
      );
      setSelectedUid((prev) => prev || first?.uid || "");
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authReady) return;
    if (meRole !== "admin") return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, meRole]);

  const filteredUsers = useMemo(() => {
    const q = searchUser.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const s =
        `${u.displayName || ""} ${u.email || ""} ${u.uid}`.toLowerCase();
      return s.includes(q);
    });
  }, [users, searchUser]);

  const selectedUser = useMemo(
    () => users.find((u) => u.uid === selectedUid) || null,
    [users, selectedUid],
  );

  const computeRecs = async () => {
    if (!selectedUser) return;

    const interests = selectedUser.interests || {
      categoryIds: [],
      categoryNames: [],
      keywords: [],
    };
    const hasAny =
      (interests.categoryIds?.length || 0) +
        (interests.categoryNames?.length || 0) +
        (interests.keywords?.length || 0) >
      0;

    // kandidat berita: ambil N terbaru
    const candidates = news.slice(0, Math.max(1, candidateN));

    const userText = hasAny ? buildUserText(selectedUser) : "";
    const userTokens = tokenize(userText);

    const docsTokens = candidates.map((n) => tokenize(buildNewsText(n)));

    const { vocab, df, idf } = buildTfidfModel(userTokens, docsTokens);

    // info model (biar admin lihat "cosine dll")
    const sampleTerms = Array.from(vocab.keys())
      .slice(0, 12)
      .map((term) => {
        const idx = vocab.get(term)!;
        return { term, df: df[idx], idf: Number(idf[idx].toFixed(4)) };
      });

    setModelInfo({
      vocabSize: vocab.size,
      docCount: docsTokens.length + 1,
      sampleTerms,
    });

    // vector user
    const vUser = tfidfVector(userTokens, vocab, idf);

    // rekomendasi
    const rows: RecRow[] = candidates.map((n, i) => {
      const vNews = tfidfVector(docsTokens[i], vocab, idf);
      const cos = cosineSimilarity(vUser, vNews);

      const matched = getMatchedTerms(userTokens, docsTokens[i], 10);

      return {
        news: n,
        cosine: cos,
        matched,
        debug: { termsUsed: docsTokens[i].length },
      };
    });

    rows.sort((a, b) => b.cosine - a.cosine);

    // ambil top N
    setRecs(rows.slice(0, Math.max(1, topN)));
  };

  useEffect(() => {
    if (!selectedUser) return;
    if (loading) return;
    computeRecs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUid, topN, candidateN, loading]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Memuat...</div>
      </div>
    );
  }

  if (meRole !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[#1d2d68] font-semibold">
            <FiLock /> Akses Ditolak
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Halaman ini hanya untuk admin.
          </p>
          <Link
            href="/"
            className="inline-flex items-center mt-4 text-sm text-[#1d2d68] hover:underline"
          >
            <FiArrowLeft className="mr-2" /> Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm text-gray-500">
                <Link href="/admin" className="hover:text-[#1d2d68]">
                  Admin
                </Link>{" "}
                <span className="mx-2">/</span>
                <span className="text-gray-700">Rekomendasi</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
                Dashboard Rekomendasi (Content-Based + Cosine)
              </h1>
              <p className="text-gray-600 mt-1">
                Lihat profil minat user, TF-IDF, dan skor cosine rekomendasi
                berita.
              </p>
            </div>

            <button
              onClick={loadAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1d2d68] text-white hover:bg-[#1d2d68]/90 transition"
            >
              <FiRefreshCw /> Refresh Data
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Users */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl border shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <FiUsers /> Daftar User
                </div>
                <div className="text-xs text-gray-500">
                  {users.length} total
                </div>
              </div>

              <div className="relative mb-3">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Cari nama/email/uid..."
                  className="w-full pl-10 pr-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#1d2d68] focus:border-[#1d2d68]"
                />
              </div>

              <div className="max-h-[520px] overflow-auto pr-1 space-y-2">
                {loading ? (
                  <div className="text-sm text-gray-600">Memuat user...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-sm text-gray-600">Tidak ada user.</div>
                ) : (
                  filteredUsers.map((u) => {
                    const active = u.uid === selectedUid;
                    const name = u.displayName || u.email || u.uid;
                    const done = !!u.onboardingCompleted;
                    return (
                      <button
                        key={u.uid}
                        onClick={() => setSelectedUid(u.uid)}
                        className={`w-full text-left p-3 rounded-xl border transition ${
                          active
                            ? "border-[#1d2d68] bg-[#1d2d68]/5"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">
                              {name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {u.email || u.uid}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {u.role === "admin" && (
                              <span className="text-[10px] px-2 py-1 rounded-full bg-black/5 text-gray-700">
                                admin
                              </span>
                            )}
                            <span
                              className={`text-[10px] px-2 py-1 rounded-full ${
                                done
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {done ? "onboarded" : "belum"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right: Detail + Recommendations */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl border shadow-sm p-5">
              {!selectedUser ? (
                <div className="text-sm text-gray-600">
                  Pilih user untuk melihat rekomendasi.
                </div>
              ) : (
                <>
                  {/* User header */}
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
                        <FiInfo /> Profil User
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="font-medium text-gray-800">
                          {selectedUser.displayName ||
                            selectedUser.email ||
                            selectedUser.uid}
                        </span>{" "}
                        <span className="text-gray-400">•</span>{" "}
                        <span className="text-gray-600">
                          {selectedUser.email || "-"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        UID: {selectedUser.uid} • Created:{" "}
                        {formatIDDate(selectedUser.createdAt)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 border rounded-xl px-3 py-2">
                        <span className="text-xs text-gray-500">Candidate</span>
                        <select
                          value={candidateN}
                          onChange={(e) =>
                            setCandidateN(Number(e.target.value))
                          }
                          className="text-sm outline-none"
                        >
                          {[20, 50, 100, 150, 200].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 border rounded-xl px-3 py-2">
                        <span className="text-xs text-gray-500">Top</span>
                        <select
                          value={topN}
                          onChange={(e) => setTopN(Number(e.target.value))}
                          className="text-sm outline-none"
                        >
                          {[5, 10, 15, 20].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={computeRecs}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition"
                      >
                        <FiRefreshCw /> Hitung Ulang
                      </button>
                    </div>
                  </div>

                  {/* Interests */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="border rounded-2xl p-4">
                      <div className="text-xs text-gray-500 mb-2">
                        Kategori (ID)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(selectedUser.interests?.categoryIds || []).length ===
                        0 ? (
                          <span className="text-sm text-gray-500">-</span>
                        ) : (
                          selectedUser.interests!.categoryIds.map((x) => (
                            <span
                              key={x}
                              className="text-xs px-2 py-1 rounded-full bg-[#1d2d68]/10 text-[#1d2d68]"
                            >
                              {x}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="border rounded-2xl p-4">
                      <div className="text-xs text-gray-500 mb-2">
                        Kategori (Nama)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(selectedUser.interests?.categoryNames || [])
                          .length === 0 ? (
                          <span className="text-sm text-gray-500">-</span>
                        ) : (
                          selectedUser.interests!.categoryNames.map((x) => (
                            <span
                              key={x}
                              className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700"
                            >
                              {x}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="border rounded-2xl p-4">
                      <div className="text-xs text-gray-500 mb-2">Keywords</div>
                      <div className="flex flex-wrap gap-2">
                        {(selectedUser.interests?.keywords || []).length ===
                        0 ? (
                          <span className="text-sm text-gray-500">-</span>
                        ) : (
                          selectedUser.interests!.keywords.map((x) => (
                            <span
                              key={x}
                              className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700"
                            >
                              {x}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Model info */}
                  <div className="mt-4 border rounded-2xl p-4">
                    <div className="flex items-center gap-2 font-semibold text-gray-900">
                      <FiHash /> Model TF-IDF (Ringkasan)
                    </div>
                    {!modelInfo ? (
                      <div className="text-sm text-gray-600 mt-2">
                        Klik <b>Hitung Ulang</b> untuk melihat detail model.
                      </div>
                    ) : (
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-gray-50 rounded-xl p-3">
                          <div className="text-xs text-gray-500">
                            Vocab Size
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            {modelInfo.vocabSize}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <div className="text-xs text-gray-500">
                            Doc Count (User + News)
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            {modelInfo.docCount}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <div className="text-xs text-gray-500">
                            Sample DF/IDF
                          </div>
                          <div className="text-xs text-gray-700 mt-1 space-y-1">
                            {modelInfo.sampleTerms.map((t) => (
                              <div
                                key={t.term}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="truncate">{t.term}</span>
                                <span className="text-gray-500">
                                  df:{t.df} idf:{t.idf}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recommendations */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 font-bold text-gray-900">
                        <FiStar /> Top Rekomendasi
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <FiTrendingUp />
                        Candidate: {candidateN} berita terbaru • Top: {topN}
                      </div>
                    </div>

                    <div className="mt-3 overflow-auto border rounded-2xl">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr className="text-left">
                            <th className="p-3 font-semibold text-gray-700">
                              Rank
                            </th>
                            <th className="p-3 font-semibold text-gray-700">
                              Berita
                            </th>
                            <th className="p-3 font-semibold text-gray-700">
                              Kategori
                            </th>
                            <th className="p-3 font-semibold text-gray-700">
                              Cosine
                            </th>
                            <th className="p-3 font-semibold text-gray-700">
                              Matched Terms
                            </th>
                            <th className="p-3 font-semibold text-gray-700">
                              Tanggal
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          <AnimatePresence>
                            {recs.map((r, idx) => {
                              const cat =
                                r.news.categoryName ??
                                r.news.category ??
                                "Tanpa Kategori";
                              return (
                                <motion.tr
                                  key={r.news.id}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0 }}
                                  className="border-t"
                                >
                                  <td className="p-3 text-gray-600">
                                    {idx + 1}
                                  </td>
                                  <td className="p-3">
                                    <Link
                                      href={`/news/${r.news.id}`}
                                      className="font-semibold text-gray-900 hover:text-[#1d2d68]"
                                    >
                                      {r.news.title}
                                    </Link>
                                    <div className="text-xs text-gray-500">
                                      {r.news.author || "-"}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <span className="text-xs px-2 py-1 rounded-full bg-[#1d2d68]/10 text-[#1d2d68]">
                                      {cat}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <div className="font-bold text-gray-900">
                                      {r.cosine.toFixed(4)}
                                    </div>
                                    <div className="text-[11px] text-gray-500">
                                      terms:{r.debug?.termsUsed ?? "-"}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    {r.matched.length === 0 ? (
                                      <span className="text-xs text-gray-500">
                                        -
                                      </span>
                                    ) : (
                                      <div className="flex flex-wrap gap-2">
                                        {r.matched.slice(0, 8).map((m) => (
                                          <span
                                            key={m}
                                            className="text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                                          >
                                            {m}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 text-gray-600">
                                    {formatIDDate(r.news.createdAt)}
                                  </td>
                                </motion.tr>
                              );
                            })}
                          </AnimatePresence>

                          {!loading && recs.length === 0 && (
                            <tr>
                              <td className="p-4 text-gray-600" colSpan={6}>
                                Tidak ada rekomendasi (user belum isi preferensi
                                atau kandidat berita terlalu sedikit).
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="text-xs text-gray-500 mt-3">
                      Catatan: Perhitungan dilakukan di client (admin) memakai
                      TF-IDF + Cosine Similarity untuk Content-Based Filtering.
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Tips: kalau ingin lebih “ilmiah” untuk skripsi, kita bisa
              pindahkan perhitungan ke server (API route) dan simpan hasilnya
              (cache) ke Firestore.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
