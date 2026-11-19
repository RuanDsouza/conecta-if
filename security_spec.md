# Especificação de Segurança — Conecta IF

## 1. Invariantes de Dados

1. **Identidade & Isolamento de PII**: Dados pessoais identificáveis (`email`, `acceptedTermsAt`) residem exclusivamente em `/user_private/{userId}`, legíveis e graváveis apenas pelo titular (`request.auth.uid == userId`) ou administrador. `/users/{userId}` contém apenas metadados acadêmicos públicos configuráveis e nunca aceita campo `role` ou `isAdmin`.
2. **Prevenção de Elevação de Privilégios**: A coleção `/admins/{userId}` proíbe qualquer escrita pelo cliente (`allow write: if false;`). O papel administrativo só é concedido via servidor/console ou e-mail verificado configurado de administrador.
3. **Verificação de E-mail Obrigatória**: Toda operação de escrita comunitária (criar/editar perguntas, respostas, complementações, votos úteis, favoritos, denúncias e notificações) exige `request.auth.token.email_verified == true`.
4. **Integridade Relacional (Master Gate)**:
   - Uma resposta (`/answers/{answerId}`) só pode ser criada se `/questions/{questionId}` existir, possuir `visibility == 'community'` e `status == 'open'`.
   - Uma complementação (`/complements/{complementId}`) só pode ser criada se `/answers/{answerId}` e `/questions/{questionId}` existirem e o autor da complementação for o autor da resposta OU o autor da pergunta.
   - Um voto útil (`/helpful_votes/{answerId}_{userId}`) só pode ser criado se a resposta existir e o votante não for o autor da própria resposta.
5. **Integridade Temporal**: Todos os campos `createdAt` e `updatedAt` exigem igualdade estrita com `request.time`. `createdAt` é imutável após criação.
6. **Prevenção de Alteração Alheia**: Nenhum usuário comum pode editar ou excluir pergunta, resposta, complementação ou perfil de outro usuário. A única exceção controlada de exclusão é o autor de uma pergunta poder excluir em lote (`writeBatch`) as respostas e complementações diretamente vinculadas à sua própria pergunta durante a exclusão em cascata.

## 2. "Dirty Dozen" — Payloads Maliciosos que Devem Receber PERMISSION_DENIED

1. **Elevação de Privilégio no Perfil**: `POST /users/{uid}` contendo `{ role: "admin", isAdmin: true }`.
2. **Escrita com E-mail Não Verificado**: `POST /questions/{qid}` autenticado com `email_verified: false`.
3. **Falsificação de Autoria (Identity Spoofing)**: `POST /questions/{qid}` com `authorId != request.auth.uid`.
4. **Shadow Field Injection**: `PATCH /questions/{qid}` enviando campo não permitido `{ verifiedByStaff: true }`.
5. **Envenenamento de ID (ID Poisoning)**: `SET /questions/invalid$id!with/slashes` ou ID com > 128 chars.
6. **Leitura Blanket de PII**: `GET /user_private/{otherUid}` autenticado como outro estudante.
7. **Edição de Resposta Alheia**: `PATCH /answers/{aid}` pelo usuário B no documento criado pelo usuário A.
8. **Resposta em Pergunta Resolvida**: `POST /answers/{aid}` referenciando uma pergunta com `status == 'resolved'`.
9. **Complementação por Terceiro Não Relacionado**: `POST /complements/{cid}` por um estudante C que não é autor da pergunta nem autor da resposta.
10. **Manipulação de Timestamp**: `POST /questions/{qid}` enviando `createdAt` do cliente diferente de `request.time`.
11. **Manipulação de Denúncia para Auto-Aprovação**: `PATCH /reports/{rid}` pelo denunciante tentando alterar `status: "action_taken"`.
12. **Raspagem (Scraping) de Notificações Alheias**: `LIST /notifications` sem filtro `where('recipientId', '==', request.auth.uid)`.
