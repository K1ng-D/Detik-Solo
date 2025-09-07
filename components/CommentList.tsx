'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Comment {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  content: string;
  createdAt: any;
  
}

interface CommentListProps {
  newsId: string;
}

export default function CommentList({ newsId }: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const commentsRef = collection(db, 'news', newsId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData: Comment[] = [];
      snapshot.forEach((doc) => {
        commentsData.push({ id: doc.id, ...doc.data() } as Comment);
      });
      setComments(commentsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [newsId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="space-y-1">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center border border-gray-100">
        <p className="text-gray-500">Belum ada komentar. Jadilah yang pertama berkomentar!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-[#1d2d68] rounded-full flex items-center justify-center text-[#facd8c] text-sm font-bold">
              {comment.userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900">{comment.userName}</p>
              <p className="text-xs text-gray-500">
                {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString('id-ID') : 'Tanggal tidak tersedia'}
              </p>
            </div>
          </div>
          <p className="text-gray-700">{comment.content}</p>
        </div>
      ))}
    </div>
  );
}