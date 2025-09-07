import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.NEWS_API_KEY; // HARUS sama dengan di .env.local
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key tidak ditemukan" },
        { status: 500 }
      );
    }

    // Request utama: top-headlines (US biar pasti ada)
    let url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=6&apiKey=${apiKey}`;
    let res = await fetch(url);
    let data = await res.json();

    console.log("🔎 Response top-headlines:", data);

    // Fallback kalau kosong
    if (!data.articles || data.articles.length === 0) {
      console.log("⚠️ Kosong, coba pakai everything...");
      url = `https://newsapi.org/v2/everything?q=indonesia&pageSize=6&sortBy=publishedAt&apiKey=${apiKey}`;
      res = await fetch(url);
      data = await res.json();

      console.log("🔎 Response everything:", data);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Error fetch berita eksternal:", error);
    return NextResponse.json(
      { error: "Gagal fetch berita eksternal" },
      { status: 500 }
    );
  }
}
