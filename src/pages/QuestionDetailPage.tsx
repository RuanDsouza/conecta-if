import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  CornerDownRight,
  Edit3,
  ExternalLink,
  Flag,
  HelpCircle,
  MessageSquare,
  RotateCcw,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { ConfirmModal } from '../components/ConfirmModal';
import { ReportModal } from '../components/ReportModal';
import { StatusBadge } from '../components/StatusBadge';
import { CONTENT_LIMITS } from '../config/appConfig';
import { useAuth } from '../context/AuthContext';
import {
  createAnswer,
  createComplement,
  deleteAnswerCascade,
  deleteComplement,
  deleteQuestionCascade,
  fetchAnswersForQuestion,
  fetchComplementsForQuestion,
  fetchQuestionById,
  fetchUserHelpfulVoteIds,
  isQuestionBookmarked,
  toggleBookmark,
  toggleHelpfulVote,
  updateAnswer,
  updateComplement,
  updateQuestionStatus,
} from '../services/communityService';
import { extractFriendlyErrorMessage } from '../services/firebase';
import {
  AnswerComplementItem,
  AnswerItem,
  QuestionItem,
  ReportTargetType,
} from '../types/domain';
import {
  formatFullDate,
  formatRelativeDate,
  getInitials,
  validateAnswerInput,
  validateComplementInput,
} from '../utils/validation';

