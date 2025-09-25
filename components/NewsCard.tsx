"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { FiCalendar, FiUser, FiArrowRight, FiClock, FiEye } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

interface NewsCardProps {
  id: string;
  title: string;
  excerpt: string;
  imageUrl?: string | null;
  category: string;
  date: string;
  author: string;
  variant?: 'grid' | 'list';
  views?: number;
}

export default function NewsCard({
  id,
  title,
  excerpt,
  imageUrl,
  category,
  date,
  author,
  variant = 'grid',
  views = 0
}: NewsCardProps) {
  const src =
    imageUrl && /^https?:\/\//.test(imageUrl) ? imageUrl : "/placeholder-news.jpg";

  const router = useRouter();
  const [user] = useAuthState(auth);

  // Format tanggal ke "x jam lalu" atau full date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 24) {
      return `${diffInHours} jam yang lalu`;
    } else {
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  };

  const handleClick = () => {
    if (!user) {
      router.push("/login");
    } else {
      router.push(`/news/${id}`);
    }
  };

  // Tampilan List Variant
  if (variant === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -3 }}
        transition={{ duration: 0.3 }}
        className="group bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-300 flex flex-col md:flex-row"
      >
        <div className="relative md:w-48 md:h-full h-40 flex-shrink-0">
          <Image
            src={src}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 40vw, 25vw"
          />
          <div className="absolute top-3 left-3">
            <span className="bg-[#1d2d68] text-white px-2 py-1 text-xs font-medium rounded">
              {category}
            </span>
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-[#1d2d68] transition-colors duration-300">
            {title}
          </h3>

          <p className="text-gray-600 text-sm mb-3 line-clamp-2 md:line-clamp-3 flex-1">
            {excerpt}
          </p>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100 mt-auto">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <FiUser className="mr-1" size={12} />
                <span className="truncate max-w-[100px] md:max-w-[120px]">{author}</span>
              </div>

              <div className="flex items-center">
                <FiCalendar className="mr-1" size={12} />
                <span>{formatDate(date)}</span>
              </div>

           
            </div>
          </div>

          <button
            onClick={handleClick}
            className="mt-4 w-full md:w-auto inline-flex items-center justify-center bg-[#1d2d68] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#1d2d68]/90 transition-all duration-300 self-start"
          >
            Baca Selengkapnya
            <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={14} />
          </button>
        </div>
      </motion.div>
    );
  }

  // Tampilan Grid Variant (default) - Gaya SoloPos
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3 }}
      className="group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300"
    >
      <div className="relative h-40 w-full overflow-hidden">
        <Image
          src={src}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        <div className="absolute top-3 left-3">
          <span className="bg-[#1d2d68] text-white px-2 py-1 text-xs font-medium rounded">
            {category}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-base mb-2 line-clamp-2 group-hover:text-[#1d2d68] transition-colors duration-300 min-h-[48px]">
          {title}
        </h3>

        <p className="text-gray-600 text-sm mb-3 line-clamp-3 min-h-[60px]">
          {excerpt}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
          <div className="flex items-center">
            <FiUser className="mr-1" size={12} />
            <span className="truncate max-w-[80px]">{author}</span>
          </div>

          <div className="flex items-center">
            <FiCalendar className="mr-1" size={12} />
            <span>{formatDate(date)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
        
          
          <button
            onClick={handleClick}
            className="inline-flex items-center text-[#1d2d68] text-sm font-medium hover:text-[#1d2d68]/80 transition-colors"
          >
            Baca
            <FiArrowRight className="ml-1 group-hover:translate-x-1 transition-transform duration-300" size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}