/**
 * Testes automatizados de validação, filtragem e verificação estática
 * dos invariantes de segurança do Conecta IF (executável com `npx tsx firestore.rules.test.ts`).
 *
 * Nota: Estes testes verificam as regras de negócio no frontend, a lógica de filtragem combinada
 * e a presença de todas as travas obrigatórias em `firestore.rules`. Para execução contra o
 * emulador oficial do Firestore (`@firebase/rules-unit-testing`), execute em ambiente com Firebase CLI/Emulators.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Timestamp } from 'firebase/firestore';
import { applyFeedFiltersClient } from './src/utils/feedFilters';
import { QuestionItem } from './src/types/domain';
import {
  isInstitutionalEmail,
  parseTags,
  validateAnswerInput,
  validateComplementInput,
  validateQuestionInput,
} from './src/utils/validation';

function runValidationTests() {
  // 1. E-mail institucional configurável
  assert.equal(isInstitutionalEmail('ana@estudante.ifbaiano.edu.br'), true);
  assert.equal(isInstitutionalEmail('professor@ifbaiano.edu.br'), true);
  assert.equal(isInstitutionalEmail('usuario@gmail.com'), false);

  // 2. Limites e sanitização de tags
  assert.deepEqual(parseTags('SQL, banco, sql, Modelagem, 3FN, extra1, extra2'), [
    'sql',
    'banco',
    'modelagem',
    '3fn',
    'extra1',
  ]);

  // 3. Validação de pergunta (título curto, URL HTTP insegura, corpo válido)
  assert.ok(
    validateQuestionInput({
      title: 'Curta',
      body: 'Descrição suficientemente detalhada para teste.',
      subjectId: 'matematica',
      codeSnippet: '',
      referenceUrl: '',
      tags: [],
    }) !== null
  );

  assert.ok(
    validateQuestionInput({
      title: 'Dúvida válida de Cálculo I sobre limites',
      body: 'Descrição suficientemente detalhada para validar a entrada de pergunta.',
      subjectId: 'matematica',
      codeSnippet: '',
      referenceUrl: 'http://inseguro.exemplo.com',
      tags: ['calculo'],
    }) !== null
  );

  assert.equal(
    validateQuestionInput({
      title: 'Dúvida válida de Cálculo I sobre limites',
      body: 'Descrição suficientemente detalhada para validar a entrada de pergunta.',
      subjectId: 'matematica',
      codeSnippet: '',
      referenceUrl: 'https://ifbaiano.edu.br/material.pdf',
      tags: ['calculo'],
    }),
    null
  );

  // 4. Validação de resposta e complementação
  assert.ok(validateAnswerInput('Curta', '') !== null);
  assert.equal(validateAnswerInput('Explicação completa com passo a passo.', ''), null);
  assert.ok(validateComplementInput('Oi') !== null);
  assert.equal(validateComplementInput('Complemento válido da resposta.'), null);
}

function runFilterTests() {
  const now = Timestamp.now();
  const sampleQuestions: QuestionItem[] = [
    {
      id: 'q1',
      authorId: 'u1',
      authorName: 'Lucas',
      authorCampus: 'Campus Catu',
      authorCourse: 'Técnico em Informática',
      authorAvatarUrl: '',
      title: 'Como calcular derivada implícita?',
      body: 'Estou com dúvida na regra da cadeia para derivada implícita.',
      codeSnippet: '',
      referenceUrl: '',
      subjectId: 'matematica',
      subjectName: 'Matemática',
      campusId: 'Campus Catu',
      courseId: 'Técnico em Informática',
      tags: ['calculo', 'derivada'],
      status: 'open',
      visibility: 'community',
      answersCount: 0,
      lastAnswerId: '',
      lastRemovedAnswerId: '',
      isEdited: false,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    },
    {
      id: 'q2',
      authorId: 'u2',
      authorName: 'Clara',
      authorCampus: 'Campus Guanambi',
      authorCourse: 'Engenharia Agronômica',
      authorAvatarUrl: '',
      title: 'Normalização na 3FN em SQL',
      body: 'Como eliminar dependência transitiva em uma tabela de alunos?',
      codeSnippet: '',
      referenceUrl: '',
      subjectId: 'banco-de-dados',
      subjectName: 'Banco de Dados',
      campusId: 'Campus Guanambi',
      courseId: 'Engenharia Agronômica',
      tags: ['sql', '3fn'],
      status: 'resolved',
      visibility: 'community',
      answersCount: 2,
      lastAnswerId: 'a2',
      lastRemovedAnswerId: '',
      isEdited: false,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    },
  ];

  // Filtro combinado: Matemática + Aberta + Campus Catu
  const combined = applyFeedFiltersClient(sampleQuestions, {
    subjectId: 'matematica',
    status: 'open',
    campus: 'Campus Catu',
    course: '',
    dateRange: 'all',
    sortBy: 'recent',
    searchQuery: 'derivada',
  });
  assert.equal(combined.length, 1);
  assert.equal(combined[0].id, 'q1');

  // Pergunta resolvida continua acessível quando filtro é 'all'
  const allRes = applyFeedFiltersClient(sampleQuestions, {
    subjectId: '',
    status: 'all',
    campus: '',
    course: '',
    dateRange: 'all',
    sortBy: 'recent',
    searchQuery: '',
  });
  assert.equal(allRes.length, 2);
}

function runSecurityRulesStaticAudit() {
  const rules = fs.readFileSync('./firestore.rules', 'utf8');

  // Verifica rede global default-deny
  assert.ok(rules.includes('match /{document=**} {\n      allow read, write: if false;'));
  // Verifica isolamento de PII
  assert.ok(rules.includes('match /user_private/{userId}'));
  // Verifica bloqueio de escrita direta em admins
  assert.ok(rules.includes('match /admins/{userId}') && rules.includes('allow write: if false;'));
  // Verifica exigência de e-mail verificado
  assert.ok(rules.includes('request.auth.token.email_verified == true'));
  // Verifica proteção contra escalação/alteração de respostas alheias
  assert.ok(rules.includes("get(/databases/$(database)/documents/questions/$(incoming().questionId)).data.status == 'open'"));
  // Verifica integridade temporal serverTimestamp
  assert.ok(rules.includes('incoming().createdAt == request.time'));
  assert.ok(rules.includes('incoming().updatedAt == request.time'));
  // Verifica list queries seguras avaliando resource.data
  assert.ok(rules.includes("allow list: if isSignedIn() && resource.data.visibility == 'community';"));
  assert.ok(rules.includes('allow list: if isSignedIn() && resource.data.recipientId == request.auth.uid;'));
}

runValidationTests();
runFilterTests();
runSecurityRulesStaticAudit();
console.log('Todos os testes de validação, filtros e auditoria estática de regras passaram com sucesso.');
