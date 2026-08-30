import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SignupPage = lazy(() => import('@/pages/SignupPage'));
const AppShell = lazy(() => import('@/components/layout/AppShell'));
const HomePage = lazy(() => import('@/pages/HomePage'));
const FeedPage = lazy(() => import('@/pages/FeedPage'));
const MessagesPage = lazy(() => import('@/pages/MessagesPage'));
const DiaryPage = lazy(() => import('@/pages/DiaryPage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

function SplashFallback() {
  return (
    <div className="min-h-screen bg-midnight flex flex-col items-center justify-center gap-6">
      <img src="/favicon.svg" alt="Antarang" className="w-16 h-16" />
      <h1 className="font-serif text-2xl text-gold tracking-wide">अंतरंग</h1>
      <LoadingSpinner size="md" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<SplashFallback />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected routes with AppShell layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          {/* DiaryPage is full-screen, no shell nav */}
          <Route path="/diary/:diaryId" element={<DiaryPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
