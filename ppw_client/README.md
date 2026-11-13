# Frontend Bug Tracker

Execute `npm install` e `npm run dev`. A aplicação fica em `http://localhost:3000` e chama a API em `http://localhost:8000` por meio de `src/lib/api.ts`.

O frontend usa `localStorage` como cache/contingência visual. A persistência principal de projetos, issues, histórico e notificações fica no PostgreSQL, acessado pelo backend NestJS/Prisma. O armazenamento local do navegador não substitui o banco do servidor.
