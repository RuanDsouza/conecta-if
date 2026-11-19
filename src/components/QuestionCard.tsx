import React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Flag, MessageSquare } from 'lucide-react';
import { QuestionItem } from '../types/domain';
import { formatRelativeDate, getInitials } from '../utils/validation';
import { StatusBadge } from './StatusBadge';

interface QuestionCardProps {
  question: QuestionItem;
  isBookmarked?: boolean;
  onToggleBookmark?: (question: QuestionItem) => void;
  onReport?: (question: QuestionItem) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  isBookmarked = false,
  onToggleBookmark,
  onReport,
}) => {
  const authorMetaParts = [question.authorCampus, question.authorCourse].filter(Boolean);

  return (
    <article className="bg-[#1B211D] border border-[#343B36] hover:border-[#52C878]/50 rounded-xl p-5 transition-colors space-y-3.5">
      {/* Linha superior limpa: Disciplina + Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-[#B8C0BA]">
          <span className="font-semibold text-[#52C878]">{question.subjectName}</span>
          {question.courseId && (
            <>
              <span aria-hidden="true">·</span>
              <span>{question.courseId}</span>
            </>
          )}
          {question.isEdited && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#B8C0BA]/80">Editada</span>
            </>
          )}
        </div>
        <StatusBadge status={question.status} />
      </div>

      {/* Título e descrição */}
      <div className="space-y-1.5">
        <h2 className="text-base sm:text-lg font-semibold text-[#E5EAE6] leading-snug">
          <Link
            to={`/pergunta/${question.id}`}
            className="hover:text-[#52C878] transition-colors"
          >
            {question.title}
          </Link>
        </h2>
        <p className="text-sm text-[#B8C0BA] leading-relaxed line-clamp-3 whitespace-pre-line">
          {question.body}
        </p>
      </div>

      {/* Tags em texto limpo sem excesso de pílulas */}
      {question.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#B8C0BA]/85 font-mono">
          {question.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      )}

      {/* Rodapé: autor, data, respostas e ações */}
      <div className="pt-3 border-t border-[#343B36] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            to={`/perfil/${question.authorId}`}
            className="w-7 h-7 rounded-md bg-[#101311] border border-[#343B36] flex items-center justify-center text-[11px] font-semibold text-[#52C878] shrink-0"
            aria-label={`Ver perfil de ${question.authorName}`}
          >
            {getInitials(question.authorName)}
          </Link>
          <div className="min-w-0 text-xs text-[#B8C0BA]">
            <Link
              to={`/perfil/${question.authorId}`}
              className="font-medium text-[#E5EAE6] hover:text-[#52C878] transition-colors"
            >
              {question.authorName}
            </Link>
            {authorMetaParts.length > 0 && (
              <span className="hidden sm:inline"> · {authorMetaParts.join(' · ')}</span>
            )}
            <span> · {formatRelativeDate(question.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={`/pergunta/${question.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E5EAE6] hover:text-[#52C878] transition-colors tabular-nums"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#52C878]" aria-hidden="true" />
            <span>
              {question.answersCount} {question.answersCount === 1 ? 'resposta' : 'respostas'}
            </span>
          </Link>

          {onToggleBookmark && (
            <button
              type="button"
              onClick={() => onToggleBookmark(question)}
              aria-label={isBookmarked ? 'Remover dos favoritos' : 'Salvar pergunta nos favoritos'}
              aria-pressed={isBookmarked}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isBookmarked
                  ? 'border-[#27864A] bg-[#27864A]/20 text-[#52C878]'
                  : 'border-[#343B36] text-[#B8C0BA] hover:text-[#E5EAE6]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}

          {onReport && (
            <button
              type="button"
              onClick={() => onReport(question)}
              aria-label="Denunciar pergunta"
              className="p-1.5 rounded-lg border border-[#343B36] text-[#B8C0BA] hover:text-amber-300 transition-colors cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
