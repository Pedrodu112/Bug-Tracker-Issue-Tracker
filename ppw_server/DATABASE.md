# Persistência PostgreSQL com Prisma

O backend usa PostgreSQL por meio do Prisma ORM 7.10.0. O DBeaver serve para inspecionar o banco; a aplicação se conecta por `DATABASE_URL`. Para acessar o servidor da faculdade, conecte primeiro a Forcepoint VPN.

## Configuração local

1. Entre na pasta `ppw_server` e execute `npm install`.
2. Copie `.env.example` para `.env`.
3. Preencha `DATABASE_URL` com os dados fornecidos pela faculdade:

   `postgresql://USUARIO:SENHA@IP:PORTA/NOME_DO_BANCO?schema=public`

4. Não compartilhe nem versione o arquivo `.env`. Caracteres especiais da senha precisam ser codificados para URL.
5. Com a VPN conectada, gere o Prisma Client e aplique as migrações:

   `npm run prisma:generate`

   `npm run prisma:migrate:deploy`

6. Popule os projetos iniciais sem sobrescrever projetos já existentes:

   `npm run prisma:seed`

7. Inicie a API com `npm run start:dev`.

## Evolução do esquema

Em desenvolvimento, alterações no `schema.prisma` devem gerar uma migração nomeada:

`npm run prisma:migrate:dev -- --name descricao-da-alteracao`

Em ambientes compartilhados, aplique somente migrações versionadas com `npm run prisma:migrate:deploy`. Não use `prisma db push` no banco da faculdade como substituto de migrações.

## Garantias implementadas

- Atualizações usam comparação de versão no próprio comando SQL, impedindo que duas gravações com a mesma versão sejam confirmadas.
- Uma transição atualiza a issue e grava seu histórico dentro da mesma transação interativa do PostgreSQL. Falha na auditoria desfaz também a alteração de status.
- Um trigger do PostgreSQL bloqueia UPDATE e DELETE na tabela de auditoria.
- Issues com histórico de transições não podem ser excluídas, preservando a trilha de auditoria.
- Notificações são persistidas no PostgreSQL; a entrega pelo Observer ainda não usa uma fila durável/Outbox.

## Limitações ainda pendentes

A conexão real, as credenciais, a versão do servidor, SSL e permissões do usuário precisam ser validados com a Forcepoint VPN e o DBeaver. O CI gera o Prisma Client e compila sem acessar o banco institucional; isso não substitui o teste de integração na faculdade.
