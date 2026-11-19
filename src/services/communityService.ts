import {
  collection,
  deleteDoc,
  doc,
  DocumentSnapshot,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  QueryConstraint,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { APP_CONFIG, CONTENT_LIMITS, DEFAULT_SUBJECTS } from '../config/appConfig';
import {
  AnswerComplementItem,
  AnswerItem,
  BookmarkItem,
  ContentVisibility,
  FeedFilters,
  NotificationItem,
  QuestionItem,
  QuestionStatus,
  ReportItem,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  SubjectItem,
  UserPrivate,
  UserProfile,
} from '../types/domain';
import { generateDocId, sanitizeText } from '../utils/validation';
import { applyFeedFiltersClient, getTimestampMillis } from '../utils/feedFilters';
import { db, handleFirestoreError, OperationType } from './firebase';

function isIndexPreconditionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('failed-precondition') || msg.includes('requires an index');
}

// ============================================================================
// PERFIS E PRIVACIDADE
// ============================================================================

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchUserPrivate(userId: string): Promise<UserPrivate | null> {
  const path = `user_private/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'user_private', userId));
    if (!snap.exists()) return null;
    return snap.data() as UserPrivate;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function checkIsAdmin(userId: string, email: string | null | undefined, emailVerified: boolean): Promise<boolean> {
  if (!emailVerified) return false;
  if (email && APP_CONFIG.adminEmails.includes(email.toLowerCase())) {
    return true;
  }
  try {
    const snap = await getDoc(doc(db, 'admins', userId));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function updateOwnProfile(
  userId: string,
  updates: {
    displayName: string;
    campus: string;
    course: string;
    year: string;
    bio: string;
    showCampus: boolean;
    showCourse: boolean;
    showStats: boolean;
  }
): Promise<void> {
  const path = `users/${userId}`;
  try {
    await updateDoc(doc(db, 'users', userId), {
      displayName: sanitizeText(updates.displayName).slice(0, CONTENT_LIMITS.displayNameMax),
      campus: sanitizeText(updates.campus).slice(0, CONTENT_LIMITS.campusMax),
      course: sanitizeText(updates.course).slice(0, CONTENT_LIMITS.courseMax),
      year: sanitizeText(updates.year).slice(0, CONTENT_LIMITS.yearMax),
      bio: sanitizeText(updates.bio).slice(0, CONTENT_LIMITS.bioMax),
      showCampus: Boolean(updates.showCampus),
      showCourse: Boolean(updates.showCourse),
      showStats: Boolean(updates.showStats),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ============================================================================
// DISCIPLINAS
// ============================================================================

export async function fetchActiveSubjects(): Promise<SubjectItem[]> {
  try {
    const q = query(collection(db, 'subjects'), where('active', '==', true));
    const snap = await getDocs(q);
    if (snap.empty) {
      return [...DEFAULT_SUBJECTS].sort((a, b) => a.order - b.order);
    }
    const remote = snap.docs.map((d) => d.data() as SubjectItem);
    const mergedMap = new Map<string, SubjectItem>();
    for (const def of DEFAULT_SUBJECTS) {
      mergedMap.set(def.id, def);
    }
    for (const item of remote) {
      mergedMap.set(item.id, item);
    }
    return Array.from(mergedMap.values())
      .filter((s) => s.active)
      .sort((a, b) => a.order - b.order);
  } catch (error) {
    if (isIndexPreconditionError(error)) {
      return [...DEFAULT_SUBJECTS].sort((a, b) => a.order - b.order);
    }
    // Se não houver leitura ainda ou erro transitório, retorna padrão com registro de erro se for permissão
    if (error instanceof Error && error.message.toLowerCase().includes('permission')) {
      handleFirestoreError(error, OperationType.LIST, 'subjects');
    }
    return [...DEFAULT_SUBJECTS].sort((a, b) => a.order - b.order);
  }
}

export async function saveSubjectAdmin(subject: SubjectItem): Promise<void> {
  const path = `subjects/${subject.id}`;
  try {
    await setDoc(doc(db, 'subjects', subject.id), {
      id: subject.id,
      name: sanitizeText(subject.name).slice(0, 80),
      area: sanitizeText(subject.area).slice(0, 80),
      active: Boolean(subject.active),
      order: Number(subject.order) || 50,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ============================================================================
// PERGUNTAS (FEED, PAGINAÇÃO, CRIAÇÃO, EDIÇÃO, EXCLUSÃO EM CASCATA)
// ============================================================================

export interface PaginatedQuestionsResult {
  items: QuestionItem[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export async function fetchQuestionsPage(options: {
  filters: FeedFilters;
  cursor?: DocumentSnapshot | null;
  pageSize?: number;
}): Promise<PaginatedQuestionsResult> {
  const { filters, cursor = null, pageSize = APP_CONFIG.feedPageSize } = options;
  const sortField = filters.sortBy === 'activity' ? 'lastActivityAt' : 'createdAt';
  const hasClientRefinement =
    Boolean(filters.subjectId) ||
    filters.status !== 'all' ||
    Boolean(filters.campus) ||
    Boolean(filters.course) ||
    filters.dateRange !== 'all' ||
    Boolean(filters.searchQuery.trim());

  // Quando há filtros combinados/busca textual, carregamos lote maior incremental para filtrar com precisão
  const batchLimit = hasClientRefinement ? Math.max(pageSize * 3, 30) : pageSize + 1;

  try {
    const constraints: QueryConstraint[] = [
      where('visibility', '==', 'community'),
      orderBy(sortField, 'desc'),
    ];
    if (cursor) {
      constraints.push(startAfter(cursor));
    }
    constraints.push(limit(batchLimit));

    const snap = await getDocs(query(collection(db, 'questions'), ...constraints));
    const docs = snap.docs;
    const hasMore = docs.length >= batchLimit;
    const slicedDocs = !hasClientRefinement && docs.length > pageSize ? docs.slice(0, pageSize) : docs;
    const items = applyFeedFiltersClient(
      slicedDocs.map((d) => d.data() as QuestionItem),
      filters
    );

    return {
      items,
      lastDoc: slicedDocs.length > 0 ? slicedDocs[slicedDocs.length - 1] : cursor,
      hasMore,
    };
  } catch (error) {
    if (isIndexPreconditionError(error)) {
      // Fallback seguro quando o índice composto ainda não estiver provisionado
      try {
        const snap = await getDocs(
          query(collection(db, 'questions'), where('visibility', '==', 'community'), limit(50))
        );
        const allItems = snap.docs.map((d) => d.data() as QuestionItem);
        allItems.sort((a, b) => {
          const aTime = getTimestampMillis(filters.sortBy === 'activity' ? a.lastActivityAt : a.createdAt);
          const bTime = getTimestampMillis(filters.sortBy === 'activity' ? b.lastActivityAt : b.createdAt);
          return bTime - aTime;
        });
        return {
          items: applyFeedFiltersClient(allItems, filters),
          lastDoc: null,
          hasMore: false,
        };
      } catch (fallbackErr) {
        handleFirestoreError(fallbackErr, OperationType.LIST, 'questions');
      }
    }
    handleFirestoreError(error, OperationType.LIST, 'questions');
  }
}

export async function fetchQuestionById(questionId: string): Promise<QuestionItem | null> {
  const path = `questions/${questionId}`;
  try {
    const snap = await getDoc(doc(db, 'questions', questionId));
    if (!snap.exists()) return null;
    return snap.data() as QuestionItem;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createQuestion(
  author: UserProfile,
  payload: {
    title: string;
    body: string;
    codeSnippet: string;
    referenceUrl: string;
    subject: SubjectItem;
    campusId: string;
    courseId: string;
    tags: string[];
  }
): Promise<string> {
  const id = generateDocId();
  const path = `questions/${id}`;
  try {
    await setDoc(doc(db, 'questions', id), {
      id,
      authorId: author.id,
      authorName: author.displayName.slice(0, CONTENT_LIMITS.displayNameMax),
      authorCampus: author.showCampus ? author.campus.slice(0, CONTENT_LIMITS.campusMax) : '',
      authorCourse: author.showCourse ? author.course.slice(0, CONTENT_LIMITS.courseMax) : '',
      authorAvatarUrl: author.avatarUrl || '',
      title: sanitizeText(payload.title).slice(0, CONTENT_LIMITS.questionTitleMax),
      body: sanitizeText(payload.body).slice(0, CONTENT_LIMITS.questionBodyMax),
      codeSnippet: payload.codeSnippet.trim().slice(0, CONTENT_LIMITS.codeSnippetMax),
      referenceUrl: payload.referenceUrl.trim().slice(0, CONTENT_LIMITS.referenceUrlMax),
      subjectId: payload.subject.id,
      subjectName: payload.subject.name,
      campusId: sanitizeText(payload.campusId).slice(0, CONTENT_LIMITS.campusMax),
      courseId: sanitizeText(payload.courseId).slice(0, CONTENT_LIMITS.courseMax),
      tags: payload.tags.slice(0, CONTENT_LIMITS.maxTags),
      status: 'open',
      visibility: 'community',
      answersCount: 0,
      lastAnswerId: '',
      lastRemovedAnswerId: '',
      isEdited: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateQuestionContent(
  questionId: string,
  payload: {
    title: string;
    body: string;
    codeSnippet: string;
    referenceUrl: string;
    subject: SubjectItem;
    campusId: string;
    courseId: string;
    tags: string[];
  }
): Promise<void> {
  const path = `questions/${questionId}`;
  try {
    await updateDoc(doc(db, 'questions', questionId), {
      title: sanitizeText(payload.title).slice(0, CONTENT_LIMITS.questionTitleMax),
      body: sanitizeText(payload.body).slice(0, CONTENT_LIMITS.questionBodyMax),
      codeSnippet: payload.codeSnippet.trim().slice(0, CONTENT_LIMITS.codeSnippetMax),
      referenceUrl: payload.referenceUrl.trim().slice(0, CONTENT_LIMITS.referenceUrlMax),
      subjectId: payload.subject.id,
      subjectName: payload.subject.name,
      campusId: sanitizeText(payload.campusId).slice(0, CONTENT_LIMITS.campusMax),
      courseId: sanitizeText(payload.courseId).slice(0, CONTENT_LIMITS.courseMax),
      tags: payload.tags.slice(0, CONTENT_LIMITS.maxTags),
      isEdited: true,
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateQuestionStatus(questionId: string, status: QuestionStatus): Promise<void> {
  const path = `questions/${questionId}`;
  try {
    await updateDoc(doc(db, 'questions', questionId), {
      status,
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteQuestionCascade(questionId: string, currentUserId: string): Promise<void> {
  const path = `questions/${questionId}`;
  try {
    const [answersSnap, complementsSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, 'answers'),
          where('visibility', '==', 'community'),
          where('questionId', '==', questionId)
        )
      ),
      getDocs(
        query(
          collection(db, 'complements'),
          where('visibility', '==', 'community'),
          where('questionId', '==', questionId)
        )
      ),
    ]);

    const refsToDelete = [
      ...complementsSnap.docs.map((d) => d.ref),
      ...answersSnap.docs.map((d) => d.ref),
    ];

    // Remove também favorito do próprio autor se existir
    const ownBookmarkRef = doc(db, 'bookmarks', `${currentUserId}_${questionId}`);
    const ownBookmarkSnap = await getDoc(ownBookmarkRef);
    if (ownBookmarkSnap.exists()) {
      refsToDelete.push(ownBookmarkRef);
    }

    // Divide em lotes de até 400 operações antes de excluir a pergunta pai
    for (let i = 0; i < refsToDelete.length; i += 400) {
      const chunk = refsToDelete.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    await deleteDoc(doc(db, 'questions', questionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// RESPOSTAS E COMPLEMENTAÇÕES
// ============================================================================

export async function fetchAnswersForQuestion(questionId: string): Promise<AnswerItem[]> {
  try {
    const q = query(
      collection(db, 'answers'),
      where('visibility', '==', 'community'),
      where('questionId', '==', questionId),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AnswerItem);
  } catch (error) {
    if (isIndexPreconditionError(error)) {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'answers'),
            where('visibility', '==', 'community'),
            where('questionId', '==', questionId)
          )
        );
        return snap.docs
          .map((d) => d.data() as AnswerItem)
          .sort((a, b) => getTimestampMillis(a.createdAt) - getTimestampMillis(b.createdAt));
      } catch (fallbackErr) {
        handleFirestoreError(fallbackErr, OperationType.LIST, 'answers');
      }
    }
    handleFirestoreError(error, OperationType.LIST, 'answers');
  }
}

export async function fetchComplementsForQuestion(questionId: string): Promise<AnswerComplementItem[]> {
  try {
    const q = query(
      collection(db, 'complements'),
      where('visibility', '==', 'community'),
      where('questionId', '==', questionId),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AnswerComplementItem);
  } catch (error) {
    if (isIndexPreconditionError(error)) {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'complements'),
            where('visibility', '==', 'community'),
            where('questionId', '==', questionId)
          )
        );
        return snap.docs
          .map((d) => d.data() as AnswerComplementItem)
          .sort((a, b) => getTimestampMillis(a.createdAt) - getTimestampMillis(b.createdAt));
      } catch (fallbackErr) {
        handleFirestoreError(fallbackErr, OperationType.LIST, 'complements');
      }
    }
    handleFirestoreError(error, OperationType.LIST, 'complements');
  }
}

export async function createAnswer(
  author: UserProfile,
  question: QuestionItem,
  payload: { body: string; codeSnippet: string }
): Promise<string> {
  const answerId = generateDocId();
  const path = `answers/${answerId}`;
  try {
    // Lê contagem mais atual da pergunta para garantir writeBatch consistente
    const qSnap = await getDoc(doc(db, 'questions', question.id));
    if (!qSnap.exists()) {
      throw new Error('A pergunta não existe mais.');
    }
    const latestQ = qSnap.data() as QuestionItem;
    if (latestQ.status !== 'open') {
      throw new Error('Esta pergunta foi marcada como resolvida e não aceita novas respostas no momento.');
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'answers', answerId), {
      id: answerId,
      questionId: question.id,
      authorId: author.id,
      authorName: author.displayName.slice(0, CONTENT_LIMITS.displayNameMax),
      authorCampus: author.showCampus ? author.campus.slice(0, CONTENT_LIMITS.campusMax) : '',
      authorCourse: author.showCourse ? author.course.slice(0, CONTENT_LIMITS.courseMax) : '',
      authorAvatarUrl: author.avatarUrl || '',
      body: sanitizeText(payload.body).slice(0, CONTENT_LIMITS.answerBodyMax),
      codeSnippet: payload.codeSnippet.trim().slice(0, CONTENT_LIMITS.codeSnippetMax),
      helpfulCount: 0,
      visibility: 'community',
      isEdited: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'questions', question.id), {
      answersCount: latestQ.answersCount + 1,
      lastAnswerId: answerId,
      lastActivityAt: serverTimestamp(),
    });

    if (latestQ.authorId !== author.id) {
      const notifId = generateDocId();
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        recipientId: latestQ.authorId,
        actorId: author.id,
        actorName: author.displayName.slice(0, CONTENT_LIMITS.displayNameMax),
        type: 'new_answer',
        relatedQuestionId: question.id,
        relatedQuestionTitle: latestQ.title.slice(0, CONTENT_LIMITS.questionTitleMax),
        relatedAnswerId: answerId,
        isRead: false,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return answerId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateAnswer(
  answerId: string,
  payload: { body: string; codeSnippet: string }
): Promise<void> {
  const path = `answers/${answerId}`;
  try {
    await updateDoc(doc(db, 'answers', answerId), {
      body: sanitizeText(payload.body).slice(0, CONTENT_LIMITS.answerBodyMax),
      codeSnippet: payload.codeSnippet.trim().slice(0, CONTENT_LIMITS.codeSnippetMax),
      isEdited: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAnswerCascade(answer: AnswerItem): Promise<void> {
  const path = `answers/${answer.id}`;
  try {
    const [qSnap, complementsSnap] = await Promise.all([
      getDoc(doc(db, 'questions', answer.questionId)),
      getDocs(
        query(
          collection(db, 'complements'),
          where('visibility', '==', 'community'),
          where('answerId', '==', answer.id)
        )
      ),
    ]);

    const batch = writeBatch(db);
    complementsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'answers', answer.id));

    if (qSnap.exists()) {
      const qData = qSnap.data() as QuestionItem;
      if (qData.answersCount >= 1) {
        batch.update(doc(db, 'questions', answer.questionId), {
          answersCount: qData.answersCount - 1,
          lastRemovedAnswerId: answer.id,
        });
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createComplement(
  author: UserProfile,
  question: QuestionItem,
  answer: AnswerItem,
  body: string
): Promise<string> {
  const complementId = generateDocId();
  const path = `complements/${complementId}`;
  const isAnswerAuthor = answer.authorId === author.id;
  const authorRoleLabel: 'Autor da resposta' | 'Autor da pergunta' = isAnswerAuthor
    ? 'Autor da resposta'
    : 'Autor da pergunta';

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'complements', complementId), {
      id: complementId,
      questionId: question.id,
      answerId: answer.id,
      authorId: author.id,
      authorName: author.displayName.slice(0, CONTENT_LIMITS.displayNameMax),
      authorRoleLabel,
      body: sanitizeText(body).slice(0, CONTENT_LIMITS.complementBodyMax),
      visibility: 'community',
      isEdited: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Notifica a outra parte envolvida na discussão
    const recipientId = isAnswerAuthor ? question.authorId : answer.authorId;
    if (recipientId !== author.id) {
      const notifId = generateDocId();
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        recipientId,
        actorId: author.id,
        actorName: author.displayName.slice(0, CONTENT_LIMITS.displayNameMax),
        type: 'new_complement',
        relatedQuestionId: question.id,
        relatedQuestionTitle: question.title.slice(0, CONTENT_LIMITS.questionTitleMax),
        relatedAnswerId: answer.id,
        isRead: false,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return complementId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateComplement(complementId: string, body: string): Promise<void> {
  const path = `complements/${complementId}`;
  try {
    await updateDoc(doc(db, 'complements', complementId), {
      body: sanitizeText(body).slice(0, CONTENT_LIMITS.complementBodyMax),
      isEdited: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteComplement(complementId: string): Promise<void> {
  const path = `complements/${complementId}`;
  try {
    await deleteDoc(doc(db, 'complements', complementId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// MARCAÇÕES DE RESPOSTA ÚTIL E FAVORITOS
// ============================================================================

export async function fetchUserHelpfulVoteIds(userId: string): Promise<Set<string>> {
  try {
    const snap = await getDocs(
      query(collection(db, 'helpful_votes'), where('userId', '==', userId))
    );
    const set = new Set<string>();
    snap.docs.forEach((d) => {
      const data = d.data() as { answerId: string };
      set.add(data.answerId);
    });
    return set;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'helpful_votes');
  }
}

export async function toggleHelpfulVote(
  user: UserProfile,
  question: QuestionItem,
  answer: AnswerItem
): Promise<boolean> {
  const voteId = `${answer.id}_${user.id}`;
  const voteRef = doc(db, 'helpful_votes', voteId);
  const answerRef = doc(db, 'answers', answer.id);

  try {
    const [voteSnap, answerSnap] = await Promise.all([getDoc(voteRef), getDoc(answerRef)]);
    if (!answerSnap.exists()) {
      throw new Error('Resposta não encontrada.');
    }
    const latestAnswer = answerSnap.data() as AnswerItem;
    const batch = writeBatch(db);

    if (voteSnap.exists()) {
      batch.delete(voteRef);
      batch.update(answerRef, {
        helpfulCount: Math.max(0, latestAnswer.helpfulCount - 1),
      });
      await batch.commit();
      return false;
    } else {
      batch.set(voteRef, {
        id: voteId,
        userId: user.id,
        answerId: answer.id,
        questionId: question.id,
        answerAuthorId: answer.authorId,
        createdAt: serverTimestamp(),
      });
      batch.update(answerRef, {
        helpfulCount: latestAnswer.helpfulCount + 1,
      });

      if (answer.authorId !== user.id) {
        const notifId = generateDocId();
        batch.set(doc(db, 'notifications', notifId), {
          id: notifId,
          recipientId: answer.authorId,
          actorId: user.id,
          actorName: user.displayName.slice(0, CONTENT_LIMITS.displayNameMax),
          type: 'helpful_answer',
          relatedQuestionId: question.id,
          relatedQuestionTitle: question.title.slice(0, CONTENT_LIMITS.questionTitleMax),
          relatedAnswerId: answer.id,
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();
      return true;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `helpful_votes/${voteId}`);
  }
}

export async function fetchUserBookmarks(userId: string): Promise<BookmarkItem[]> {
  try {
    const q = query(
      collection(db, 'bookmarks'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as BookmarkItem);
  } catch (error) {
    if (isIndexPreconditionError(error)) {
      try {
        const snap = await getDocs(
          query(collection(db, 'bookmarks'), where('userId', '==', userId))
        );
        return snap.docs
          .map((d) => d.data() as BookmarkItem)
          .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
      } catch (fallbackErr) {
        handleFirestoreError(fallbackErr, OperationType.LIST, 'bookmarks');
      }
    }
    handleFirestoreError(error, OperationType.LIST, 'bookmarks');
  }
}

export async function isQuestionBookmarked(userId: string, questionId: string): Promise<boolean> {
  const bookmarkId = `${userId}_${questionId}`;
  try {
    const snap = await getDoc(doc(db, 'bookmarks', bookmarkId));
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `bookmarks/${bookmarkId}`);
  }
}

export async function toggleBookmark(userId: string, question: QuestionItem): Promise<boolean> {
  const bookmarkId = `${userId}_${question.id}`;
  const ref = doc(db, 'bookmarks', bookmarkId);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await deleteDoc(ref);
      return false;
    }
    await setDoc(ref, {
      id: bookmarkId,
      userId,
      questionId: question.id,
      questionTitle: question.title.slice(0, CONTENT_LIMITS.questionTitleMax),
      subjectName: question.subjectName,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `bookmarks/${bookmarkId}`);
  }
}

// ============================================================================
// HISTÓRICO DO ESTUDANTE (PERFIL E MINHAS ATIVIDADES)
// ============================================================================

export async function fetchQuestionsByAuthor(authorId: string): Promise<QuestionItem[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'questions'),
        where('visibility', '==', 'community'),
        where('authorId', '==', authorId)
      )
    );
    return snap.docs
      .map((d) => d.data() as QuestionItem)
      .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'questions');
  }
}

export async function fetchAnswersByAuthor(authorId: string): Promise<AnswerItem[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'answers'),
        where('visibility', '==', 'community'),
        where('authorId', '==', authorId)
      )
    );
    return snap.docs
      .map((d) => d.data() as AnswerItem)
      .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'answers');
  }
}

// ============================================================================
// NOTIFICAÇÕES
// ============================================================================

export async function fetchUserNotifications(userId: string): Promise<NotificationItem[]> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as NotificationItem);
  } catch (error) {
    if (isIndexPreconditionError(error)) {
      try {
        const snap = await getDocs(
          query(collection(db, 'notifications'), where('recipientId', '==', userId), limit(50))
        );
        return snap.docs
          .map((d) => d.data() as NotificationItem)
          .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
      } catch (fallbackErr) {
        handleFirestoreError(fallbackErr, OperationType.LIST, 'notifications');
      }
    }
    handleFirestoreError(error, OperationType.LIST, 'notifications');
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      isRead: true,
      readAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markAllNotificationsAsRead(notifications: NotificationItem[]): Promise<void> {
  const unread = notifications.filter((n) => !n.isRead);
  if (unread.length === 0) return;
  try {
    const batch = writeBatch(db);
    unread.slice(0, 400).forEach((item) => {
      batch.update(doc(db, 'notifications', item.id), {
        isRead: true,
        readAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'notifications');
  }
}

// ============================================================================
// DENÚNCIAS E MODERAÇÃO
// ============================================================================

export async function submitReport(payload: {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  targetExcerpt: string;
  reason: ReportReason;
  description: string;
}): Promise<void> {
  const reportId = `${payload.reporterId}_${payload.targetType}_${payload.targetId}`.slice(0, 250);
  const path = `reports/${reportId}`;
  try {
    const existingSnap = await getDoc(doc(db, 'reports', reportId));
    if (existingSnap.exists()) {
      throw new Error('Você já enviou uma denúncia para este conteúdo.');
    }
    await setDoc(doc(db, 'reports', reportId), {
      id: reportId,
      reporterId: payload.reporterId,
      targetType: payload.targetType,
      targetId: payload.targetId,
      targetExcerpt: sanitizeText(payload.targetExcerpt).slice(0, 200) || 'Conteúdo denunciado',
      reason: payload.reason,
      description: sanitizeText(payload.description).slice(0, CONTENT_LIMITS.reportDescMax),
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Você já enviou')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchReportsAdmin(): Promise<ReportItem[]> {
  try {
    const snap = await getDocs(collection(db, 'reports'));
    return snap.docs
      .map((d) => d.data() as ReportItem)
      .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'reports');
  }
}

export async function reviewReportAdmin(
  reportId: string,
  adminUid: string,
  status: ReportStatus
): Promise<void> {
  const path = `reports/${reportId}`;
  try {
    await updateDoc(doc(db, 'reports', reportId), {
      status,
      reviewedBy: adminUid,
      reviewedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function moderateContentVisibilityAdmin(
  targetType: 'question' | 'answer' | 'complement',
  targetId: string,
  visibility: ContentVisibility
): Promise<void> {
  const colName =
    targetType === 'question' ? 'questions' : targetType === 'answer' ? 'answers' : 'complements';
  const path = `${colName}/${targetId}`;
  try {
    await updateDoc(doc(db, colName, targetId), {
      visibility,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
