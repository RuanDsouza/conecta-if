import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bookmark, MessageSquare, MessageSquarePlus, ThumbsUp } from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  fetchAnswersByAuthor,
  fetchQuestionsByAuthor,
  fetchUserBookmarks,
  toggleBookmark,
} from '../services/communityService';
import { extractFriendlyErrorMessage } from '../services/firebase';
import { AnswerItem, BookmarkItem, QuestionItem } from '../types/domain';
import { formatFullDate, formatRelativeDate } from '../utils/validation';

export const MyActivityPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab =
    searchParams.get('aba') === 'respostas'
      ? 'respostas'
      : searchParams.get('aba') === 'salvas'
        ? 'salvas'
        : 'perguntas';

  const [tab, setTab] = useState<'perguntas' | 'respostas' | 'salvas'>(initialTab);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [answers, setAnswers] = useState<AnswerItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchQuestionsByAuthor(user.uid),
      fetchAnswersByAuthor(user.uid),
      fetchUserBookmarks(user.uid),
    ])
      .then(([qList, aList, bList]) => {
        setQuestions(qList);
        setAnswers(aList);
        setBookmarks(bList);
      })
      .catch((err) => setError(extractFriendlyErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [user]);

  const switchTab = (next: 'perguntas' | 'respostas' | 'salvas') => {
    setTab(next);
    setSearchParams({ aba: next });
  };

  const handleRemoveBookmark = async (b: BookmarkItem) => {
    if (!user) return;
    try {
      await toggleBookmark(user.uid, {
        id: b.questionId,
        title: b.questionTitle,
        subjectName: b.subjectName,
      } as QuestionItem);
      setBookmarks((prev) => prev.filter((item) => item.id !== b.id));
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    }
  };

  return (
    <AppLayout pageTitle="Minhas Atividades">
      <div className="max-w-4xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#E5EAE6]">
              Minhas atividades acadêmicas
            </h1>
            <p className="text-sm text-[#B8C0BA]">
              Acompanhe suas dúvidas, respostas enviadas e perguntas salvas para revisão.
            </p>
          </div>
          <Link
            to="/nova-pergunta"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] whitespace-nowrap shrink-0"
          >
            <MessageSquarePlus className="w-4 h-4" aria-hidden="true" />
            Nova dúvida
          </Link>
        </div>

        {error && (
          <div role="alert" className="p-4 rounded-xl bg-red-950/50 border border-red-700/60 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-[#343B36] overflow-x-auto">
          <button
            type="button"
            onClick={() => switchTab('perguntas')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap cursor-pointer tabular-nums ${
              tab === 'perguntas'
                ? 'border-[#52C878] text-[#52C878]'
                : 'border-transparent text-[#B8C0BA] hover:text-[#E5EAE6]'
            }`}
          >
            Minhas perguntas ({questions.length})
          </button>
          <button
            type="button"
            onClick={() => switchTab('respostas')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap cursor-pointer tabular-nums ${
              tab === 'respostas'
                ? 'border-[#52C878] text-[#52C878]'
                : 'border-transparent text-[#B8C0BA] hover:text-[#E5EAE6]'
            }`}
          >
            Minhas respostas ({answers.length})
          </button>
          <button
            type="button"
            onClick={() => switchTab('salvas')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap cursor-pointer tabular-nums ${
              tab === 'salvas'
                ? 'border-[#52C878] text-[#52C878]'
                : 'border-transparent text-[#B8C0BA] hover:text-[#E5EAE6]'
            }`}
          >
            Salvas ({bookmarks.length})
          </button>
        </div>

        {loading ? (
          <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 text-sm text-[#B8C0BA]">
            Carregando seu histórico...
          </div>
        ) : tab === 'perguntas' ? (
          questions.length === 0 ? (
            <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-8 text-center space-y-3">
              <p className="text-sm text-[#B8C0BA]">
                Você ainda não publicou nenhuma dúvida.
              </p>
              <Link
                to="/nova-pergunta"
                className="inline-flex px-4 py-2 rounded-lg bg-[#27864A] text-sm font-semibold text-[#E5EAE6]"
              >
                Publicar primeira dúvida
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q) => (
                <Link
                  key={q.id}
                  to={`/pergunta/${q.id}`}
                  className="block bg-[#1B211D] border border-[#343B36] hover:border-[#52C878]/50 rounded-xl p-5 space-y-2 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#52C878]">{q.subjectName}</span>
                    <StatusBadge status={q.status} />
                  </div>
                  <h2 className="text-base font-semibold text-[#E5EAE6]">{q.title}</h2>
                  <div className="flex items-center gap-3 text-xs text-[#B8C0BA] tabular-nums">
                    <span>{formatRelativeDate(q.createdAt)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                      {q.answersCount} respostas
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : tab === 'respostas' ? (
          answers.length === 0 ? (
            <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-8 text-center text-sm text-[#B8C0BA]">
              Você ainda não respondeu nenhuma dúvida na comunidade.
            </div>
          ) : (
            <div className="space-y-3">
              {answers.map((a) => (
                <Link
                  key={a.id}
                  to={`/pergunta/${a.questionId}`}
                  className="block bg-[#1B211D] border border-[#343B36] hover:border-[#52C878]/50 rounded-xl p-5 space-y-2 transition-colors"
                >
                  <p className="text-sm text-[#E5EAE6] line-clamp-3 whitespace-pre-line">
                    {a.body}
                  </p>
                  <div className="flex items-center justify-between text-xs text-[#B8C0BA] tabular-nums">
                    <span>Enviada em {formatFullDate(a.createdAt)}</span>
                    <span className="inline-flex items-center gap-1 text-[#52C878]">
                      <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                      {a.helpfulCount} útil
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : bookmarks.length === 0 ? (
          <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-8 text-center text-sm text-[#B8C0BA]">
            Você ainda não salvou nenhuma dúvida nos favoritos.
          </div>
        ) : (
          <div className="space-y-3">
            {bookmarks.map((b) => (
              <div
                key={b.id}
                className="bg-[#1B211D] border border-[#343B36] rounded-xl p-5 flex items-center justify-between gap-4"
              >
                <Link to={`/pergunta/${b.questionId}`} className="min-w-0 space-y-1">
                  <p className="text-xs font-semibold text-[#52C878]">{b.subjectName}</p>
                  <h2 className="text-base font-semibold text-[#E5EAE6] hover:text-[#52C878] truncate">
                    {b.questionTitle}
                  </h2>
                  <p className="text-xs text-[#B8C0BA]">
                    Salva {formatRelativeDate(b.createdAt)}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => handleRemoveBookmark(b)}
                  aria-label="Remover dos favoritos"
                  className="p-2 rounded-lg border border-[#27864A] bg-[#27864A]/20 text-[#52C878] hover:bg-[#27864A]/30 cursor-pointer shrink-0"
                >
                  <Bookmark className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
