import React, { useEffect, useState } from 'react';
import { CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import {
  CONTENT_LIMITS,
  IF_BAIANO_CAMPUSES,
  IF_BAIANO_COURSES,
  IF_BAIANO_YEARS,
} from '../config/appConfig';
import { useAuth } from '../context/AuthContext';
import { requestPasswordReset } from '../services/authService';
import { updateOwnProfile } from '../services/communityService';
import { extractFriendlyErrorMessage, translateAuthError } from '../services/firebase';
import { validateDisplayName } from '../utils/validation';

export const SettingsPage: React.FC = () => {
  const { user, profile, privateData, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [campus, setCampus] = useState(IF_BAIANO_CAMPUSES[0]);
  const [course, setCourse] = useState(IF_BAIANO_COURSES[0]);
  const [year, setYear] = useState(IF_BAIANO_YEARS[0]);
  const [bio, setBio] = useState('');
  const [showCampus, setShowCampus] = useState(true);
  const [showCourse, setShowCourse] = useState(true);
  const [showStats, setShowStats] = useState(true);

  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setCampus(profile.campus);
    setCourse(profile.course);
    setYear(profile.year || IF_BAIANO_YEARS[0]);
    setBio(profile.bio || '');
    setShowCampus(profile.showCampus);
    setShowCourse(profile.showCourse);
    setShowStats(profile.showStats);
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;
    setError(null);
    setSuccessMsg(null);

    const nameErr = validateDisplayName(displayName);
    if (nameErr) return setError(nameErr);

    setSaving(true);
    try {
      await updateOwnProfile(user.uid, {
        displayName,
        campus,
        course,
        year,
        bio,
        showCampus,
        showCourse,
        showStats,
      });
      await refreshProfile();
      setSuccessMsg('Perfil e preferências de privacidade atualizados com sucesso.');
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email || sendingReset) return;
    setSendingReset(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await requestPasswordReset(user.email);
      setSuccessMsg(`Enviamos um link de redefinição de senha para ${user.email}.`);
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <AppLayout pageTitle="Configurações">
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#E5EAE6]">
            Configurações do perfil e privacidade
          </h1>
          <p className="text-sm text-[#B8C0BA]">
            Gerencie suas informações acadêmicas e defina o que outros estudantes podem visualizar.
          </p>
        </div>

        {/* Informações de conta privadas (visíveis apenas ao próprio titular) */}
        <section className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#E5EAE6]">
            <ShieldCheck className="w-4 h-4 text-[#52C878]" aria-hidden="true" />
            Conta e verificação
          </div>
          <div className="text-xs sm:text-sm text-[#B8C0BA] space-y-1">
            <p>
              E-mail privado (nunca exibido publicamente):{' '}
              <strong className="text-[#E5EAE6] font-medium">{user?.email || '—'}</strong>
            </p>
            <p>
              Verificação de e-mail:{' '}
              <span className="text-[#52C878] font-medium">
                {user?.emailVerified ? 'Confirmada' : 'Pendente'}
              </span>
              {' · '}
              Domínio institucional:{' '}
              <span className="text-[#E5EAE6]">
                {privateData?.institutionalDomainVerified ? 'IF Baiano verificado' : 'Conta padrão'}
              </span>
            </p>
          </div>
        </section>

        <form
          onSubmit={handleSave}
          className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 space-y-6"
        >
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[#E5EAE6]">Dados acadêmicos</h2>

            <div className="space-y-1.5">
              <label htmlFor="cfg-name" className="block text-sm font-medium text-[#E5EAE6]">
                Nome de exibição
              </label>
              <input
                id="cfg-name"
                type="text"
                maxLength={CONTENT_LIMITS.displayNameMax}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3.5 py-2.5 text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="cfg-campus" className="block text-sm font-medium text-[#E5EAE6]">
                  Campus
                </label>
                <select
                  id="cfg-campus"
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                  className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3 py-2.5 text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
                >
                  {IF_BAIANO_CAMPUSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cfg-year" className="block text-sm font-medium text-[#E5EAE6]">
                  Ano ou semestre
                </label>
                <select
                  id="cfg-year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3 py-2.5 text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
                >
                  {IF_BAIANO_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cfg-course" className="block text-sm font-medium text-[#E5EAE6]">
                Curso
              </label>
              <select
                id="cfg-course"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3 py-2.5 text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
              >
                {IF_BAIANO_COURSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="cfg-bio" className="block text-sm font-medium text-[#E5EAE6]">
                  Apresentação acadêmica (opcional)
                </label>
                <span className="text-xs text-[#B8C0BA] tabular-nums">
                  {bio.length}/{CONTENT_LIMITS.bioMax}
                </span>
              </div>
              <textarea
                id="cfg-bio"
                rows={3}
                maxLength={CONTENT_LIMITS.bioMax}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Disciplinas de interesse, projetos de extensão ou monitoria..."
                className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3.5 py-2.5 text-sm text-[#E5EAE6] placeholder:text-[#B8C0BA]/50 focus:border-[#52C878] focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-5 border-t border-[#343B36] space-y-3">
            <h2 className="text-base font-semibold text-[#E5EAE6]">Privacidade do perfil</h2>

            <label className="flex items-center gap-3 text-sm text-[#B8C0BA] cursor-pointer">
              <input
                type="checkbox"
                checked={showCampus}
                onChange={(e) => setShowCampus(e.target.checked)}
                className="rounded border-[#343B36] bg-[#101311] text-[#27864A]"
              />
              <span>Exibir meu campus em publicações e no perfil público</span>
            </label>

            <label className="flex items-center gap-3 text-sm text-[#B8C0BA] cursor-pointer">
              <input
                type="checkbox"
                checked={showCourse}
                onChange={(e) => setShowCourse(e.target.checked)}
                className="rounded border-[#343B36] bg-[#101311] text-[#27864A]"
              />
              <span>Exibir meu curso em publicações e no perfil público</span>
            </label>

            <label className="flex items-center gap-3 text-sm text-[#B8C0BA] cursor-pointer">
              <input
                type="checkbox"
                checked={showStats}
                onChange={(e) => setShowStats(e.target.checked)}
                className="rounded border-[#343B36] bg-[#101311] text-[#27864A]"
              />
              <span>Exibir estatísticas de participação no meu perfil público</span>
            </label>
          </div>

          {error && (
            <div role="alert" className="p-3.5 rounded-lg bg-red-950/50 border border-red-700/60 text-sm text-red-200">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-lg bg-[#101311] border border-[#27864A]/60 text-sm text-[#E5EAE6] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#52C878] shrink-0" aria-hidden="true" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={sendingReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#343B36] text-xs font-medium text-[#E5EAE6] hover:bg-[#101311] cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5 text-[#52C878]" aria-hidden="true" />
              {sendingReset ? 'Enviando e-mail...' : 'Enviar link de redefinição de senha'}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar configurações'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};
