"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  FiHome,
  FiPlusSquare,
  FiFileText,
  FiUsers,
  FiMenu,
  FiX,
  FiLogOut,
  FiLayers,
  FiTrendingUp,
} from "react-icons/fi";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";

type MenuItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
};

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        name: "Dashboard",
        href: "/admin",
        icon: <FiHome className="w-5 h-5" />,
      },
      {
        name: "Kategori",
        href: "/admin/kategori",
        icon: <FiLayers className="w-5 h-5" />,
      },
      {
        name: "Buat Berita",
        href: "/admin/create-news",
        icon: <FiPlusSquare className="w-5 h-5" />,
      },
      {
        name: "Kelola Berita",
        href: "/admin/manage-news",
        icon: <FiFileText className="w-5 h-5" />,
      },
      {
        name: "Kelola User",
        href: "/admin/manage-users",
        icon: <FiUsers className="w-5 h-5" />,
      },
      {
        name: "Sistem Rekomendasi",
        href: "/admin/rekomendasi",
        icon: <FiTrendingUp className="w-5 h-5" />,
        badge: "NEW",
      },
    ],
    [],
  );

  const isActive = (href: string) => pathname === href;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/admin-login");
    } catch (error) {
      console.error("Error saat logout:", error);
    }
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="md:hidden fixed top-4 left-4 z-50 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl text-white p-2 shadow-lg shadow-black/20"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
      </button>

      {/* Overlay (mobile) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-30 md:hidden bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {(isOpen || true) && (
          <motion.aside
            className={`
              fixed inset-y-0 left-0 z-40 w-[280px]
              md:relative md:translate-x-0
              ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            `}
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <div className="h-full flex flex-col overflow-hidden rounded-r-3xl md:rounded-none">
              {/* Background Layer */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0b1437] via-[#111b4a] to-[#1d2d68]" />
              <div className="absolute inset-0 -z-10 opacity-40 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.14),transparent_45%),radial-gradient(circle_at_70%_70%,rgba(99,102,241,0.20),transparent_55%)]" />

              {/* Header */}
              <div className="px-5 pt-6 pb-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-lg shadow-black/20">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                      <FiTrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-bold text-lg leading-tight">
                        Faktra Admin
                      </div>
                      <div className="text-white/70 text-xs">
                        Manage News • Users • Reco
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex-1 px-3 pb-3 overflow-y-auto">
                <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-white/60">
                  Menu
                </div>

                <ul className="space-y-1">
                  {menuItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`
                            group relative flex items-center gap-3 px-4 py-3 rounded-2xl transition
                            ${active ? "text-white" : "text-white/80 hover:text-white"}
                          `}
                        >
                          {/* Active indicator bar */}
                          <span
                            className={`
                              absolute left-1 top-1/2 -translate-y-1/2 h-7 w-[3px] rounded-full
                              ${active ? "bg-white" : "bg-transparent group-hover:bg-white/40"}
                            `}
                          />

                          {/* Active background */}
                          <span
                            className={`
                              absolute inset-0 rounded-2xl -z-10 transition
                              ${active ? "bg-white/12 border border-white/12" : "bg-transparent group-hover:bg-white/8"}
                            `}
                          />

                          {/* Icon */}
                          <span
                            className={`
                              w-10 h-10 rounded-2xl flex items-center justify-center border transition
                              ${active ? "bg-white/12 border-white/12" : "bg-white/5 border-white/10 group-hover:bg-white/10"}
                            `}
                          >
                            {item.icon}
                          </span>

                          {/* Label */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {item.name}
                            </div>
                            {active && (
                              <div className="text-[11px] text-white/60">
                                Active
                              </div>
                            )}
                          </div>

                          {/* Badge */}
                          {item.badge && (
                            <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 border border-white/10 text-white/90">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                {/* Divider */}
                <div className="mt-4 px-3">
                  <div className="h-px bg-white/10" />
                </div>

                {/* Quick hints */}
                <div className="px-3 mt-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                    <div className="text-white font-semibold text-sm">
                      Tips Admin
                    </div>
                    <p className="text-white/70 text-xs mt-1 leading-relaxed">
                      Kelola kategori dulu agar input berita & rekomendasi makin
                      presisi.
                    </p>
                  </div>
                </div>
              </nav>

              {/* Logout */}
              <div className="p-4">
                <button
                  onClick={handleLogout}
                  className="w-full group flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
                    bg-white/10 border border-white/10 text-white hover:bg-white/15 transition
                    shadow-lg shadow-black/20"
                >
                  <FiLogOut className="w-5 h-5 group-hover:rotate-[-8deg] transition-transform" />
                  <span className="font-semibold">Logout</span>
                </button>

                <div className="text-center text-[11px] text-white/50 mt-3">
                  © {new Date().getFullYear()} Faktra
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
