import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Code2, Eye, Link2, PenLine } from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { StatusBadge } from '../components/StatusBadge';
import {
  CONTENT_LIMITS,
  DEFAULT_SUBJECTS,
  IF_BAIANO_CAMPUSES,
  IF_BAIANO_COURSES,
} from '../config/appConfig';
import { useAuth } from '../context/AuthContext';
import {
  createQuestion,
  fetchActiveSubjects,
  fetchQuestionById,
  updateQuestionContent,
} from '../services/communityService';
import { extractFriendlyErrorMessage } from '../services/firebase';
import { SubjectItem } from '../types/domain';
import { parseTags, sanitizeText, validateQuestionInput } from '../utils/validation';

export const CreateQuestionPage: React.FC = () => {
  const { id: editQuestionId } = useParams<{ id?: string }>();
  const isEditMode = Boolean(editQuestionId);

  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<SubjectItem[]>(DEFAULT_SUBJECTS);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [subjectId, setSubjectId] = useState(DEFAULT_SUBJECTS[0].id);
  const [campusId, setCampusId] = useState(profile?.campus || IF_BAIANO_CAMPUSES[0]);
  const [courseId, setCourseId] = useState(profile?.course || IF_BAIANO_COURSES[0]);
  const [tagsInput, setTagsInput] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveSubjects()
      .then((list) => {
        setSubjects(list);
        if (!isEditMode && list.length > 0) {
          setSubjectId((prev) => (list.some((s) => s.id === prev) ? prev : list[0].id));
        }
      })
      .catch(() => {});
  }, [isEditMode]);

  useEffect(() => {
    if (!isEditMode || !editQuestionId || !user) return;
    setLoadingExisting(true);
    fetchQuestionById(editQuestionId)
      .then((q) => {
        if (!q) {
          setError('A pergunta que você tentou editar não foi encontrada.');
          return;
        }
        if (q.authorId !== user.uid) {
          navigate('/acesso-negado', { replace: true });
          return;
        }
        setTitle(q.title);
        setBody(q.body);
        setSubjectId(q.subjectId);
        setCampusId(q.campusId || IF_BAIANO_CAMPUSES[0]);
        setCourseId(q.courseId || IF_BAIANO_COURSES[0]);
        setTagsInput(q.tags.join(', '));
        setCodeSnippet(q.codeSnippet || '');
        setReferenceUrl(q.referenceUrl || '');
        if (q.codeSnippet || q.referenceUrl) {
          setShowOptionalFields(true);
        }
      })
      .catch((err) => setError(extractFriendlyErrorMessage(err)))
      .finally(() => setLoadingExisting(false));
  }, [isEditMode, editQuestionId, user, navigate]);

  const parsedTags = parseTags(tagsInput);
  const selectedSubject = subjects.find((s) => s.id === subjectId) || subjects[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !profile) return;
    setError(null);

    const validationError = validateQuestionInput({
      title,
      body,
      subjectId,
      codeSnippet,
      referenceUrl,
      tags: parsedTags,
    });
    if (validationError) {
      return setError(validationError);
    }

    setSubmitting(true);
    try {
      if (isEditMode && editQuestionId) {
        await updateQuestionContent(editQuestionId, {
          title,
          body,
          codeSnippet,
          referenceUrl,
          subject: selectedSubject,
          campusId,
          courseId,
          tags: parsedTags,
        });
        navigate(`/pergunta/${editQuestionId}`, { replace: true });
      } else {
        const createdId = await createQuestion(profile, {
          title,
          body,
          codeSnippet,
          referenceUrl,
          subject: selectedSubject,
          campusId,
          courseId,
          tags: parsedTags,
        });
        navigate(`/pergunta/${createdId}`, { replace: true });
      }
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExisting) {
    return (
      <AppLayout pageTitle="Carregando pergunta">
        <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 text-sm text-[#B8C0BA]">
          Carregando dados da pergunta...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle={isEditMode ? 'Editar dúvida' : 'Nova dúvida'}>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to={isEditMode && editQuestionId ? `/pergunta/${editQuestionId}` : '/feed'}
            className="inline-flex items-center gap-2 text-sm text-[#B8C0BA] hover:text-[#E5EAE6] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar
          </Link>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#1B211D] border border-[#343B36]">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'edit'
                  ? 'bg-[#27864A] text-[#E5EAE6]'
                  : 'text-[#B8C0BA] hover:text-[#E5EAE6]'
              }`}
            >
              <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[#27864A] text-[#E5EAE6]'
                  : 'text-[#B8C0BA] hover:text-[#E5EAE6]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              Pré-visualizar
            </button>
          </div>
        </div>

        <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold text-[#E5EAE6]">
              {isEditMode ? 'Editar dúvida acadêmica' : 'Publicar nova dúvida'}
            </h1>
            <p className="text-sm text-[#B8C0BA]">
              Quanto mais claro o enunciado e o que você já tentou resolver, mais precisas serão as respostas.
            </p>
          </div>

          {activeTab === 'preview' ? (
            <div className="space-y-5 pt-2">
              <div className="p-5 rounded-xl bg-[#101311] border border-[#343B36] space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#52C878]">
                    {selectedSubject?.name} · {courseId}
                  </span>
                  <StatusBadge status="open" />
                </div>
                <h2 className="text-xl font-semibold text-[#E5EAE6]">
                  {sanitizeText(title) || 'Título da sua dúvida aparecerá aqui'}
                </h2>
                <p className="text-sm text-[#B8C0BA] whitespace-pre-line leading-relaxed">
                  {sanitizeText(body) || 'A descrição completa aparecerá aqui.'}
                </p>
                {codeSnippet.trim() && (
                  <pre className="p-4 rounded-lg bg-[#1B211D] border border-[#343B36] text-xs font-mono text-[#E5EAE6] overflow-x-auto">
                    <code>{codeSnippet}</code>
                  </pre>
                )}
                {referenceUrl.trim() && (
                  <p className="text-xs text-[#52C878] break-all">
                    Material de referência: {referenceUrl.trim()}
                  </p>
                )}
                {parsedTags.length > 0 && (
                  <div className="flex flex-wrap gap-3 text-xs font-mono text-[#B8C0BA]">
                    {parsedTags.map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="px-4 py-2.5 rounded-lg border border-[#343B36] text-sm font-medium text-[#E5EAE6] hover:bg-[#101311] cursor-pointer"
                >
                  Voltar à edição
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="q-title" className="block text-sm font-medium text-[#E5EAE6]">
                    Título da dúvida *
                  </label>
                  <span className="text-xs text-[#B8C0BA] tabular-nums">
                    {title.length}/{CONTENT_LIMITS.questionTitleMax}
                  </span>
                </div>
                <input
                  id="q-title"
                  type="text"
                  required
                  maxLength={CONTENT_LIMITS.questionTitleMax}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Como normalizar tabelas até a 3ª Forma Normal em SQL?"
                  className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3.5 py-2.5 text-sm text-[#E5EAE6] placeholder:text-[#B8C0BA]/50 focus:border-[#52C878] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="q-subject" className="block text-sm font-medium text-[#E5EAE6]">
                    Disciplina *
                  </label>
                  <select
                    id="q-subject"
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3 py-2.5 text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="q-course" className="block text-sm font-medium text-[#E5EAE6]">
                    Curso relacionado
                  </label>
                  <select
                    id="q-course"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
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
                  <label htmlFor="q-campus" className="block text-sm font-medium text-[#E5EAE6]">
                    Campus
                  </label>
                  <select
                    id="q-campus"
                    value={campusId}
                    onChange={(e) => setCampusId(e.target.value)}
                    className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3 py-2.5 text-sm text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
                  >
                    {IF_BAIANO_CAMPUSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="q-body" className="block text-sm font-medium text-[#E5EAE6]">
                    Descrição detalhada *
                  </label>
                  <span className="text-xs text-[#B8C0BA] tabular-nums">
                    {body.length}/{CONTENT_LIMITS.questionBodyMax}
                  </span>
                </div>
                <textarea
                  id="q-body"
                  rows={6}
                  required
                  maxLength={CONTENT_LIMITS.questionBodyMax}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Explique o enunciado da questão, em qual etapa surgiu a dúvida e o que você já tentou fazer..."
                  className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3.5 py-2.5 text-sm text-[#E5EAE6] placeholder:text-[#B8C0BA]/50 focus:border-[#52C878] focus:outline-none leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="q-tags" className="block text-sm font-medium text-[#E5EAE6]">
                    Tags (opcional, separadas por vírgula)
                  </label>
                  <span className="text-xs text-[#B8C0BA] tabular-nums">
                    {parsedTags.length}/{CONTENT_LIMITS.maxTags}
                  </span>
                </div>
                <input
                  id="q-tags"
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Ex.: sql, modelagem, 3fn"
                  className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3.5 py-2.5 text-sm text-[#E5EAE6] placeholder:text-[#B8C0BA]/50 focus:border-[#52C878] focus:outline-none"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowOptionalFields((v) => !v)}
                  className="inline-flex items-center gap-2 text-xs font-medium text-[#52C878] hover:underline cursor-pointer"
                >
                  <Code2 className="w-4 h-4" aria-hidden="true" />
                  {showOptionalFields
                    ? 'Ocultar bloco de código e link de referência'
                    : 'Adicionar trecho de código ou link de referência (opcional)'}
                </button>

                {showOptionalFields && (
                  <div className="mt-4 space-y-4 pt-4 border-t border-[#343B36]">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="q-code" className="block text-xs font-medium text-[#E5EAE6]">
                          Trecho de código ou fórmula
                        </label>
                        <span className="text-xs text-[#B8C0BA] tabular-nums">
                          {codeSnippet.length}/{CONTENT_LIMITS.codeSnippetMax}
                        </span>
                      </div>
                      <textarea
                        id="q-code"
                        rows={4}
                        maxLength={CONTENT_LIMITS.codeSnippetMax}
                        value={codeSnippet}
                        onChange={(e) => setCodeSnippet(e.target.value)}
                        placeholder="Cole aqui um trecho de código, SQL ou cálculo..."
                        className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3.5 py-2.5 text-xs font-mono text-[#E5EAE6] placeholder:text-[#B8C0BA]/50 focus:border-[#52C878] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="q-ref"
                        className="flex items-center gap-1.5 text-xs font-medium text-[#E5EAE6]"
                      >
                        <Link2 className="w-3.5 h-3.5 text-[#52C878]" aria-hidden="true" />
                        Link externo de material ou imagem (apenas HTTPS)
                      </label>
                      <input
                        id="q-ref"
                        type="url"
                        maxLength={CONTENT_LIMITS.referenceUrlMax}
                        value={referenceUrl}
                        onChange={(e) => setReferenceUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-3.5 py-2.5 text-sm text-[#E5EAE6] placeholder:text-[#B8C0BA]/50 focus:border-[#52C878] focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-lg bg-red-950/50 border border-red-700/60 text-sm text-red-200"
                >
                  {error}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <Link
                  to={isEditMode && editQuestionId ? `/pergunta/${editQuestionId}` : '/feed'}
                  className="px-4 py-2.5 rounded-lg border border-[#343B36] text-sm font-medium text-[#E5EAE6] hover:bg-[#101311] transition-colors"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting
                    ? isEditMode
                      ? 'Salvando alterações...'
                      : 'Publicando dúvida...'
                    : isEditMode
                      ? 'Salvar alterações'
                      : 'Publicar dúvida'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
