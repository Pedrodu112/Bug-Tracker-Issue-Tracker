# Persistência PostgreSQL com Prisma

O backend usa PostgreSQL por meio do Prisma ORM 7.10.0. O DBeaver serve para inspecionar o banco; a API se conecta diretamente por `DATABASE_URL`. Na infraestrutura institucional, conecte a Forcepoint VPN antes de iniciar a aplicação.

## Configuração local

1. Entre na pasta `ppw_server` e execute `npm install` (ou `npm ci` quando o lockfile estiver sincronizado).
2. Copie `.env.example` para `.env`.
3. Preencha `DATABASE_URL` com os dados fornecidos para sua conta:

   `postgresql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO?schema=SEU_SCHEMA`

4. O usuário precisa ter `USAGE` e `CREATE` no schema escolhido. O adaptador `PrismaPg` lê o parâmetro `schema` e o informa explicitamente ao driver.
5. Não compartilhe nem versione o arquivo `.env`. Caracteres especiais da senha precisam ser codificados para URL.
6. Com a VPN conectada, gere o Prisma Client e aplique as migrações:

   `npm run prisma:generate`

   `npm run prisma:migrate:deploy`

7. Popule os projetos iniciais sem sobrescrever projetos já existentes:

   `npm run prisma:seed`

8. Inicie a API com `npm run start:dev`.

## Ambiente institucional validado

A integração foi executada em PostgreSQL 18.3, no banco institucional autorizado e em um schema individual da conta. A validação manual incluiu:

- aplicação da migração `20261113000000_initial_schema`;
- execução do seed com os três projetos iniciais;
- consulta dos projetos pela rota `GET /projetos`;
- criação de uma issue pela API e conferência na tabela `issues`;
- transição de `BACKLOG` para `TRIAGEM` e conferência do registro em `issue_history`;
- reinicialização da API e confirmação de que a issue permaneceu com status `TRIAGEM` e versão 2.

Não inclua host, senha ou identificadores pessoais de acesso em arquivos versionados. Cada integrante deve configurar seu próprio `.env` e schema autorizado.

## Evolução do esquema

Em desenvolvimento, alterações no `schema.prisma` devem gerar uma migração nomeada:

`npm run prisma:migrate:dev -- --name descricao-da-alteracao`

Em ambientes compartilhados, aplique somente migrações versionadas com `npm run prisma:migrate:deploy`. Não use `prisma db push` no banco institucional como substituto de migrações.

## Garantias implementadas

- Atualizações usam comparação atômica de versão no banco, evitando que duas gravações com a mesma versão sejam confirmadas.
- Uma transição atualiza a issue e grava seu histórico dentro da mesma transação interativa do PostgreSQL. Falha na auditoria reverte também a alteração de status.
- Um trigger do PostgreSQL bloqueia UPDATE e DELETE na tabela de auditoria.
- Issues com histórico de transições não podem ser excluídas pela aplicação, preservando a trilha de auditoria.
- Projetos, issues, histórico e notificações usam repositórios Prisma.
- A aplicação não precisa de permissão de criação no schema `public`; utilize um schema autorizado à sua conta.

## Limitações ainda pendentes

A autenticação não foi implementada: identificador e papel do ator ainda chegam pela requisição, então o RBAC é demonstrativo. As notificações são persistidas, mas a publicação Observer não usa fila durável ou Outbox. O SLA não considera calendário comercial, feriados ou pausas. O CI compila e testa com repositórios isolados; o acesso ao banco institucional é uma validação manual e depende da VPN e das credenciais de cada integrante.
