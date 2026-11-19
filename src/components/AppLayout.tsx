import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Compass,
  FolderKanban,
  LogOut,
  Menu,
  Plus,
  Settings,
  ShieldAlert,
  User,
  X,
} from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
import { getInitials } from '../utils/validation';

interface AppLayoutProps {
  children: React.ReactNode;
  rightRail?: React.ReactNode;
  pageTitle?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  rightRail,
  pageTitle,
}) => {
  const { profile, isAdmin, unreadNotificationsCount } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = [
    { to: '/feed', label: 'Feed Acadêmico', icon: Compass },
    { to: '/minhas-atividades', label: 'Minhas Atividades', icon: FolderKanban },
    {
      to: '/notificacoes',
      label: 'Notificações',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    { to: '/perfil', label: 'Meu Perfil', icon: User },
    { to: '/configuracoes', label: 'Configurações', icon: Settings },
  ];

  if (isAdmin) {
    navItems.push({ to: '/moderacao', label: 'Moderação', icon: ShieldAlert });
  }

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutUser();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const isActivePath = (path: string) => {
    if (path === '/perfil') {
      return location.pathname === '/perfil';
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const SidebarContent = (
    <div className="flex flex-col h-full justify-between p-4">
      <div className="space-y-6">
        <div className="px-2 pt-1 flex items-center justify-between">
          <Link
            to="/feed"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 text-[#E5EAE6] hover:text-[#52C878] transition-colors whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-5 h-5 text-[#52C878]" aria-hidden="true" />
            <span className="font-display text-lg font-bold tracking-tight">
              {APP_CONFIG.brandName}
            </span>
          </Link>
        </div>

        <Link
          to="/nova-pergunta"
          onClick={() => setMobileMenuOpen(false)}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Nova dúvida
        </Link>

        <nav aria-label="Navegação principal" className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#101311] text-[#52C878] border border-[#343B36]'
                    : 'text-[#B8C0BA] hover:text-[#E5EAE6] hover:bg-[#101311]/60'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${active ? 'text-[#52C878]' : 'text-[#B8C0BA]'}`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className="text-xs font-mono font-semibold text-[#52C878] tabular-nums"
                    aria-label={`${item.badge} não lidas`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-[#343B36] space-y-3">
        {profile && (
          <Link
            to="/perfil"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[#101311]/60 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-[#27864A]/25 border border-[#27864A]/50 flex items-center justify-center text-xs font-semibold text-[#52C878] shrink-0">
              {getInitials(profile.displayName)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#E5EAE6] truncate">
                {profile.displayName}
              </p>
              <p className="text-xs text-[#B8C0BA] truncate">
                {profile.campus}
              </p>
            </div>
          </Link>
        )}

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#B8C0BA] hover:text-[#E5EAE6] hover:bg-[#101311]/60 transition-colors cursor-pointer disabled:opacity-50"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{loggingOut ? 'Saindo...' : 'Sair da conta'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#101311] text-[#E5EAE6] flex flex-col lg:flex-row">
      {/* Cabeçalho compacto mobile (<= 15% da altura da tela) */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#1B211D] border-b border-[#343B36] px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            className="p-2 rounded-lg border border-[#343B36] text-[#E5EAE6] hover:bg-[#101311] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link
            to="/feed"
            className="font-display text-base font-bold text-[#E5EAE6] whitespace-nowrap truncate"
          >
            {pageTitle || APP_CONFIG.brandName}
          </Link>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/notificacoes"
            aria-label="Notificações"
            className="relative p-2 rounded-lg border border-[#343B36] text-[#B8C0BA] hover:text-[#E5EAE6]"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {unreadNotificationsCount > 0 && (
              <span className="sr-only">{unreadNotificationsCount} notificações não lidas</span>
            )}
          </Link>
          <Link
            to="/nova-pergunta"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-xs font-semibold text-[#E5EAE6] whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Perguntar
          </Link>
        </div>
      </header>

      {/* Drawer mobile */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/65"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-72 max-w-[85vw] bg-[#1B211D] border-r border-[#343B36] h-full overflow-y-auto">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Barra lateral fixa desktop */}
      <aside className="hidden lg:block w-64 shrink-0 bg-[#1B211D] border-r border-[#343B36] sticky top-0 h-screen overflow-y-auto">
        {SidebarContent}
      </aside>

      {/* Conteúdo central + painel complementar opcional */}
      <div className="flex-1 min-w-0 flex justify-center">
        <div className="w-full max-w-[1160px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col xl:flex-row gap-8 items-start">
          <main className="flex-1 min-w-0 w-full">{children}</main>
          {rightRail && (
            <aside className="w-full xl:w-80 shrink-0 space-y-5">{rightRail}</aside>
          )}
        </div>
      </div>
    </div>
  );
};
