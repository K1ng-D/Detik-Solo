import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { newsId, userId } = await request.json();

    if (!newsId || !userId) {
      return NextResponse.json(
        { error: 'News ID and User ID are required' },
        { status: 400 }
      );
    }

    const likeDocRef = doc(db, 'likes', `${newsId}_${userId}`);
    const likeDoc = await getDoc(likeDocRef);
    const newsDocRef = doc(db, 'news', newsId);

    if (likeDoc.exists()) {
      // Unlike
      await setDoc(likeDocRef, {});
      await updateDoc(newsDocRef, {
        likesCount: increment(-1)
      });
      return NextResponse.json({ liked: false });
    } else {
      // Like
      await setDoc(likeDocRef, {
        userId,
        newsId,
        likedAt: new Date()
      });
      await updateDoc(newsDocRef, {
        likesCount: increment(1)
      });
      return NextResponse.json({ liked: true });
    }
  } catch (error: any) {
    console.error('Like error:', error);
    return NextResponse.json(
      { error: error.message || 'Like operation failed' },
      { status: 400 }
    );
  }
}