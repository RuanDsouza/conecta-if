import { SubjectItem } from '../types/domain';

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export const APP_CONFIG = {
  brandName: env.VITE_APP_NAME || 'Conecta IF',
  institutionShort: 'IF Baiano',
  institutionFull: 'Instituto Federal de Educação, Ciência e Tecnologia Baiano',
  // Domínios institucionais configuráveis (os campi podem usar subdomínios ou domínio geral)
  institutionalDomains: (
    env.VITE_INSTITUTIONAL_DOMAINS ||
    'ifbaiano.edu.br,estudante.ifbaiano.edu.br,aluno.ifbaiano.edu.br'
  )
    .split(',')
    .map((d: string) => d.trim().toLowerCase())
    .filter(Boolean) as string[],
  // Se true, impede cadastro sem domínio institucional; se false, aceita outros e-mails mas sinaliza verificação institucional
  requireStrictInstitutionalEmail:
    env.VITE_STRICT_INSTITUTIONAL_EMAIL === 'true',
  adminEmails: ['ruanferreira1342008@gmail.com'] as string[],
  feedPageSize: 10,
} as const;

export const CONTENT_LIMITS = {
  displayNameMin: 2,
  displayNameMax: 80,
  campusMin: 2,
  campusMax: 100,
  courseMin: 2,
  courseMax: 120,
  yearMax: 40,
  bioMax: 300,
  questionTitleMin: 10,
  questionTitleMax: 150,
  questionBodyMin: 20,
  questionBodyMax: 5000,
  codeSnippetMax: 2500,
  referenceUrlMax: 400,
  maxTags: 5,
  tagMin: 1,
  tagMax: 30,
  answerBodyMin: 10,
  answerBodyMax: 5000,
  complementBodyMin: 5,
  complementBodyMax: 2000,
  reportDescMax: 600,
} as const;

export const IF_BAIANO_CAMPUSES: string[] = [
  'Campus Alagoinhas',
  'Campus Bom Jesus da Lapa',
  'Campus Catu',
  'Campus Governador Mangabeira',
  'Campus Guanambi',
  'Campus Itaberaba',
  'Campus Itapetinga',
  'Campus Santa Inês',
  'Campus Senhor do Bonfim',
  'Campus Serrinha',
  'Campus Teixeira de Freitas',
  'Campus Uruçuca',
  'Campus Valença',
  'Campus Xique-Xique',
  'Outro / Polo EaD',
];

export const IF_BAIANO_COURSES: string[] = [
  'Técnico em Informática',
  'Técnico em Agropecuária',
  'Técnico em Alimentos',
  'Técnico em Química',
  'Técnico em Meio Ambiente',
  'Técnico em Zootecnia',
  'Técnico em Administração',
  'Análise e Desenvolvimento de Sistemas',
  'Engenharia Agronômica',
  'Licenciatura em Ciências Biológicas',
  'Licenciatura em Química',
  'Licenciatura em Matemática',
  'Medicina Veterinária',
  'Sistemas de Informação',
  'Ensino Médio Integrado',
  'Outro Curso',
];

export const IF_BAIANO_YEARS: string[] = [
  '1º ano / 1º semestre',
  '2º ano / 2º semestre',
  '3º ano / 3º semestre',
  '4º ano / 4º semestre',
  '5º semestre ou superior',
  'Egresso / Monitor',
  'Prefiro não informar',
];

export const DEFAULT_SUBJECTS: SubjectItem[] = [
  { id: 'matematica', name: 'Matemática', area: 'Ciências Exatas', active: true, order: 1 },
  { id: 'lingua-portuguesa', name: 'Língua Portuguesa', area: 'Linguagens', active: true, order: 2 },
  { id: 'fisica', name: 'Física', area: 'Ciências Exatas', active: true, order: 3 },
  { id: 'quimica', name: 'Química', area: 'Ciências da Natureza', active: true, order: 4 },
  { id: 'biologia', name: 'Biologia', area: 'Ciências da Natureza', active: true, order: 5 },
  { id: 'historia', name: 'História', area: 'Ciências Humanas', active: true, order: 6 },
  { id: 'geografia', name: 'Geografia', area: 'Ciências Humanas', active: true, order: 7 },
  { id: 'ingles', name: 'Inglês', area: 'Linguagens', active: true, order: 8 },
  { id: 'informatica-programacao', name: 'Informática e Programação', area: 'Tecnologia', active: true, order: 9 },
  { id: 'redes-computadores', name: 'Redes de Computadores', area: 'Tecnologia', active: true, order: 10 },
  { id: 'banco-de-dados', name: 'Banco de Dados', area: 'Tecnologia', active: true, order: 11 },
  { id: 'agropecuaria-agronomia', name: 'Agropecuária e Agronomia', area: 'Ciências Agrárias', active: true, order: 12 },
  { id: 'outras-disciplinas', name: 'Outras disciplinas', area: 'Geral', active: true, order: 99 },
];

export const REPORT_REASONS = [
  { value: 'harassment', label: 'Ofensas ou assédio' },
  { value: 'spam', label: 'Spam ou autopromoção repetitiva' },
  { value: 'inappropriate', label: 'Conteúdo impróprio' },
  { value: 'pii_exposed', label: 'Informações pessoais expostas' },
  { value: 'off_topic', label: 'Fora da finalidade acadêmica' },
] as const;
