import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import {
  APP_CONFIG,
  IF_BAIANO_CAMPUSES,
  IF_BAIANO_COURSES,
  IF_BAIANO_YEARS,
} from '../config/appConfig';
import { useAuth } from '../context/AuthContext';
import { completeGoogleOnboarding, logoutUser } from '../services/authService';
import { extractFriendlyErrorMessage } from '../services/firebase';
import { validateDisplayName } from '../utils/validation';

export const OnboardingProfilePage: React.FC = () => {
  const { user, profile, authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [campus, setCampus] = useState(IF_BAIANO_CAMPUSES[0]);
  const [course, setCourse] = useState(IF_BAIANO_COURSES[0]);
  const [year, setYear] = useState(IF_BAIANO_YEARS[0]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verificar-email" replace />;
  if (profile) return <Navigate to="/feed" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const nameErr = validateDisplayName(displayName);
    if (nameErr) return setError(nameErr);

    if (!acceptedTerms) {
      return setError('Aceite os Termos de Uso e Política de Privacidade para continuar.');
    }

    setSubmitting(true);
    try {
      await completeGoogleOnboarding(user, {
        displayName,
        campus,
        course,
        year,
        acceptedTerms,
      });
      await refreshProfile();
      navigate('/feed', { replace: true });
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101311] text-[#E5EAE6] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-[#1B211D] border border-[#343B36] rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2.5 text-[#52C878]">
          <BookOpen className="w-5 h-5" aria-hidden="true" />
          <span className="font-display font-bold text-[#E5EAE6]">{APP_CONFIG.brandName}</span>
        </div>

        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-[#E5EAE6]">
            Complete seu perfil estudantil
          </h1>
          <p className="text-sm text-[#B8C0BA]">
            Informe seu campus e curso no IF Baiano para personalizar sua participação na comunidade.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="onb-name" className="block text-sm font-medium text-[#E5EAE6]">
              Nome de exibição
            </label>
            <input
              id="onb-name"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3.5 py-2.5 text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="onb-campus" className="block text-sm font-medium text-[#E5EAE6]">
                Campus
              </label>
              <select
                id="onb-campus"
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3 py-2.5 text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
              >
                {IF_BAIANO_CAMPUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="onb-year" className="block text-sm font-medium text-[#E5EAE6]">
                Ano ou semestre
              </label>
              <select
                id="onb-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3 py-2.5 text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
              >
                {IF_BAIANO_YEARS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="onb-course" className="block text-sm font-medium text-[#E5EAE6]">
              Curso
            </label>
            <select
              id="onb-course"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3 py-2.5 text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
            >
              {IF_BAIANO_COURSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-start gap-3 text-sm text-[#B8C0BA] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 rounded border-[#343B36] bg-[#101311] text-[#27864A] focus:ring-[#52C878]"
            />
            <span>
              Concordo com os Termos de Uso e Política de Privacidade acadêmica do {APP_CONFIG.brandName}.
            </span>
          </label>

          {error && (
            <div role="alert" className="p-3.5 rounded-lg bg-red-950/50 border border-red-700/60 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => logoutUser().then(() => navigate('/login'))}
              className="px-4 py-2.5 rounded-lg border border-[#343B36] text-sm text-[#B8C0BA] hover:text-[#E5EAE6] cursor-pointer"
            >
              Sair
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : 'Concluir cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
