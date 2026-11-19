import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Eye, EyeOff } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { loginWithEmail, loginWithGoogle } from '../services/authService';
import { translateAuthError } from '../services/firebase';
import { validateEmailFormat } from '../utils/validation';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from || '/feed';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || googleSubmitting) return;
    setError(null);

    const emailErr = validateEmailFormat(email);
    if (emailErr) return setError(emailErr);
    if (!password) return setError('Informe sua senha.');

    setSubmitting(true);
    try {
      const user = await loginWithEmail(email, password);
      if (!user.emailVerified) {
        navigate('/verificar-email', { replace: true });
      } else {
        navigate(fromPath, { replace: true });
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (submitting || googleSubmitting) return;
    setError(null);
    setGoogleSubmitting(true);
    try {
      const { needsOnboarding } = await loginWithGoogle();
      if (needsOnboarding) {
        navigate('/completar-perfil', { replace: true });
      } else {
        navigate(fromPath, { replace: true });
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101311] text-[#E5EAE6] flex flex-col justify-center px-4 py-10">
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[#B8C0BA] hover:text-[#E5EAE6] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar ao início
          </Link>
          <Link to="/" className="flex items-center gap-2 text-[#E5EAE6]">
            <BookOpen className="w-5 h-5 text-[#52C878]" aria-hidden="true" />
            <span className="font-display font-bold">{APP_CONFIG.brandName}</span>
          </Link>
        </div>

        <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl font-bold text-[#E5EAE6]">
              Entrar na comunidade
            </h1>
            <p className="text-sm text-[#B8C0BA]">
              Acesse com sua conta acadêmica para consultar e responder dúvidas.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={submitting || googleSubmitting}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border border-[#343B36] bg-[#101311] hover:border-[#52C878]/60 text-sm font-medium text-[#E5EAE6] transition-colors cursor-pointer disabled:opacity-50"
          >
            <span>{googleSubmitting ? 'Conectando ao Google...' : 'Entrar com Google'}</span>
          </button>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-[#343B36]" />
            <span className="shrink mx-3 text-xs text-[#B8C0BA]">ou com e-mail e senha</span>
            <div className="flex-grow border-t border-[#343B36]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-sm font-medium text-[#E5EAE6]">
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@estudante.ifbaiano.edu.br"
                className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3.5 py-2.5 text-sm text-[#E5EAE6] placeholder:text-[#B8C0BA]/50 focus:border-[#52C878] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="block text-sm font-medium text-[#E5EAE6]">
                  Senha
                </label>
                <Link
                  to="/recuperar-senha"
                  className="text-xs text-[#52C878] hover:underline font-medium"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-[#101311] border border-[#343B36] pl-3.5 pr-10 py-2.5 text-sm text-[#E5EAE6] placeholder:text-[#B8C0BA]/50 focus:border-[#52C878] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#B8C0BA] hover:text-[#E5EAE6] p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-red-950/50 border border-red-700/60 text-sm text-red-200"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || googleSubmitting}
              className="w-full px-4 py-3 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-sm text-[#B8C0BA]">
            Ainda não tem conta?{' '}
            <Link to="/cadastro" className="text-[#52C878] hover:underline font-medium">
              Cadastre-se agora
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
