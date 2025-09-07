import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { newsId, userId, userEmail, userName, content } = await request.json();

    if (!newsId || !userId || !content) {
      return NextResponse.json(
        { error: 'News ID, User ID, and content are required' },
        { status: 400 }
      );
    }

    const commentsRef = collection(db, 'news', newsId, 'comments');
    const docRef = await addDoc(commentsRef, {
      userId,
      userEmail: userEmail || '',
      userName: userName || 'Anonymous',
      content,
      createdAt: serverTimestamp()
    });

    return NextResponse.json({ 
      id: docRef.id,
      message: 'Comment added successfully' 
    });
  } catch (error: any) {
    console.error('Comment error:', error);
    return NextResponse.json(
      { error: error.message || 'Comment operation failed' },
      { status: 400 }
    );
  }
}