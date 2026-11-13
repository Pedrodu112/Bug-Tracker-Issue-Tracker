# Arquitetura do backend

O backend organiza issues e projetos em camadas inspiradas na Clean Architecture. Os contratos de repositório ficam na aplicação; os adaptadores Prisma implementam esses contratos e concentram o acesso ao PostgreSQL.

## Camadas

- **domain/**: entidades, tipos, estados, políticas e eventos do domínio.
- **application/**: casos de uso, portas de repositório, regras de fluxo e coordenação do Observer.
- **infrastructure/**: adaptadores concretos Prisma para projetos, issues, auditoria e notificações. Os adaptadores em memória permanecem disponíveis para testes isolados.
- **database/**: módulo global e serviço compartilhado do Prisma Client.
- **Camada HTTP**: controllers e DTOs NestJS recebem requisições, validam dados e convertem resultados em respostas HTTP.
- **prisma/**: schema relacional, migrações versionadas e seed dos projetos iniciais.

## Direção das dependências

Controllers chamam casos de uso. Os casos de uso dependem de contratos de repositório, não do Prisma diretamente. Os módulos NestJS conectam esses contratos às implementações concretas por tokens de injeção de dependência.

Na execução normal, `IssuesModule` utiliza `PrismaIssuesRepository` para issues e histórico e `PrismaIssueNotificationsRepository` para notificações. `ProjectsModule` utiliza `PrismaProjectsRepository`. Os testes HTTP substituem esses adaptadores por implementações em memória, para não depender da VPN nem do servidor institucional.

## Persistência e transações

- O banco é PostgreSQL; a URL de conexão fica em `DATABASE_URL`, nunca em código versionado.
- O schema de destino é informado na query string `?schema=...` e passado explicitamente ao adaptador `PrismaPg`.
- Edições e transições usam versionamento otimista: o UPDATE só ocorre quando o ID e a versão esperada coincidem.
- Uma transição grava o novo status e a linha de auditoria na mesma transação interativa do Prisma.
- A tabela de histórico é append-only; uma trigger no PostgreSQL rejeita UPDATE e DELETE.
- Issues que possuem histórico de transições não podem ser removidas pela aplicação.

## Limites atuais

- Não há autenticação. `actorId` e `actorRole` ainda são informados pelo cliente; o RBAC implementa regras demonstrativas e não deve ser tratado como segurança de produção.
- O Observer não utiliza Outbox ou fila durável. A notificação é persistida pelo adaptador Prisma, mas uma falha no processamento do evento após o commit não desfaz a transição.
- Os casos de uso utilizam injeção de dependência e exceções do NestJS; a separação em camadas é pragmática, não uma implementação totalmente independente de framework.
- Os prazos de SLA usam horas corridas e não consideram feriados ou pausas.

Consulte `DATABASE.md` para configurar VPN, URL, migrações e seed. Não conceda permissões no schema `public` quando houver um schema próprio autorizado para a conta.
