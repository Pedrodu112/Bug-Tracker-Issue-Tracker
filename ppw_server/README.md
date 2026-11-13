# Backend Bug Tracker

API NestJS disponível em `http://localhost:8000`. O backend usa PostgreSQL pelo Prisma ORM 7.10.0.

## Primeira configuração

1. Entre nesta pasta e instale as dependências:

   `npm install`

2. Copie `.env.example` para `.env` e configure a URL com o banco e o schema liberados para sua conta.
3. Conecte à Forcepoint VPN quando o banco estiver na rede institucional.
4. Gere o Prisma Client, aplique migrações e cadastre os projetos iniciais:

   `npm run prisma:generate`

   `npm run prisma:migrate:deploy`

   `npm run prisma:seed`

5. Inicie a API:

   `npm run start:dev`

Não versione o arquivo `.env`. Consulte [DATABASE.md](DATABASE.md) para instruções completas e cuidados com schemas compartilhados.

## Comandos úteis

- `npm run build`: compila a API e gera o Prisma Client.
- `npm run lint`: verifica o padrão do código.
- `npm test -- --runInBand`: executa os testes automatizados.
- `npm run prisma:generate`: gera o client a partir do schema.
- `npm run prisma:migrate:deploy`: aplica migrações versionadas.
- `npm run prisma:seed`: cadastra os projetos iniciais sem duplicá-los.
