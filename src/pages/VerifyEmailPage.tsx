import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle2, LogOut, MailCheck, RefreshCw } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { useAuth } from '../context/AuthContext';
import { logoutUser, resendVerificationEmail } from '../services/authService';
import { translateAuthError } from '../services/firebase';

export const VerifyEmailPage: React.FC = () => {
  const { user, profile, authLoading, reloadVerificationStatus } = useAuth();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (authLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.emailVerified) {
    return <Navigate to={profile ? '/feed' : '/completar-perfil'} replace />;
  }

  const handleCheckVerification = async () => {
    if (checking) return;
    setChecking(true);
    setError(null);
    setFeedback(null);
    try {
      const verified = await reloadVerificationStatus();
      if (verified) {
        navigate(profile ? '/feed' : '/completar-perfil', { replace: true });
      } else {
        setFeedback('Seu e-mail ainda consta como não verificado. Clique no link enviado para sua caixa de entrada ou pasta de spam.');
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    setResending(true);
    setError(null);
    setFeedback(null);
    try {
      await resendVerificationEmail(user);
      setCooldown(60);
      setFeedback('Um novo link de verificação foi enviado para o seu e-mail.');
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#101311] text-[#E5EAE6] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-[#1B211D] border border-[#343B36] rounded-xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <MailCheck className="w-6 h-6 text-[#52C878] shrink-0" aria-hidden="true" />
          <h1 className="font-display text-xl font-bold text-[#E5EAE6]">
            Confirme seu e-mail
          </h1>
        </div>

        <p className="text-sm text-[#B8C0BA] leading-relaxed">
          Para proteger a comunidade do {APP_CONFIG.brandName}, enviamos um link de confirmação para{' '}
          <strong className="text-[#E5EAE6] font-medium">{user.email}</strong>. Abra sua caixa de entrada, confirme o endereço e clique abaixo para continuar.
        </p>

        {feedback && (
          <div className="p-3.5 rounded-lg bg-[#101311] border border-[#27864A]/60 text-sm text-[#E5EAE6] flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#52C878] shrink-0 mt-0.5" aria-hidden="true" />
            <span>{feedback}</span>
          </div>
        )}

        {error && (
          <div role="alert" className="p-3.5 rounded-lg bg-red-950/50 border border-red-700/60 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleCheckVerification}
            disabled={checking}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} aria-hidden="true" />
            {checking ? 'Verificando...' : 'Já verifiquei, acessar plataforma'}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="w-full px-4 py-2.5 rounded-lg border border-[#343B36] hover:bg-[#222924] text-sm font-medium text-[#E5EAE6] transition-colors cursor-pointer disabled:opacity-50"
          >
            {cooldown > 0
              ? `Aguarde ${cooldown}s para reenviar`
              : resending
                ? 'Reenviando...'
                : 'Reenviar e-mail de verificação'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-[#B8C0BA] hover:text-[#E5EAE6] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Sair e usar outra conta
          </button>
        </div>
      </div>
    </div>
  );
};
