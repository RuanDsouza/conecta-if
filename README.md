# Conecta IF — Rede Social Acadêmica Colaborativa (IF Baiano)

Plataforma colaborativa de perguntas e respostas desenvolvida para estudantes do Instituto Federal de Educação, Ciência e Tecnologia Baiano (**IF Baiano**).

## Tecnologias

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router DOM, Lucide React
- **Autenticação:** Firebase Authentication (E-mail/Senha com verificação de e-mail, Recuperação de senha e Login com Google)
- **Banco de Dados & Segurança:** Cloud Firestore + Firebase Security Rules (`firestore.rules`)

## Configuração de Variáveis de Ambiente

Copie `.env.example` para `.env` (sem incluir segredos privados no frontend):

- `VITE_APP_NAME`: Nome exibido na plataforma (padrão: `Conecta IF`)
- `VITE_INSTITUTIONAL_DOMAINS`: Domínios institucionais reconhecidos separados por vírgula
- `VITE_STRICT_INSTITUTIONAL_EMAIL`: `true` para restringir o cadastro apenas aos domínios listados, ou `false` para aceitar e sinalizar verificação institucional

As configurações públicas do projeto Firebase são carregadas de `firebase-applet-config.json`.

## Configuração no Console do Firebase

1. **Authentication:** Em *Authentication > Sign-in method*, garanta que os provedores **E-mail/senha** e **Google** estejam habilitados.
2. **Firestore Security Rules:** O arquivo `firestore.rules` define regras restritivas por padrão (*default-deny*), isolamento de PII em `user_private/{userId}`, verificação de `email_verified`, integridade de `request.time` e validação estrita de campos.
3. **Índices Compostos:** Consulte `firestore.indexes.json` para os índices recomendados de ordenação e filtros combinados.

## Scripts de Execução e Verificação

```bash
npm install
npm run dev       # Servidor de desenvolvimento na porta 3000
npm run lint      # Verificação de tipos TypeScript (tsc --noEmit)
npm run build     # Build de produção em dist/
npx eslint firestore.rules
npx tsx firestore.rules.test.ts
```

## Publicação

Execute `npm run build` para gerar os arquivos estáticos em `dist/` e publique em seu provedor de hospedagem (ex.: Firebase Hosting ou Cloud Run), garantindo que `firestore.rules` e `firestore.indexes.json` tenham sido implantados no projeto Firebase.
