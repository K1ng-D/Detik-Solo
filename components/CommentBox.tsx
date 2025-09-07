'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CommentBoxProps {
  newsId: string;
  onCommentAdded: () => void;
}

export default function CommentBox({ newsId, onCommentAdded }: CommentBoxProps) {
  const [user, setUser] = useState<User | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  onAuthStateChanged(auth, (user) => {
    setUser(user);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !comment.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const commentsRef = collection(db, 'news', newsId, 'comments');
      await addDoc(commentsRef, {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || 'Anonymous',
        content: comment.trim(),
        createdAt: serverTimestamp()
      });
      
      setComment('');
      onCommentAdded();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Gagal menambahkan komentar');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
        <p className="text-gray-600">Silakan login untuk meninggalkan komentar</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow border border-gray-100">
      <div className="mb-4">
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
          Tinggalkan Komentar
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1d2d68] focus:border-[#1d2d68]"
          placeholder="Tulis komentar Anda di sini..."
          required
        />
      </div>
      
      <button
        type="submit"
        disabled={isSubmitting || !comment.trim()}
        className="bg-[#1d2d68] text-white px-4 py-2 rounded-md hover:bg-[#1d2d68]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Mengirim...' : 'Kirim Komentar'}
      </button>
    </form>
  );
}