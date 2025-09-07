import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { verifyRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { uid, requiredRole } = await request.json();

    if (!uid || !requiredRole) {
      return NextResponse.json(
        { error: 'UID and required role are required' },
        { status: 400 }
      );
    }

    const hasRole = await verifyRole(uid, requiredRole);
    return NextResponse.json({ hasRole });
  } catch (error: any) {
    console.error('Role verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Role verification failed' },
      { status: 400 }
    );
  }
}