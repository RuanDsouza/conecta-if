import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, EyeOff, Plus, ShieldAlert, XCircle } from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { DEFAULT_SUBJECTS, REPORT_REASONS } from '../config/appConfig';
import { useAuth } from '../context/AuthContext';
import {
  fetchActiveSubjects,
  fetchReportsAdmin,
  moderateContentVisibilityAdmin,
  reviewReportAdmin,
  saveSubjectAdmin,
} from '../services/communityService';
import { extractFriendlyErrorMessage } from '../services/firebase';
import { ReportItem, ReportStatus, SubjectItem } from '../types/domain';
import { formatFullDate } from '../utils/validation';

export const ModerationPage: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>(DEFAULT_SUBJECTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectArea, setNewSubjectArea] = useState('Tecnologia');
  const [savingSubject, setSavingSubject] = useState(false);

  const loadModerationData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [repList, subjList] = await Promise.all([
        fetchReportsAdmin(),
        fetchActiveSubjects(),
      ]);
      setReports(repList);
      setSubjects(subjList);
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModerationData();
  }, [loadModerationData]);

  const handleUpdateReportStatus = async (report: ReportItem, status: ReportStatus) => {
    if (!user) return;
    setError(null);
    setFeedback(null);
    try {
      await reviewReportAdmin(report.id, user.uid, status);
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, status, reviewedBy: user.uid } : r))
      );
      setFeedback('Status da denúncia atualizado.');
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    }
  };

  const handleHideTargetContent = async (report: ReportItem) => {
    if (!user || report.targetType === 'profile') return;
    setError(null);
    setFeedback(null);
    try {
      await moderateContentVisibilityAdmin(report.targetType, report.targetId, 'removed');
      await reviewReportAdmin(report.id, user.uid, 'action_taken');
      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id ? { ...r, status: 'action_taken', reviewedBy: user.uid } : r
        )
      );
      setFeedback('Conteúdo ocultado da comunidade e denúncia marcada como tratada.');
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim() || savingSubject) return;
    setSavingSubject(true);
    setError(null);
    setFeedback(null);
    try {
      const slug = newSubjectName
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const item: SubjectItem = {
        id: slug || `subj-${Date.now()}`,
        name: newSubjectName.trim(),
        area: newSubjectArea.trim() || 'Geral',
        active: true,
        order: subjects.length + 1,
      };
      await saveSubjectAdmin(item);
      setSubjects((prev) => [...prev, item]);
      setNewSubjectName('');
      setFeedback(`Disciplina "${item.name}" salva no catálogo.`);
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    } finally {
      setSavingSubject(false);
    }
  };

  const reasonLabel = (val: string) =>
    REPORT_REASONS.find((r) => r.value === val)?.label || val;

  return (
    <AppLayout pageTitle="Moderação e Administração">
      <div className="max-w-4xl space-y-8">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-[#52C878]" aria-hidden="true" />
          <div>
            <h1 className="font-display text-2xl font-bold text-[#E5EAE6]">
              Moderação e Administração
            </h1>
            <p className="text-sm text-[#B8C0BA]">
              Analise denúncias da comunidade e gerencie o catálogo de disciplinas.
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className="p-4 rounded-xl bg-red-950/50 border border-red-700/60 text-sm text-red-200">
            {error}
          </div>
        )}

        {feedback && (
          <div className="p-4 rounded-xl bg-[#1B211D] border border-[#27864A]/60 text-sm text-[#E5EAE6] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#52C878] shrink-0" aria-hidden="true" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Fila de Denúncias */}
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#E5EAE6] tabular-nums">
            Denúncias registradas ({reports.length})
          </h2>

          {loading ? (
            <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 text-sm text-[#B8C0BA]">
              Carregando fila de moderação...
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 text-sm text-[#B8C0BA]">
              Nenhuma denúncia registrada até o momento.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="bg-[#1B211D] border border-[#343B36] rounded-xl p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-amber-300">
                      {reasonLabel(rep.reason)} · Alvo: {rep.targetType}
                    </span>
                    <span className="font-mono text-[#B8C0BA]">
                      Status: {rep.status} · {formatFullDate(rep.createdAt)}
                    </span>
                  </div>

                  <p className="text-sm text-[#E5EAE6] bg-[#101311] border border-[#343B36] rounded-lg p-3">
                    {rep.targetExcerpt}
                  </p>

                  {rep.description && (
                    <p className="text-xs text-[#B8C0BA]">
                      Relato do denunciante: {rep.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {rep.targetType === 'question' && (
                      <Link
                        to={`/pergunta/${rep.targetId}`}
                        className="px-3 py-1.5 rounded-lg border border-[#343B36] text-xs text-[#E5EAE6] hover:border-[#52C878]"
                      >
                        Ver pergunta
                      </Link>
                    )}

                    {rep.targetType !== 'profile' && rep.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleHideTargetContent(rep)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-xs font-medium text-[#E5EAE6] cursor-pointer"
                      >
                        <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                        Ocultar conteúdo
                      </button>
                    )}

                    {rep.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateReportStatus(rep, 'dismissed')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#343B36] text-xs text-[#B8C0BA] hover:text-[#E5EAE6] cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        Arquivar denúncia
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Gestão de Disciplinas */}
        <section className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#E5EAE6]">
            Catálogo de disciplinas
          </h2>
          <form onSubmit={handleAddSubject} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="Nome da disciplina (ex.: Sociologia)"
              className="rounded-lg bg-[#101311] border border-[#343B36] px-3 py-2 text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
            />
            <input
              type="text"
              value={newSubjectArea}
              onChange={(e) => setNewSubjectArea(e.target.value)}
              placeholder="Área (ex.: Ciências Humanas)"
              className="rounded-lg bg-[#101311] border border-[#343B36] px-3 py-2 text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
            />
            <button
              type="submit"
              disabled={savingSubject}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Adicionar disciplina
            </button>
          </form>
        </section>
      </div>
    </AppLayout>
  );
};
