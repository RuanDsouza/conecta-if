import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DocumentSnapshot } from 'firebase/firestore';
import {
  Bookmark,
  Filter,
  MessageSquarePlus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { QuestionCard } from '../components/QuestionCard';
import { ReportModal } from '../components/ReportModal';
import { IF_BAIANO_CAMPUSES, IF_BAIANO_COURSES } from '../config/appConfig';
import { useAuth } from '../context/AuthContext';
import {
  fetchActiveSubjects,
  fetchQuestionsPage,
  fetchUserBookmarks,
  toggleBookmark,
} from '../services/communityService';
import { extractFriendlyErrorMessage } from '../services/firebase';
import { FeedFilters, QuestionItem, SubjectItem } from '../types/domain';

const INITIAL_FILTERS: FeedFilters = {
  subjectId: '',
  status: 'all',
  campus: '',
  course: '',
  dateRange: 'all',
  sortBy: 'recent',
  searchQuery: '',
};

export const FeedPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [filters, setFilters] = useState<FeedFilters>(INITIAL_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [cursor, setCursor] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<QuestionItem | null>(null);

  useEffect(() => {
    fetchActiveSubjects()
      .then(setSubjects)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchUserBookmarks(user.uid)
      .then((list) => setBookmarkedIds(new Set(list.map((b) => b.questionId))))
      .catch(() => {});
  }, [user]);

  const loadFeed = useCallback(
    async (activeFilters: FeedFilters, nextCursor: DocumentSnapshot | null, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await fetchQuestionsPage({
          filters: activeFilters,
          cursor: nextCursor,
        });
        setQuestions((prev) => {
          if (!append) return res.items;
          const existingIds = new Set(prev.map((q) => q.id));
          const merged = [...prev];
          for (const item of res.items) {
            if (!existingIds.has(item.id)) merged.push(item);
          }
          return merged;
        });
        setCursor(res.lastDoc);
        setHasMore(res.hasMore);
      } catch (err) {
        setError(extractFriendlyErrorMessage(err));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    loadFeed(filters, null, false);
  }, [filters, loadFeed]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, searchQuery: searchInput }));
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setFilters(INITIAL_FILTERS);
  };

  const handleToggleBookmark = async (question: QuestionItem) => {
    if (!user) return;
    try {
      const saved = await toggleBookmark(user.uid, question);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (saved) next.add(question.id);
        else next.delete(question.id);
        return next;
      });
    } catch (err) {
      setError(extractFriendlyErrorMessage(err));
    }
  };

  const activeFilterLabels = useMemo(() => {
    const labels: { key: string; label: string; clear: () => void }[] = [];
    if (filters.subjectId) {
      const name = subjects.find((s) => s.id === filters.subjectId)?.name || filters.subjectId;
      labels.push({
        key: 'subject',
        label: `Disciplina: ${name}`,
        clear: () => setFilters((p) => ({ ...p, subjectId: '' })),
      });
    }
    if (filters.status !== 'all') {
      labels.push({
        key: 'status',
        label: `Status: ${filters.status === 'open' ? 'Abertas' : 'Resolvidas'}`,
        clear: () => setFilters((p) => ({ ...p, status: 'all' })),
      });
    }
    if (filters.campus) {
      labels.push({
        key: 'campus',
        label: filters.campus,
        clear: () => setFilters((p) => ({ ...p, campus: '' })),
      });
    }
    if (filters.course) {
      labels.push({
        key: 'course',
        label: filters.course,
        clear: () => setFilters((p) => ({ ...p, course: '' })),
      });
    }
    if (filters.dateRange !== 'all') {
      const map = { today: 'Hoje', '7d': 'Últimos 7 dias', '30d': 'Últimos 30 dias' };
      labels.push({
        key: 'date',
        label: `Período: ${map[filters.dateRange]}`,
        clear: () => setFilters((p) => ({ ...p, dateRange: 'all' })),
      });
    }
    if (filters.searchQuery.trim()) {
      labels.push({
        key: 'search',
        label: `Busca: "${filters.searchQuery.trim()}"`,
        clear: () => {
          setSearchInput('');
          setFilters((p) => ({ ...p, searchQuery: '' }));
        },
      });
    }
    return labels;
  }, [filters, subjects]);

  const rightRail = (
    <div className="space-y-5">
      <section className="bg-[#1B211D] border border-[#343B36] rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[#E5EAE6]">
          Atalhos por disciplina
        </h2>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setFilters((p) => ({ ...p, subjectId: '' }))}
            className={`text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filters.subjectId === ''
                ? 'bg-[#101311] text-[#52C878] border border-[#343B36]'
                : 'text-[#B8C0BA] hover:text-[#E5EAE6]'
            }`}
          >
            Todas as disciplinas
          </button>
          {subjects.slice(0, 9).map((subj) => (
            <button
              key={subj.id}
              type="button"
              onClick={() => setFilters((p) => ({ ...p, subjectId: subj.id }))}
              className={`text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filters.subjectId === subj.id
                  ? 'bg-[#101311] text-[#52C878] border border-[#343B36]'
                  : 'text-[#B8C0BA] hover:text-[#E5EAE6]'
              }`}
            >
              {subj.name}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-[#1B211D] border border-[#343B36] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#E5EAE6]">Seus favoritos</h2>
          <span className="text-xs font-mono text-[#52C878] tabular-nums">
            {bookmarkedIds.size}
          </span>
        </div>
        <p className="text-xs text-[#B8C0BA] leading-relaxed">
          Salve dúvidas importantes para revisar fórmulas, códigos ou explicações antes das avaliações.
        </p>
        <Link
          to="/minhas-atividades?aba=salvas"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#52C878] hover:underline"
        >
          <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
          Ver perguntas salvas
        </Link>
      </section>

      {profile && (
        <section className="bg-[#1B211D] border border-[#343B36] rounded-xl p-5 space-y-2">
          <h2 className="text-sm font-semibold text-[#E5EAE6]">Guia rápido de colaboração</h2>
          <ul className="text-xs text-[#B8C0BA] space-y-1.5 leading-relaxed">
            <li>• Explique o raciocínio passo a passo ao responder.</li>
            <li>• Use complementações para tirar dúvidas sobre uma resposta.</li>
            <li>• Marque sua pergunta como resolvida quando a dúvida for esclarecida.</li>
          </ul>
        </section>
      )}
    </div>
  );

  return (
    <AppLayout pageTitle="Feed Acadêmico" rightRail={rightRail}>
      <div className="space-y-6">
        {/* Cabeçalho do Feed */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#E5EAE6]">
              Dúvidas da comunidade
            </h1>
            <p className="text-sm text-[#B8C0BA]">
              Explore perguntas dos campi do IF Baiano ou compartilhe sua própria dúvida.
            </p>
          </div>
          <Link
            to="/nova-pergunta"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] transition-colors whitespace-nowrap shrink-0"
          >
            <MessageSquarePlus className="w-4 h-4" aria-hidden="true" />
            Publicar dúvida
          </Link>
        </div>

        {/* Busca e controles de filtro */}
        <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-4 space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-[#B8C0BA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por palavras no título, descrição ou #tags..."
                aria-label="Buscar perguntas"
                className="w-full rounded-lg bg-[#101311] border border-[#343B36] pl-10 pr-4 py-2.5 text-sm text-[#E5EAE6] placeholder:text-[#B8C0BA]/50 focus:border-[#52C878] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-medium text-[#E5EAE6] transition-colors cursor-pointer whitespace-nowrap"
              >
                Buscar
              </button>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((v) => !v)}
                aria-expanded={showAdvancedFilters}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  showAdvancedFilters
                    ? 'border-[#52C878] text-[#52C878] bg-[#101311]'
                    : 'border-[#343B36] text-[#E5EAE6] hover:bg-[#101311]'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                Filtros
              </button>
            </div>
          </form>

          {/* Barra rápida: Status + Ordenação */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#101311] border border-[#343B36]">
              {(
                [
                  { value: 'all', label: 'Todas' },
                  { value: 'open', label: 'Abertas' },
                  { value: 'resolved', label: 'Resolvidas' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilters((p) => ({ ...p, status: opt.value }))}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    filters.status === opt.value
                      ? 'bg-[#27864A] text-[#E5EAE6]'
                      : 'text-[#B8C0BA] hover:text-[#E5EAE6]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="feed-sort" className="text-xs text-[#B8C0BA]">
                Ordenar por:
              </label>
              <select
                id="feed-sort"
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, sortBy: e.target.value as 'recent' | 'activity' }))
                }
                className="rounded-lg bg-[#101311] border border-[#343B36] px-3 py-1.5 text-xs text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
              >
                <option value="recent">Mais recentes</option>
                <option value="activity">Atividade recente</option>
              </select>
            </div>
          </div>

          {/* Filtros avançados combináveis */}
          {showAdvancedFilters && (
            <div className="pt-4 border-t border-[#343B36] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label htmlFor="filter-subject" className="block text-xs text-[#B8C0BA]">
                  Disciplina
                </label>
                <select
                  id="filter-subject"
                  value={filters.subjectId}
                  onChange={(e) => setFilters((p) => ({ ...p, subjectId: e.target.value }))}
                  className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-2.5 py-2 text-xs text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
                >
                  <option value="">Todas as disciplinas</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="filter-campus" className="block text-xs text-[#B8C0BA]">
                  Campus
                </label>
                <select
                  id="filter-campus"
                  value={filters.campus}
                  onChange={(e) => setFilters((p) => ({ ...p, campus: e.target.value }))}
                  className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-2.5 py-2 text-xs text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
                >
                  <option value="">Todos os campi</option>
                  {IF_BAIANO_CAMPUSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="filter-course" className="block text-xs text-[#B8C0BA]">
                  Curso / Área
                </label>
                <select
                  id="filter-course"
                  value={filters.course}
                  onChange={(e) => setFilters((p) => ({ ...p, course: e.target.value }))}
                  className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-2.5 py-2 text-xs text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
                >
                  <option value="">Todos os cursos</option>
                  {IF_BAIANO_COURSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="filter-date" className="block text-xs text-[#B8C0BA]">
                  Data de publicação
                </label>
                <select
                  id="filter-date"
                  value={filters.dateRange}
                  onChange={(e) =>
                    setFilters((p) => ({
                      ...p,
                      dateRange: e.target.value as FeedFilters['dateRange'],
                    }))
                  }
                  className="w-full rounded-lg bg-[#101311] border border-[#343B36] px-2.5 py-2 text-xs text-[#E5EAE6] focus:border-[#52C878] focus:outline-none"
                >
                  <option value="all">Qualquer período</option>
                  <option value="today">Publicadas hoje</option>
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                </select>
              </div>
            </div>
          )}

          {/* Indicador de filtros ativos */}
          {activeFilterLabels.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[#B8C0BA]">
                  <Filter className="w-3.5 h-3.5 text-[#52C878]" aria-hidden="true" />
                  Filtros ativos:
                </span>
                {activeFilterLabels.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={item.clear}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#101311] border border-[#343B36] text-[#E5EAE6] hover:border-[#52C878] transition-colors cursor-pointer"
                  >
                    <span>{item.label}</span>
                    <X className="w-3 h-3 text-[#B8C0BA]" aria-hidden="true" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-[#52C878] hover:underline font-medium cursor-pointer"
              >
                Limpar todos os filtros
              </button>
            </div>
          )}
        </div>

        {/* Estado de erro */}
        {error && (
          <div
            role="alert"
            className="bg-[#1B211D] border border-red-700/60 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-red-300">
                Não foi possível carregar o feed
              </h2>
              <p className="text-xs text-[#B8C0BA]">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => loadFeed(filters, null, false)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#343B36] text-xs font-medium text-[#E5EAE6] hover:bg-[#101311] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Tentar novamente
            </button>
          </div>
        )}

        {/* Lista de perguntas / Carregamento / Estado vazio */}
        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Carregando perguntas">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-[#1B211D] border border-[#343B36] rounded-xl p-5 space-y-3 animate-pulse"
              >
                <div className="h-3.5 w-32 bg-[#343B36]/60 rounded" />
                <div className="h-5 w-3/4 bg-[#343B36]/60 rounded" />
                <div className="h-12 w-full bg-[#343B36]/40 rounded" />
                <div className="h-3.5 w-48 bg-[#343B36]/50 rounded pt-2" />
              </div>
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-[#1B211D] border border-[#343B36] rounded-xl p-8 text-center space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#E5EAE6]">
              {activeFilterLabels.length > 0
                ? 'Nenhuma dúvida encontrada com esses filtros'
                : 'Ainda não há dúvidas publicadas na comunidade'}
            </h2>
            <p className="text-sm text-[#B8C0BA] max-w-md mx-auto">
              {activeFilterLabels.length > 0
                ? 'Experimente limpar os filtros ativos ou buscar por outros termos.'
                : 'Seja o primeiro estudante do IF Baiano a compartilhar uma dúvida e iniciar a troca de conhecimento.'}
            </p>
            <div className="flex justify-center gap-3 pt-1">
              {activeFilterLabels.length > 0 ? (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2 rounded-lg border border-[#343B36] text-sm font-medium text-[#E5EAE6] hover:bg-[#101311] cursor-pointer"
                >
                  Limpar filtros
                </button>
              ) : null}
              <Link
                to="/nova-pergunta"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#27864A] hover:bg-[#2E9B56] text-sm font-semibold text-[#E5EAE6] transition-colors"
              >
                <MessageSquarePlus className="w-4 h-4" aria-hidden="true" />
                Publicar primeira dúvida
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                isBookmarked={bookmarkedIds.has(question.id)}
                onToggleBookmark={handleToggleBookmark}
                onReport={(q) => setReportTarget(q)}
              />
            ))}

            {hasMore && (
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => loadFeed(filters, cursor, true)}
                  disabled={loadingMore}
                  className="px-5 py-2.5 rounded-lg border border-[#343B36] bg-[#1B211D] hover:border-[#52C878]/60 text-sm font-medium text-[#E5EAE6] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loadingMore ? 'Carregando mais dúvidas...' : 'Carregar mais dúvidas'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {user && reportTarget && (
        <ReportModal
          open={Boolean(reportTarget)}
          reporterId={user.uid}
          targetType="question"
          targetId={reportTarget.id}
          targetExcerpt={reportTarget.title}
          onClose={() => setReportTarget(null)}
        />
      )}
    </AppLayout>
  );
};
