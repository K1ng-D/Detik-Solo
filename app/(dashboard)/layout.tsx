import { ReactNode } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { UserRole } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gray-100">
        <div className="flex">
          <AdminSidebar />
          <main className="flex-1 p-6 md:ml-0">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}