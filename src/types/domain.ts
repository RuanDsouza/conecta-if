import { Timestamp } from 'firebase/firestore';

export type QuestionStatus = 'open' | 'resolved';
export type ContentVisibility = 'community' | 'removed';
export type ReportTargetType = 'question' | 'answer' | 'complement' | 'profile';
export type ReportReason = 'harassment' | 'spam' | 'inappropriate' | 'pii_exposed' | 'off_topic';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
export type NotificationType = 'new_answer' | 'new_complement' | 'helpful_answer';

export interface UserProfile {
  id: string;
  displayName: string;
  campus: string;
  course: string;
  year: string;
  bio: string;
  avatarUrl: string;
  showCampus: boolean;
  showCourse: boolean;
  showStats: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface UserPrivate {
  id: string;
  email: string;
  institutionalDomainVerified: boolean;
  acceptedTerms: boolean;
  acceptedTermsAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface SubjectItem {
  id: string;
  name: string;
  area: string;
  active: boolean;
  order: number;
}

export interface QuestionItem {
  id: string;
  authorId: string;
  authorName: string;
  authorCampus: string;
  authorCourse: string;
  authorAvatarUrl: string;
  title: string;
  body: string;
  codeSnippet: string;
  referenceUrl: string;
  subjectId: string;
  subjectName: string;
  campusId: string;
  courseId: string;
  tags: string[];
  status: QuestionStatus;
  visibility: ContentVisibility;
  answersCount: number;
  lastAnswerId: string;
  lastRemovedAnswerId: string;
  isEdited: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  lastActivityAt: Timestamp | null;
}

export interface AnswerItem {
  id: string;
  questionId: string;
  authorId: string;
  authorName: string;
  authorCampus: string;
  authorCourse: string;
  authorAvatarUrl: string;
  body: string;
  codeSnippet: string;
  helpfulCount: number;
  visibility: ContentVisibility;
  isEdited: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface AnswerComplementItem {
  id: string;
  questionId: string;
  answerId: string;
  authorId: string;
  authorName: string;
  authorRoleLabel: 'Autor da pergunta' | 'Autor da resposta';
  body: string;
  visibility: ContentVisibility;
  isEdited: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface HelpfulVoteItem {
  id: string;
  userId: string;
  answerId: string;
  questionId: string;
  answerAuthorId: string;
  createdAt: Timestamp | null;
}

export interface BookmarkItem {
  id: string;
  userId: string;
  questionId: string;
  questionTitle: string;
  subjectName: string;
  createdAt: Timestamp | null;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  actorId: string;
  actorName: string;
  type: NotificationType;
  relatedQuestionId: string;
  relatedQuestionTitle: string;
  relatedAnswerId: string;
  isRead: boolean;
  readAt?: Timestamp | null;
  createdAt: Timestamp | null;
}

export interface ReportItem {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  targetExcerpt: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  createdAt: Timestamp | null;
  reviewedBy?: string;
  reviewedAt?: Timestamp | null;
}

export interface FeedFilters {
  subjectId: string;
  status: 'all' | QuestionStatus;
  campus: string;
  course: string;
  dateRange: 'all' | 'today' | '7d' | '30d';
  sortBy: 'recent' | 'activity';
  searchQuery: string;
}
