import { Timestamp } from 'firebase/firestore';
import { APP_CONFIG, CONTENT_LIMITS } from '../config/appConfig';

export const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function sanitizeText(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

export function isInstitutionalEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex === -1) return false;
  const domain = normalized.slice(atIndex + 1);
  return APP_CONFIG.institutionalDomains.some(
    (allowed: string) => domain === allowed || domain.endsWith(`.${allowed}`)
  );
}

export function validateEmailFormat(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Informe seu e-mail.';
  if (trimmed.length < 5 || trimmed.length > 180) {
    return 'O e-mail deve ter entre 5 e 180 caracteres.';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return 'Formato de e-mail inválido.';
  }
  if (APP_CONFIG.requireStrictInstitutionalEmail && !isInstitutionalEmail(trimmed)) {
    return `Utilize um e-mail institucional válido (${APP_CONFIG.institutionalDomains.join(', ')}).`;
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Informe uma senha.';
  if (password.length < 8) {
    return 'A senha deve ter pelo menos 8 caracteres.';
  }
  if (password.length > 128) {
    return 'A senha não pode ultrapassar 128 caracteres.';
  }
  return null;
}

export function validateDisplayName(name: string): string | null {
  const clean = sanitizeText(name);
  if (clean.length < CONTENT_LIMITS.displayNameMin) {
    return `O nome de exibição deve ter pelo menos ${CONTENT_LIMITS.displayNameMin} caracteres.`;
  }
  if (clean.length > CONTENT_LIMITS.displayNameMax) {
    return `O nome de exibição não pode ultrapassar ${CONTENT_LIMITS.displayNameMax} caracteres.`;
  }
  return null;
}

export function validateQuestionInput(input: {
  title: string;
  body: string;
  subjectId: string;
  codeSnippet: string;
  referenceUrl: string;
  tags: string[];
}): string | null {
  const title = sanitizeText(input.title);
  const body = sanitizeText(input.body);
  const code = input.codeSnippet.trim();
  const url = input.referenceUrl.trim();

  if (title.length < CONTENT_LIMITS.questionTitleMin || title.length > CONTENT_LIMITS.questionTitleMax) {
    return `O título deve ter entre ${CONTENT_LIMITS.questionTitleMin} e ${CONTENT_LIMITS.questionTitleMax} caracteres.`;
  }
  if (body.length < CONTENT_LIMITS.questionBodyMin || body.length > CONTENT_LIMITS.questionBodyMax) {
    return `A descrição deve ter entre ${CONTENT_LIMITS.questionBodyMin} e ${CONTENT_LIMITS.questionBodyMax} caracteres.`;
  }
  if (!input.subjectId || !ID_PATTERN.test(input.subjectId)) {
    return 'Selecione uma disciplina válida.';
  }
  if (code.length > CONTENT_LIMITS.codeSnippetMax) {
    return `O bloco de código não pode ultrapassar ${CONTENT_LIMITS.codeSnippetMax} caracteres.`;
  }
  if (url) {
    if (url.length > CONTENT_LIMITS.referenceUrlMax) {
      return `O link de referência não pode ultrapassar ${CONTENT_LIMITS.referenceUrlMax} caracteres.`;
    }
    if (!url.startsWith('https://')) {
      return 'O link de referência deve começar com https:// por segurança.';
    }
    try {
      new URL(url);
    } catch {
      return 'Informe uma URL HTTPS válida.';
    }
  }
  if (input.tags.length > CONTENT_LIMITS.maxTags) {
    return `Adicione no máximo ${CONTENT_LIMITS.maxTags} tags.`;
  }
  for (const tag of input.tags) {
    if (tag.length < CONTENT_LIMITS.tagMin || tag.length > CONTENT_LIMITS.tagMax) {
      return `Cada tag deve ter entre ${CONTENT_LIMITS.tagMin} e ${CONTENT_LIMITS.tagMax} caracteres.`;
    }
  }
  return null;
}

export function parseTags(raw: string): string[] {
  const parts = raw
    .split(',')
    .map((item) => sanitizeText(item).toLowerCase())
    .filter(Boolean);
  const unique = Array.from(new Set(parts));
  return unique
    .map((t) => t.slice(0, CONTENT_LIMITS.tagMax))
    .slice(0, CONTENT_LIMITS.maxTags);
}

export function validateAnswerInput(body: string, codeSnippet: string): string | null {
  const clean = sanitizeText(body);
  if (clean.length < CONTENT_LIMITS.answerBodyMin || clean.length > CONTENT_LIMITS.answerBodyMax) {
    return `A resposta deve ter entre ${CONTENT_LIMITS.answerBodyMin} e ${CONTENT_LIMITS.answerBodyMax} caracteres.`;
  }
  if (codeSnippet.trim().length > CONTENT_LIMITS.codeSnippetMax) {
    return `O trecho de código não pode ultrapassar ${CONTENT_LIMITS.codeSnippetMax} caracteres.`;
  }
  return null;
}

export function validateComplementInput(body: string): string | null {
  const clean = sanitizeText(body);
  if (clean.length < CONTENT_LIMITS.complementBodyMin || clean.length > CONTENT_LIMITS.complementBodyMax) {
    return `A complementação deve ter entre ${CONTENT_LIMITS.complementBodyMin} e ${CONTENT_LIMITS.complementBodyMax} caracteres.`;
  }
  return null;
}

export function getInitials(name: string): string {
  const parts = sanitizeText(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'IF';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function formatRelativeDate(ts: Timestamp | null | undefined): string {
  if (!ts) return 'Agora mesmo';
  const date = ts.toDate();
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `há ${diffDays} d`;
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatFullDate(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateDocId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
