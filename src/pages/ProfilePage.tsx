import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Flag, GraduationCap, MapPin, MessageSquare, Settings, ThumbsUp } from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { ReportModal } from '../components/ReportModal';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  fetchAnswersByAuthor,
  fetchQuestionsByAuthor,
  fetchUserProfile,
} from '../services/communityService';
import { extractFriendlyErrorMessage } from '../services/firebase';
import { AnswerItem, QuestionItem, UserProfile } from '../types/domain';
import { formatFullDate, formatRelativeDate, getInitials } from '../utils/validation';

export const ProfilePage: React.FC = () => {
  const { id: paramId } = useParams<{ id?: string }>();
  const { user, profile: ownProfile } = useAuth();
  const targetUserId = paramId || user?.uid || '';
  const isOwnProfile = Boolean(user && targetUserId === user.uid);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [answers, setAnswers] = useState<AnswerItem[]>([]);
  const [activeTab, setActiveTab] = useState<'questions' | 'answers'>('questions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!targetUserId) return;
    setLoading(true);
    setError(null);

    const profilePromise = isOwnProfile && ownProfile
      ? Promise.resolve(ownProfile)
      : fetchUserProfile(targetUserId);

    Promise.all([
      profilePromise,
      fetchQuestionsByAuthor(targetUserId),
      fetchAnswersByAuthor(targetUserId),
    ])
      .then(([pData, qList, aList]) => {
        setProfile(pData);
        setQuestions(qList);
        setAnswers(aList);
      })
      .catch((err) => setError(extractFriendlyErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [targetUserId, isOwnProfile, ownProfile]);

  const totalHelpful = useMemo(
    () => answers.reduce((acc, a) => acc + (a.helpfulCount || 0), 0),
    [answers]
  );

  if (loading) {
    return (
      <AppLayout pageTitle="Perfil">
        <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 animate-pulse space-y-4">
          <div className="h-14 w-14 rounded-xl bg-[#343B36]/60" />
          <div className="h-6 w-48 bg-[#343B36]/60 rounded" />
          <div className="h-4 w-72 bg-[#343B36]/40 rounded" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout pageTitle="Perfil não encontrado">
        <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-8 text-center space-y-4">
          <h1 className="font-display text-xl font-bold text-[#E5EAE6]">
            Perfil não encontrado
          </h1>
          <p className="text-sm text-[#B8C0BA]">
            {error || 'Não foi possível localizar o perfil solicitado.'}
          </p>
          <Link
            to="/feed"
            className="inline-flex px-4 py-2 rounded-lg bg-[#27864A] text-sm font-medium text-[#E5EAE6]"
          >
            Voltar ao feed
          </Link>
        </div>
      </AppLayout>
    );
  }

  const canSeeCampus = isOwnProfile || profile.showCampus;
  const canSeeCourse = isOwnProfile || profile.showCourse;
  const canSeeStats = isOwnProfile || profile.showStats;

  return (
    <AppLayout pageTitle="Perfil do Estudante">
      <div className="max-w-4xl space-y-6">
        {error && (
          <div role="alert" className="p-4 rounded-xl bg-red-950/50 border border-red-700/60 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Cabeçalho do Perfil */}
        <section className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-[#27864A]/20 border border-[#27864A]/50 flex items-center justify-center text-xl font-bold text-[#52C878] shrink-0">
                {getInitials(profile.displayName)}
              </div>
              <div className="space-y-1.5">
                <h1 className="font-display text-2xl font-bold text-[#E5EAE6]">
                  {profile.displayName}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#B8C0BA]">
                  {canSeeCampus && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#52C878]" aria-hidden="true" />
                      {profile.campus}
                    </span>
                  )}
                  {canSeeCourse && (
                    <span className="inline-flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-[#52C878]" aria-hidden="true" />
                      {profile.course}
                      {profile.year && profile.year !== 'Prefiro não informar'
                        ? ` · ${profile.year}`
                        : ''}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#52C878]" aria-hidden="true" />
                    Membro desde{' '}
                    {profile.createdAt
                      ? profile.createdAt.toDate().toLocaleDateString('pt-BR', {
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'recentemente'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isOwnProfile ? (
                <Link
                  to="/configuracoes"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#343B36] hover:border-[#52C878]/60 text-xs font-medium text-[#E5EAE6] transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" aria-hidden="true" />
                  Editar perfil e privacidade
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#343B36] text-xs font-medium text-[#B8C0BA] hover:text-amber-300 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                  Denunciar perfil
                </button>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="text-sm text-[#B8C0BA] leading-relaxed">{profile.bio}</p>
          )}

          {/* Estatísticas simples de participação */}
          {canSeeStats && (
            <div className="pt-4 border-t border-[#343B36] grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[#B8C0BA]">Perguntas publicadas</p>
                <p className="text-xl font-bold text-[#E5EAE6] tabular-nums mt-0.5">
                  {questions.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#B8C0BA]">Respostas enviadas</p>
                <p className="text-xl font-bold text-[#E5EAE6] tabular-nums mt-0.5">
                  {answers.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#B8C0BA]">Respostas úteis</p>
                <p className="text-xl font-bold text-[#52C878] tabular-nums mt-0.5">
                  {totalHelpful}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Histórico de contribuições públicas */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#343B36]">
            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer tabular-nums ${
                activeTab === 'questions'
                  ? 'border-[#52C878] text-[#52C878]'
                  : 'border-transparent text-[#B8C0BA] hover:text-[#E5EAE6]'
              }`}
            >
              Perguntas ({questions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('answers')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer tabular-nums ${
                activeTab === 'answers'
                  ? 'border-[#52C878] text-[#52C878]'
                  : 'border-transparent text-[#B8C0BA] hover:text-[#E5EAE6]'
              }`}
            >
              Respostas ({answers.length})
            </button>
          </div>

          {activeTab === 'questions' ? (
            questions.length === 0 ? (
              <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 text-center text-sm text-[#B8C0BA]">
                Nenhuma pergunta publicada até o momento.
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q) => (
                  <Link
                    key={q.id}
                    to={`/pergunta/${q.id}`}
                    className="block bg-[#1B211D] border border-[#343B36] hover:border-[#52C878]/50 rounded-xl p-5 transition-colors space-y-2"
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
          ) : answers.length === 0 ? (
            <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-6 text-center text-sm text-[#B8C0BA]">
              Nenhuma resposta publicada até o momento.
            </div>
          ) : (
            <div className="space-y-3">
              {answers.map((a) => (
                <Link
                  key={a.id}
                  to={`/pergunta/${a.questionId}`}
                  className="block bg-[#1B211D] border border-[#343B36] hover:border-[#52C878]/50 rounded-xl p-5 transition-colors space-y-2"
                >
                  <p className="text-sm text-[#E5EAE6] line-clamp-3 whitespace-pre-line">
                    {a.body}
                  </p>
                  <div className="flex items-center justify-between text-xs text-[#B8C0BA] tabular-nums">
                    <span>Publicada em {formatFullDate(a.createdAt)}</span>
                    <span className="inline-flex items-center gap-1 text-[#52C878]">
                      <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                      {a.helpfulCount} útil
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {user && !isOwnProfile && (
        <ReportModal
          open={reportOpen}
          reporterId={user.uid}
          targetType="profile"
          targetId={profile.id}
          targetExcerpt={profile.displayName}
          onClose={() => setReportOpen(false)}
        />
      )}
    </AppLayout>
  );
};
