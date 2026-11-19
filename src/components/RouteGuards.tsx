import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FullScreenLoader: React.FC = () => (
  <div className="min-h-screen bg-[#101311] flex items-center justify-center p-6">
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-8 h-8 border-2 border-[#343B36] border-t-[#52C878] rounded-full animate-spin"
        aria-hidden="true"
      />
      <p className="text-sm text-[#B8C0BA]">Carregando sessão acadêmica...</p>
    </div>
  </div>
);

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, authLoading, profileLoading } = useAuth();
  const location = useLocation();

  if (authLoading || profileLoading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!user.emailVerified) {
    return <Navigate to="/verificar-email" replace />;
  }

  if (!profile) {
    return <Navigate to="/completar-perfil" replace />;
  }

  return <>{children}</>;
};

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isAdmin, authLoading, profileLoading } = useAuth();

  if (authLoading || profileLoading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.emailVerified) {
    return <Navigate to="/verificar-email" replace />;
  }

  if (!profile) {
    return <Navigate to="/completar-perfil" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return <>{children}</>;
};

export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, authLoading, profileLoading } = useAuth();

  if (authLoading || profileLoading) {
    return <FullScreenLoader />;
  }

  if (user && !user.emailVerified) {
    return <Navigate to="/verificar-email" replace />;
  }

  if (user && user.emailVerified && !profile) {
    return <Navigate to="/completar-perfil" replace />;
  }

  if (user && user.emailVerified && profile) {
    return <Navigate to="/feed" replace />;
  }

  return <>{children}</>;
};
