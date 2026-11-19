import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle2 } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { requestPasswordReset } from '../services/authService';
import { translateAuthError } from '../services/firebase';
import { validateEmailFormat } from '../utils/validation';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const emailErr = validateEmailFormat(email);
    if (emailErr) return setError(emailErr);

    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101311] text-[#E5EAE6] flex flex-col justify-center px-4 py-10">
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-[#B8C0BA] hover:text-[#E5EAE6] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar ao login
          </Link>
          <Link to="/" className="flex items-center gap-2 text-[#E5EAE6]">
            <BookOpen className="w-5 h-5 text-[#52C878]" aria-hidden="true" />
            <span className="font-display font-bold">{APP_CONFIG.brandName}</span>
          </Link>
        </div>

        <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 sm:p-8 space-y-5">
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl font-bold text-[#E5EAE6]">
              Recuperar senha
            </h1>
            <p className="text-sm text-[#B8C0BA]">
              Informe o e-mail cadastrado para receber o link de redefinição de senha.
            </p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#101311] border border-[#27864A]/60 text-sm text-[#E5EAE6] flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#52C878] shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Se existir uma conta vinculada a <strong>{email}</strong>, você receberá um e-mail com as instruções para cadastrar uma nova senha.
                </span>
              </div>
              <Link
                to="/login"
                className="block w-full text-center px-4 py-2.5 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] transition-colors"
              >
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="reset-email" className="block text-sm font-medium text-[#E5EAE6]">
                  E-mail cadastrado
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@estudante.ifbaiano.edu.br"
                  className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3.5 py-2.5 text-sm text-[#E5EAE6] placeholder:text-[#B8C0BA]/50 focus:border-[#52C878] focus:outline-none"
                />
              </div>

              {error && (
                <div role="alert" className="p-3.5 rounded-lg bg-red-950/50 border border-red-700/60 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-3 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