export const QuestionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [question, setQuestion] = useState<QuestionItem | null>(null);
  const [answers, setAnswers] = useState<AnswerItem[]>([]);
  const [complements, setComplements] = useState<AnswerComplementItem[]>([]);
  const [helpfulVoteIds, setHelpfulVoteIds] = useState<Set<string>>(new Set());
  const [bookmarked, setBookmarked] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [answerSort, setAnswerSort] = useState<'chronological' | 'helpful'>('chronological');

  // Nova resposta
  const [answerBody, setAnswerBody] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [showAnswerCode, setShowAnswerCode] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  // Edição de resposta
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editAnswerBody, setEditAnswerBody] = useState('');
  const [editAnswerCode, setEditAnswerCode] = useState('');
  const [savingAnswerEdit, setSavingAnswerEdit] = useState(false);

  // Complementações
  const [activeComplementAnswerId, setActiveComplementAnswerId] = useState<string | null>(null);
  const [complementText, setComplementText] = useState('');
  const [submittingComplement, setSubmittingComplement] = useState(false);
  const [editingComplementId, setEditingComplementId] = useState<string | null>(null);
  const [editComplementBody, setEditComplementBody] = useState('');

  // Status & Exclusões & Denúncia
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [confirmDeleteQuestion, setConfirmDeleteQuestion] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState(false);
  const [answerToDelete, setAnswerToDelete] = useState<AnswerItem | null>(null);
  const [deletingAnswer, setDeletingAnswer] = useState(false);
  const [complementToDelete, setComplementToDelete] = useState<AnswerComplementItem | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    type: ReportTargetType;
    id: string;
    excerpt: string;
  } | null>(null);

  const loadAll = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    setError(null);
    try {
      const [qData, ansList, compList, votesSet, isSaved] = await Promise.all([
        fetchQuestionById(id),
        fetchAnswersForQuestion(id),
        fetchComplementsForQuestion(id),
        fetchUserHelpfulVoteIds(user.uid),
        isQuestionBookmarked(user.uid, id),
      ]);

      if (!qData || qData.visibility === 'removed') {
        setQuestion(null);
      } else {
        setQuestion(qData);
      }
      setAnswers(ansList);
      setComplements(compList);
      setHelpfulVoteIds(votesSet);
      setBookmarked(isSaved);
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const sortedAnswers = useMemo(() => {
    const copy = [...answers];
    if (answerSort === 'helpful') {
      return copy.sort((a, b) => b.helpfulCount - a.helpfulCount);
    }
    return copy;
  }, [answers, answerSort]);

  const complementsByAnswer = useMemo(() => {
    const map = new Map<string, AnswerComplementItem[]>();
    for (const c of complements) {
      const list = map.get(c.answerId) || [];
      list.push(c);
      map.set(c.answerId, list);
    }
    return map;
  }, [complements]);

  const isQuestionAuthor = Boolean(user && question && question.authorId === user.uid);
  const hasHelpfulAnswer = answers.some((a) => a.helpfulCount > 0);

  const handleToggleStatus = async () => {
    if (!question || !isQuestionAuthor || togglingStatus) return;
    setTogglingStatus(true);
    setError(null);
    const nextStatus = question.status === 'open' ? 'resolved' : 'open';
    try {
      await updateQuestionStatus(question.id, nextStatus);
      setQuestion((prev) => (prev ? { ...prev, status: nextStatus } : null));
      setActionMessage(
        nextStatus === 'resolved'
          ? 'Dúvida marcada como resolvida.'
          : 'Dúvida reaberta para novas respostas.'
      );
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!user || !question) return;
    try {
      const saved = await toggleBookmark(user.uid, question);
      setBookmarked(saved);
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    }
  };

  const handleDeleteQuestion = async () => {
    if (!user || !question || deletingQuestion) return;
    setDeletingQuestion(true);
    try {
      await deleteQuestionCascade(question.id, user.uid);
      navigate('/feed', { replace: true });
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
      setConfirmDeleteQuestion(false);
    } finally {
      setDeletingQuestion(false);
    }
  };

  const handleCreateAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !question || submittingAnswer) return;
    setError(null);
    setActionMessage(null);

    const validationErr = validateAnswerInput(answerBody, answerCode);
    if (validationErr) return setError(validationErr);

    setSubmittingAnswer(true);
    try {
      await createAnswer(profile, question, {
        body: answerBody,
        codeSnippet: answerCode,
      });
      setAnswerBody('');
      setAnswerCode('');
      setShowAnswerCode(false);
      setActionMessage('Resposta publicada com sucesso.');
      await loadAll();
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleSaveAnswerEdit = async (answerId: string) => {
    if (savingAnswerEdit) return;
    const validationErr = validateAnswerInput(editAnswerBody, editAnswerCode);
    if (validationErr) return setError(validationErr);

    setSavingAnswerEdit(true);
    setError(null);
    try {
      await updateAnswer(answerId, { body: editAnswerBody, codeSnippet: editAnswerCode });
      setEditingAnswerId(null);
      await loadAll();
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    } finally {
      setSavingAnswerEdit(false);
    }
  };

  const handleDeleteAnswer = async () => {
    if (!answerToDelete || deletingAnswer) return;
    setDeletingAnswer(true);
    try {
      await deleteAnswerCascade(answerToDelete);
      setAnswerToDelete(null);
      await loadAll();
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    } finally {
      setDeletingAnswer(false);
    }
  };

  const handleToggleHelpful = async (answer: AnswerItem) => {
    if (!profile || !question || answer.authorId === profile.id) return;
    try {
      const added = await toggleHelpfulVote(profile, question, answer);
      setHelpfulVoteIds((prev) => {
        const next = new Set(prev);
        if (added) next.add(answer.id);
        else next.delete(answer.id);
        return next;
      });
      setAnswers((prev) =>
        prev.map((item) =>
          item.id === answer.id
            ? { ...item, helpfulCount: Math.max(0, item.helpfulCount + (added ? 1 : -1)) }
            : item
        )
      );
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    }
  };

  const handleCreateComplement = async (e: React.FormEvent, answer: AnswerItem) => {
    e.preventDefault();
    if (!profile || !question || submittingComplement) return;
    const validationErr = validateComplementInput(complementText);
    if (validationErr) return setError(validationErr);

    setSubmittingComplement(true);
    setError(null);
    try {
      await createComplement(profile, question, answer, complementText);
      setComplementText('');
      setActiveComplementAnswerId(null);
      await loadAll();
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    } finally {
      setSubmittingComplement(false);
    }
  };

  const handleSaveComplementEdit = async (complementId: string) => {
    const validationErr = validateComplementInput(editComplementBody);
    if (validationErr) return setError(validationErr);
    try {
      await updateComplement(complementId, editComplementBody);
      setEditingComplementId(null);
      await loadAll();
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    }
  };

  const handleDeleteComplement = async () => {
    if (!complementToDelete) return;
    try {
      await deleteComplement(complementToDelete.id);
      setComplementToDelete(null);
      await loadAll();
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <AppLayout pageTitle="Carregando pergunta">
        <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 space-y-4 animate-pulse">
          <div className="h-4 w-40 bg-[#343B36]/60 rounded" />
          <div className="h-7 w-4/5 bg-[#343B36]/60 rounded" />
          <div className="h-24 w-full bg-[#343B36]/40 rounded" />
        </div>
      </AppLayout>
    );
  }

  if (!question) {
    return (
      <AppLayout pageTitle="Pergunta não encontrada">
        <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-8 text-center space-y-4">
          <h1 className="font-display text-xl font-bold text-[#E5EAE6]">
            Pergunta não encontrada
          </h1>
          <p className="text-sm text-[#B8C0BA]">
            Esta dúvida pode ter sido removida pelo autor ou pela moderação.
          </p>
          <Link
            to="/feed"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-medium text-[#E5EAE6]"
          >
            Voltar ao feed
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Detalhes da dúvida">
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/feed"
            className="inline-flex items-center gap-2 text-sm text-[#B8C0BA] hover:text-[#E5EAE6] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar ao feed
          </Link>
          <span className="text-xs text-[#B8C0BA] tabular-nums">
            Última atividade: {formatRelativeDate(question.lastActivityAt)}
          </span>
        </div>

        {error && (
          <div role="alert" className="p-4 rounded-xl bg-red-950/50 border border-red-700/60 text-sm text-red-200">
            {error}
          </div>
        )}

        {actionMessage && (
          <div className="p-4 rounded-xl bg-[#1B211D] border border-[#27864A]/60 text-sm text-[#E5EAE6] flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#52C878] shrink-0" aria-hidden="true" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Sugestão gentil para marcar como resolvida quando há resposta útil */}
        {isQuestionAuthor && question.status === 'open' && hasHelpfulAnswer && (
          <div className="bg-[#1B211D] border border-[#27864A]/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-[#E5EAE6]">
              Sua pergunta possui resposta marcada como útil. Se sua dúvida já foi esclarecida, você pode marcá-la como resolvida.
            </p>
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={togglingStatus}
              className="px-3.5 py-2 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-xs font-semibold text-[#E5EAE6] whitespace-nowrap cursor-pointer"
            >
              Marcar como resolvida
            </button>
          </div>
        )}

        {/* Cartão da Pergunta Original */}
        <article className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 sm:p-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-[#B8C0BA]">
              <span className="font-semibold text-[#52C878]">{question.subjectName}</span>
              {question.courseId && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{question.courseId}</span>
                </>
              )}
              {question.campusId && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{question.campusId}</span>
                </>
              )}
            </div>
            <StatusBadge status={question.status} />
          </div>

          <h1 className="font-display text-xl sm:text-2xl font-bold text-[#E5EAE6] leading-snug">
            {question.title}
          </h1>

          <div className="text-sm sm:text-base text-[#E5EAE6]/95 leading-relaxed whitespace-pre-line">
            {question.body}
          </div>

          {question.codeSnippet && (
            <pre className="p-4 rounded-lg bg-[#101311] border border-[#343B36] text-xs font-mono text-[#E5EAE6] overflow-x-auto">
              <code>{question.codeSnippet}</code>
            </pre>
          )}

          {question.referenceUrl && (
            <div className="pt-1">
              <a
                href={question.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#52C878] hover:underline break-all"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                {question.referenceUrl}
              </a>
            </div>
          )}

          {question.tags.length > 0 && (
            <div className="flex flex-wrap gap-3 text-xs font-mono text-[#B8C0BA]">
              {question.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          )}

          {/* Autor e ações */}
          <div className="pt-4 border-t border-[#343B36] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                to={`/perfil/${question.authorId}`}
                className="w-9 h-9 rounded-lg bg-[#101311] border border-[#343B36] flex items-center justify-center text-xs font-semibold text-[#52C878]"
              >
                {getInitials(question.authorName)}
              </Link>
              <div className="text-xs text-[#B8C0BA]">
                <Link
                  to={`/perfil/${question.authorId}`}
                  className="text-sm font-medium text-[#E5EAE6] hover:text-[#52C878]"
                >
                  {question.authorName}
                </Link>
                <p>
                  Publicada em {formatFullDate(question.createdAt)}
                  {question.isEdited ? ` · Editada em ${formatFullDate(question.updatedAt)}` : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isQuestionAuthor && (
                <>
                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    disabled={togglingStatus}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#27864A] bg-[#27864A]/15 hover:bg-[#27864A]/30 text-xs font-semibold text-[#52C878] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {question.status === 'open' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Marcar como resolvida
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        Reabrir dúvida
                      </>
                    )}
                  </button>

                  <Link
                    to={`/editar-pergunta/${question.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#343B36] text-xs font-medium text-[#E5EAE6] hover:bg-[#101311]"
                  >
                    <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                    Editar
                  </Link>

                  <button
                    type="button"
                    onClick={() => setConfirmDeleteQuestion(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#343B36] text-xs font-medium text-red-300 hover:border-red-700/70 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Excluir
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleToggleBookmark}
                aria-pressed={bookmarked}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                  bookmarked
                    ? 'border-[#27864A] bg-[#27864A]/20 text-[#52C878]'
                    : 'border-[#343B36] text-[#B8C0BA] hover:text-[#E5EAE6]'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
                {bookmarked ? 'Salva' : 'Salvar'}
              </button>

              {!isQuestionAuthor && (
                <button
                  type="button"
                  onClick={() =>
                    setReportTarget({
                      type: 'question',
                      id: question.id,
                      excerpt: question.title,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#343B36] text-xs font-medium text-[#B8C0BA] hover:text-amber-300 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                  Denunciar
                </button>
              )}
            </div>
          </div>
        </article>

        {/* Seção de Respostas */}
        <section className="space-y-4" aria-labelledby="answers-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="answers-heading"
              className="font-display text-lg font-semibold text-[#E5EAE6] flex items-center gap-2 tabular-nums"
            >
              <MessageSquare className="w-5 h-5 text-[#52C878]" aria-hidden="true" />
              {answers.length} {answers.length === 1 ? 'Resposta' : 'Respostas'}
            </h2>

            {answers.length > 1 && (
              <div className="flex items-center gap-2">
                <label htmlFor="answer-sort" className="text-xs text-[#B8C0BA]">
                  Ordenar respostas:
                </label>
                <select
                  id="answer-sort"
                  value={answerSort}
                  onChange={(e) =>
                    setAnswerSort(e.target.value as 'chronological' | 'helpful')
                  }
                  className="rounded-lg bg-[#1B211D] border border-[#343B36] px-3 py-1.5 text-xs text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
                >
                  <option value="chronological">Ordem de envio</option>
                  <option value="helpful">Mais úteis</option>
                </select>
              </div>
            )}
          </div>

          {sortedAnswers.length === 0 ? (
            <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 text-center text-sm text-[#B8C0BA]">
              Nenhuma resposta publicada ainda.{' '}
              {question.status === 'open'
                ? 'Se você domina este assunto, compartilhe sua explicação abaixo.'
                : ''}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedAnswers.map((answer) => {
                const isAnswerAuthor = user?.uid === answer.authorId;
                const canComplement = Boolean(
                  user && (isAnswerAuthor || isQuestionAuthor)
                );
                const hasVotedHelpful = helpfulVoteIds.has(answer.id);
                const answerComplements = complementsByAnswer.get(answer.id) || [];

                return (
                  <div
                    key={answer.id}
                    className="bg-[#1B211D] border border-[#343B36] rounded-xl p-5 sm:p-6 space-y-4"
                  >
                    {/* Cabeçalho da resposta */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Link
                          to={`/perfil/${answer.authorId}`}
                          className="w-8 h-8 rounded-md bg-[#101311] border border-[#343B36] flex items-center justify-center text-xs font-semibold text-[#52C878]"
                        >
                          {getInitials(answer.authorName)}
                        </Link>
                        <div className="text-xs text-[#B8C0BA]">
                          <Link
                            to={`/perfil/${answer.authorId}`}
                            className="text-sm font-medium text-[#E5EAE6] hover:text-[#52C878]"
                          >
                            {answer.authorName}
                          </Link>
                          <p>
                            {[answer.authorCampus, answer.authorCourse]
                              .filter(Boolean)
                              .join(' · ')}
                            {[answer.authorCampus, answer.authorCourse].some(Boolean) ? ' · ' : ''}
                            {formatFullDate(answer.createdAt)}
                            {answer.isEdited ? ' · Editada' : ''}
                          </p>
                        </div>
                      </div>

                      {answer.helpfulCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#52C878] tabular-nums">
                          <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                          {answer.helpfulCount}{' '}
                          {answer.helpfulCount === 1 ? 'marcação útil' : 'marcações úteis'}
                        </span>
                      )}
                    </div>

                    {/* Corpo da resposta ou edição inline */}
                    {editingAnswerId === answer.id ? (
                      <div className="space-y-3">
                        <textarea
                          rows={4}
                          maxLength={CONTENT_LIMITS.answerBodyMax}
                          value={editAnswerBody}
                          onChange={(e) => setEditAnswerBody(e.target.value)}
                          className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3.5 py-2.5 text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
                        />
                        <textarea
                          rows={3}
                          maxLength={CONTENT_LIMITS.codeSnippetMax}
                          value={editAnswerCode}
                          onChange={(e) => setEditAnswerCode(e.target.value)}
                          placeholder="Trecho de código opcional..."
                          className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3.5 py-2 text-xs font-mono text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingAnswerId(null)}
                            className="px-3 py-1.5 rounded-lg border border-[#343B36] text-xs text-[#E5EAE6] cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveAnswerEdit(answer.id)}
                            disabled={savingAnswerEdit}
                            className="px-3.5 py-1.5 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-xs font-semibold text-[#E5EAE6] cursor-pointer disabled:opacity-50"
                          >
                            {savingAnswerEdit ? 'Salvando...' : 'Salvar edição'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-[#E5EAE6]/95 leading-relaxed whitespace-pre-line">
                          {answer.body}
                        </div>
                        {answer.codeSnippet && (
                          <pre className="p-3.5 rounded-lg bg-[#101311] border border-[#343B36] text-xs font-mono text-[#E5EAE6] overflow-x-auto">
                            <code>{answer.codeSnippet}</code>
                          </pre>
                        )}
                      </>
                    )}

                    {/* Ações da resposta */}
                    <div className="pt-3 border-t border-[#343B36] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {!isAnswerAuthor && (
                          <button
                            type="button"
                            onClick={() => handleToggleHelpful(answer)}
                            aria-pressed={hasVotedHelpful}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer tabular-nums ${
                              hasVotedHelpful
                                ? 'border-[#27864A] bg-[#27864A]/20 text-[#52C878]'
                                : 'border-[#343B36] text-[#B8C0BA] hover:text-[#E5EAE6]'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                            Útil ({answer.helpfulCount})
                          </button>
                        )}

                        {canComplement && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveComplementAnswerId((prev) =>
                                prev === answer.id ? null : answer.id
                              );
                              setComplementText('');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#343B36] text-xs font-medium text-[#E5EAE6] hover:border-[#52C878] transition-colors cursor-pointer"
                          >
                            <CornerDownRight className="w-3.5 h-3.5 text-[#52C878]" aria-hidden="true" />
                            Complementar resposta
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isAnswerAuthor && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAnswerId(answer.id);
                                setEditAnswerBody(answer.body);
                                setEditAnswerCode(answer.codeSnippet || '');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#343B36] text-xs text-[#B8C0BA] hover:text-[#E5EAE6] cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => setAnswerToDelete(answer)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#343B36] text-xs text-red-300 hover:border-red-700/70 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              Excluir
                            </button>
                          </>
                        )}
                        {!isAnswerAuthor && (
                          <button
                            type="button"
                            onClick={() =>
                              setReportTarget({
                                type: 'answer',
                                id: answer.id,
                                excerpt: answer.body.slice(0, 140),
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#343B36] text-xs text-[#B8C0BA] hover:text-amber-300 cursor-pointer"
                          >
                            <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                            Denunciar
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Complementações vinculadas à resposta (preservando autoria própria) */}
                    {(answerComplements.length > 0 || activeComplementAnswerId === answer.id) && (
                      <div className="mt-3 pt-3 border-t border-[#343B36] pl-4 sm:pl-6 space-y-3">
                        {answerComplements.map((comp) => {
                          const isCompAuthor = user?.uid === comp.authorId;
                          return (
                            <div
                              key={comp.id}
                              className="bg-[#101311] border border-[#343B36] rounded-lg p-3.5 space-y-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    to={`/perfil/${comp.authorId}`}
                                    className="font-semibold text-[#E5EAE6] hover:text-[#52C878]"
                                  >
                                    {comp.authorName}
                                  </Link>
                                  <span className="text-[#52C878] font-medium">
                                    {comp.authorRoleLabel}
                                  </span>
                                  <span className="text-[#B8C0BA]">
                                    · {formatFullDate(comp.createdAt)}
                                    {comp.isEdited ? ' · Editada' : ''}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isCompAuthor ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingComplementId(comp.id);
                                          setEditComplementBody(comp.body);
                                        }}
                                        className="text-[#B8C0BA] hover:text-[#E5EAE6] cursor-pointer"
                                      >
                                        Editar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setComplementToDelete(comp)}
                                        className="text-red-300 hover:underline cursor-pointer"
                                      >
                                        Excluir
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReportTarget({
                                          type: 'complement',
                                          id: comp.id,
                                          excerpt: comp.body.slice(0, 140),
                                        })
                                      }
                                      className="text-[#B8C0BA] hover:text-amber-300 cursor-pointer"
                                    >
                                      Denunciar
                                    </button>
                                  )}
                                </div>
                              </div>

                              {editingComplementId === comp.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    rows={2}
                                    maxLength={CONTENT_LIMITS.complementBodyMax}
                                    value={editComplementBody}
                                    onChange={(e) => setEditComplementBody(e.target.value)}
                                    className="w-full rounded-lg bg-[#1B211D] border border-[#343B36] px-3 py-2 text-xs text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingComplementId(null)}
                                      className="px-2.5 py-1 rounded border border-[#343B36] text-xs text-[#E5EAE6] cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveComplementEdit(comp.id)}
                                      className="px-3 py-1 rounded bg-[#27864A] text-xs font-medium text-[#E5EAE6] cursor-pointer"
                                    >
                                      Salvar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs sm:text-sm text-[#B8C0BA] whitespace-pre-line leading-relaxed">
                                  {comp.body}
                                </p>
                              )}
                            </div>
                          );
                        })}

                        {activeComplementAnswerId === answer.id && (
                          <form
                            onSubmit={(e) => handleCreateComplement(e, answer)}
                            className="space-y-2.5 bg-[#101311] border border-[#343B36] rounded-lg p-3.5"
                          >
                            <label
                              htmlFor={`comp-input-${answer.id}`}
                              className="block text-xs font-medium text-[#E5EAE6]"
                            >
                              {isAnswerAuthor
                                ? 'Acrescentar complementação à sua resposta'
                                : 'Complementar discussão com o autor da resposta'}
                            </label>
                            <textarea
                              id={`comp-input-${answer.id}`}
                              rows={2}
                              maxLength={CONTENT_LIMITS.complementBodyMax}
                              value={complementText}
                              onChange={(e) => setComplementText(e.target.value)}
                              placeholder="Adicione um esclarecimento ou passo complementar sem alterar a resposta original..."
                              className="w-full rounded-lg bg-[#1B211D] border border-[#343B36] px-3 py-2 text-xs sm:text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveComplementAnswerId(null)}
                                className="px-3 py-1.5 rounded-lg border border-[#343B36] text-xs text-[#E5EAE6] cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                disabled={submittingComplement}
                                className="px-3.5 py-1.5 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-xs font-semibold text-[#E5EAE6] cursor-pointer disabled:opacity-50"
                              >
                                {submittingComplement ? 'Enviando...' : 'Publicar complementação'}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Formulário de Nova Resposta */}
        {question.status === 'open' ? (
          <section className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#E5EAE6]">
              Sua resposta
            </h2>
            <form onSubmit={handleCreateAnswer} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="new-answer-body" className="text-xs font-medium text-[#B8C0BA]">
                    Explique o passo a passo de forma clara e respeitosa
                  </label>
                  <span className="text-xs text-[#B8C0BA] tabular-nums">
                    {answerBody.length}/{CONTENT_LIMITS.answerBodyMax}
                  </span>
                </div>
                <textarea
                  id="new-answer-body"
                  rows={5}
                  maxLength={CONTENT_LIMITS.answerBodyMax}
                  value={answerBody}
                  onChange={(e) => setAnswerBody(e.target.value)}
                  placeholder="Escreva sua explicação ou resolução..."
                  className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3.5 py-2.5 text-sm text-[#E5EAE6] placeholder:text-[#B8C0BA]/50 focus:border-[#52C878] focus:outline-none"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowAnswerCode((v) => !v)}
                  className="text-xs font-medium text-[#52C878] hover:underline cursor-pointer"
                >
                  {showAnswerCode ? 'Ocultar bloco de código' : '+ Incluir trecho de código ou fórmula'}
                </button>
                {showAnswerCode && (
                  <textarea
                    rows={3}
                    maxLength={CONTENT_LIMITS.codeSnippetMax}
                    value={answerCode}
                    onChange={(e) => setAnswerCode(e.target.value)}
                    placeholder="Cole código ou fórmula de apoio..."
                    className="mt-2 w-full rounded-lg bg-[#101311] border border-[#343B36] px-3.5 py-2 text-xs font-mono text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
                  />
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingAnswer}
                  className="px-5 py-2.5 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingAnswer ? 'Publicando...' : 'Enviar resposta'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-5 flex items-center gap-3 text-sm text-[#B8C0BA]">
            <HelpCircle className="w-5 h-5 text-[#52C878] shrink-0" aria-hidden="true" />
            <span>
              Esta dúvida foi marcada como resolvida pelo autor. Apenas o autor pode reabri-la caso novas respostas sejam necessárias.
            </span>
          </div>
        )}
      </div>

      {/* Confirmação de exclusão em cascata da pergunta */}
      <ConfirmModal
        open={confirmDeleteQuestion}
        destructive
        loading={deletingQuestion}
        title="Excluir dúvida permanentemente?"
        description={
          answers.length > 0 || complements.length > 0
            ? `Esta pergunta possui ${answers.length} resposta(s) e ${complements.length} complementação(ões). Ao confirmar, a pergunta e todo o histórico vinculado serão removidos de forma consistente para não deixar registros órfãos.`
            : 'Esta ação removerá a pergunta permanentemente da comunidade.'
        }
        confirmLabel="Excluir definitivamente"
        onConfirm={handleDeleteQuestion}
        onCancel={() => setConfirmDeleteQuestion(false)}
      />

      {/* Confirmação de exclusão de resposta */}
      <ConfirmModal
        open={Boolean(answerToDelete)}
        destructive
        loading={deletingAnswer}
        title="Excluir resposta?"
        description="A resposta e eventuais complementações vinculadas a ela serão excluídas permanentemente."
        confirmLabel="Excluir resposta"
        onConfirm={handleDeleteAnswer}
        onCancel={() => setAnswerToDelete(null)}
      />

      {/* Confirmação de exclusão de complementação */}
      <ConfirmModal
        open={Boolean(complementToDelete)}
        destructive
        title="Excluir complementação?"
        description="Esta mensagem complementar será removida da discussão."
        confirmLabel="Excluir"
        onConfirm={handleDeleteComplement}
        onCancel={() => setComplementToDelete(null)}
      />

      {user && reportTarget && (
        <ReportModal
          open={Boolean(reportTarget)}
          reporterId={user.uid}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetExcerpt={reportTarget.excerpt}
          onClose={() => setReportTarget(null)}
        />
      )}
    </AppLayout>
  );
};
