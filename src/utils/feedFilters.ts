import { Timestamp } from 'firebase/firestore';
import { FeedFilters, QuestionItem } from '../types/domain';

export function getTimestampMillis(ts: Timestamp | null | undefined): number {
  return ts ? ts.toMillis() : 0;
}

export function applyFeedFiltersClient(items: QuestionItem[], filters: FeedFilters): QuestionItem[] {
  const q = filters.searchQuery.trim().toLowerCase();
  const now = Date.now();
  let cutoffMs = 0;
  if (filters.dateRange === 'today') {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    cutoffMs = startOfDay.getTime();
  } else if (filters.dateRange === '7d') {
    cutoffMs = now - 7 * 24 * 60 * 60 * 1000;
  } else if (filters.dateRange === '30d') {
    cutoffMs = now - 30 * 24 * 60 * 60 * 1000;
  }

  return items.filter((item) => {
    if (filters.subjectId && item.subjectId !== filters.subjectId) return false;
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (filters.campus && item.campusId !== filters.campus) return false;
    if (filters.course && item.courseId !== filters.course) return false;
    if (cutoffMs > 0 && getTimestampMillis(item.createdAt) < cutoffMs) return false;

    if (q) {
      const hay = [
        item.title,
        item.body,
        item.subjectName,
        item.authorName,
        ...item.tags,
      ]
        .join(' ')
        .toLowerCase();
      const terms = q.split(/\s+/).filter(Boolean);
      const matchesAllTerms = terms.every((term) => hay.includes(term));
      if (!matchesAllTerms) return false;
    }
    return true;
  });
}
