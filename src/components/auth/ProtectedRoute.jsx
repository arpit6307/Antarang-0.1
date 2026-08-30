import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';

export const ProtectedRoute = () => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div
        className="min-h-screen w-full bg-midnight flex flex-col items-center justify-center p-6 text-cream select-none"
        role="status"
        aria-live="polite"
        aria-label="Loading authentication"
      >
        <div className="relative flex items-center justify-center">
          {/* Outer glowing aura */}
          <motion.div
            className="w-16 h-16 rounded-full border border-gold/25"
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Rotating gold spinner */}
          <motion.div
            className="absolute w-12 h-12 rounded-full border-2 border-transparent border-t-gold border-r-gold-light"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />

          {/* Center quill/book icon */}
          <svg
            className="absolute w-5 h-5 text-gold"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 font-serif text-gold-light text-sm tracking-widest uppercase"
        >
          Antarang
        </motion.p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
