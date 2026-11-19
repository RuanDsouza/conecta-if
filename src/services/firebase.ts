import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRÍTICO: Usar firebaseConfig.firestoreDatabaseId conforme provisionamento
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function extractFriendlyErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Ocorreu uma falha inesperada. Tente novamente.';
  }

  // Tenta extrair mensagem estruturada do FirestoreErrorInfo
  let raw = error.message;
  try {
    const parsed = JSON.parse(error.message) as Partial<FirestoreErrorInfo>;
    if (parsed && typeof parsed.error === 'string') {
      raw = parsed.error;
    }
  } catch {
    // Mensagem normal
  }

  const lower = raw.toLowerCase();
  if (lower.includes('permission') || lower.includes('insufficient')) {
    return 'Você não tem permissão para concluir esta ação ou seu e-mail ainda não foi verificado.';
  }
  if (lower.includes('quota exceeded')) {
    return 'O limite diário gratuito de leitura/gravação do banco de dados foi atingido. Tente novamente mais tarde.';
  }
  if (lower.includes('offline') || lower.includes('network') || lower.includes('unavailable')) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
  }
  if (lower.includes('not-found')) {
    return 'O registro solicitado não foi encontrado ou foi removido.';
  }
  return raw;
}

export function translateAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado. Tente entrar ou recuperar sua senha.';
    case 'auth/invalid-email':
      return 'O endereço de e-mail informado não é válido.';
    case 'auth/weak-password':
      return 'A senha escolhida é muito fraca. Utilize pelo menos 8 caracteres.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos. Confira seus dados e tente novamente.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas em sequência. Aguarde alguns minutos antes de tentar novamente.';
    case 'auth/popup-closed-by-user':
      return 'A janela de login com o Google foi fechada antes da conclusão.';
    case 'auth/popup-blocked':
      return 'O navegador bloqueou o pop-up de login. Permita pop-ups para este site e tente novamente.';
    case 'auth/operation-not-allowed':
      return 'O login com e-mail e senha ainda não está habilitado no Firebase Authentication deste projeto. Ative o provedor "E-mail/senha" no Console do Firebase ou entre com o Google.';
    case 'auth/network-request-failed':
      return 'Falha de rede ao se comunicar com a autenticação. Verifique sua internet.';
    case 'auth/requires-recent-login':
      return 'Sua sessão expirou para esta ação sensível. Entre novamente e tente de novo.';
    default:
      return error instanceof Error
        ? error.message
        : 'Não foi possível concluir a autenticação. Tente novamente.';
  }
}

export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Verifique sua configuração do Firebase: o cliente está offline.');
    }
  }
}

testConnection();
