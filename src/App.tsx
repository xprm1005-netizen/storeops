import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/auth.service';
import { supabase } from '@/services/supabase';
import { Role } from '@/types';

import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { CrewHomePage } from '@/pages/crew/CrewHomePage';
import { ChecklistPage } from '@/pages/crew/ChecklistPage';
import { IssueNewPage } from '@/pages/crew/IssueNewPage';
import { DashboardPage } from '@/pages/manager/DashboardPage';
import { ReportsPage } from '@/pages/manager/ReportsPage';
import { StaffPage } from '@/pages/manager/StaffPage';

function Protected({ children, allow }: { children: JSX.Element; allow: Role }) {
  const { user, loading } = useAuthStore();
  const location = useLocation();
  if (loading) return <div className="p-10 text-center text-gray-400">불러오는 중...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== allow) {
    return <Navigate to={user.role === 'crew' ? '/crew/home' : '/manager/dashboard'} replace />;
  }
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuthStore();
  if (loading) return <div className="p-10 text-center text-gray-400">불러오는 중...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'crew' ? '/crew/home' : '/manager/dashboard'} replace />;
}

export default function App() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setUser(null);
        return;
      }
      setLoading(true);
      try {
        const u = await authService.loadCurrentUser();
        setUser(u);
      } catch {
        setUser(null);
      }
    });

    return () => { sub.subscription.unsubscribe(); };
  }, [setUser, setLoading]);

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-[480px] mx-auto bg-gray-50 min-h-screen relative">
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route path="/crew/home" element={<Protected allow="crew"><CrewHomePage /></Protected>} />
          <Route path="/crew/tasks/:taskId" element={<Protected allow="crew"><ChecklistPage /></Protected>} />
          <Route path="/crew/issues/new" element={<Protected allow="crew"><IssueNewPage /></Protected>} />

          <Route path="/manager/dashboard" element={<Protected allow="manager"><DashboardPage /></Protected>} />
          <Route path="/manager/reports" element={<Protected allow="manager"><ReportsPage /></Protected>} />
          <Route path="/manager/staff" element={<Protected allow="manager"><StaffPage /></Protected>} />

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </div>
    </div>
  );
}
