# CSM Clinical — gestão clínica multi-unidades

Aplicação web reestruturada para gestão de clínicas (pacientes, prontuários, evoluções, agenda, eventos, financeiro e busca de evidências clínicas), com **Frontend no Vercel**, **Backend (`server.ts`) no Render** e **Firebase (Auth + Firestore)** no projeto `zany-tribute-fw2h4`.

## Arquitetura de Produção

- **Frontend → Vercel**: SPA React + Vite (`dist/`). Configure `VITE_API_URL` no Vercel apontando para a URL do backend no Render (ex.: `https://seu-backend.onrender.com`).
- **Backend (`server.ts`) → Render**: Servidor Express responsável pelo endpoint `/api/search-studies` (com `@google/genai`) e `/api/health`. Configure `GEMINI_API_KEY`, `GEMINI_MODEL` e `CORS_ORIGIN` (domínio do Vercel) nas variáveis de ambiente do Render.
- **Firebase**: Authentication (E-mail/Senha) e Firestore no banco nomeado `ai-studio-091de9b3-9e63-4295-9e14-b485f5ad1ce9` (projeto `zany-tribute-fw2h4`). **Não publicar no GitHub Pages.**

## Pré-requisitos

- Node.js 20 ou superior, npm e acesso ao projeto Firebase autorizado.
- Firebase Authentication com provedor **E-mail/senha** habilitado.
- Banco Firestore nomeado `ai-studio-091de9b3-9e63-4295-9e14-b485f5ad1ce9` no projeto `zany-tribute-fw2h4`.
- Uma conta de serviço Firebase Admin com permissões adequadas, mantida **fora** da pasta do projeto.

## Executar localmente

```bash
npm install
cp .env.example .env.local
npm run check
npm run test
npm run build
npm run dev
```

No Windows, copie `.env.example` para `.env.local` pelo Explorador. Acesse `http://localhost:3000`.

## Preparar acesso administrativo

Não há senha padrão gravada no banco. O provisionamento de usuários e redefinição administrativa usam o Firebase Admin SDK:

```bash
# Defina GOOGLE_APPLICATION_CREDENTIALS para o caminho absoluto do JSON de conta de serviço.
npm run admin -- help
npm run admin -- reset-password --email jossiefreitas.jgf@gmail.com
```

O comando gera uma senha temporária aleatória, altera a senha no Firebase Authentication e revoga tokens anteriores. **Execute-o em terminal privado e não compartilhe a senha.** Se a conta ainda não existe, crie primeiro a clínica e o usuário com os comandos `create-clinic` e `create-user` descritos em `npm run admin -- help`. Para administrador global, `set-superadmin` deve ser usado somente pelo proprietário autorizado.

### Conta de administrador informada

O e-mail informado para recuperação é `jossiefreitas.jgf@gmail.com`. Consulte o guia **`REDEFINIR_ADMINISTRADOR.md`** para redefinição pelo botão **Recuperar senha** ou pelo comando administrativo.

## Dados legados e regras do Firestore

**Faça backup do Firestore antes de qualquer migração.** A migração executa uma simulação por padrão:

```bash
npm run migrate
npm run migrate -- --apply
```

A migração garante `clinicId` em registros clínicos (`attendances`, `assessments`, `medicalRecords`), `patientId` em `registrations`, e remove qualquer campo `password` legado em `users`. Publique as regras **somente depois de conferir perfis, dados e permissões**:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project zany-tribute-fw2h4
```

O banco é **nomeado** (`ai-studio-091de9b3-9e63-4295-9e14-b485f5ad1ce9`), não o banco `(default)`; confirme o alvo antes da publicação.

## Implantação (Vercel + Render)

### 1. Backend no Render (`server.ts`)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Variáveis de Ambiente**:
  - `NODE_ENV=production`
  - `GEMINI_API_KEY=<sua-chave-gemini>`
  - `GEMINI_MODEL=gemini-2.5-flash`
  - `CORS_ORIGIN=https://seu-app.vercel.app`
- Health check disponível em `GET /api/health`.

### 2. Frontend no Vercel
- Conecte o repositório no Vercel (`vercel.json` já configurado para build e SPA rewrite).
- **Variáveis de Ambiente**:
  - `VITE_API_URL=https://seu-backend.onrender.com`
- Caso queira usar serverless fallback no próprio Vercel, `api/search-studies.ts` também está disponível (definindo `GEMINI_API_KEY` no Vercel).
