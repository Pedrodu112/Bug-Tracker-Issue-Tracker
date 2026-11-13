# Decisões arquiteturais e uso de IA

Este documento registra as decisões técnicas que orientaram a terceira entrega. O histórico detalhado das dificuldades, testes manuais e reflexão está em [`AI-LOG.md`](../AI-LOG.md).

## 1. Requisito que motivou a decisão

Prompt do enunciado:

> Como implementar o padrão State/Observer para desacoplar gatilhos de transição das regras de notificação?

A resposta técnica aplicada foi separar duas responsabilidades: a máquina de estados/políticas definem se uma transição é válida; os eventos e observadores tratam os efeitos derivados, como notificações. Esta documentação registra uma síntese técnica da orientação, não uma transcrição literal de conversa.

## 2. Decisões

| ID | Decisão | Justificativa | Evidência |
| --- | --- | --- | --- |
| D-01 | Transições por ação explícita; sem PATCH arbitrário de status | Impede saltos de estado e mantém validação no backend | `issues.controller.ts`, `issues.use-cases.ts` |
| D-02 | Estados explícitos e políticas por tipo | Separa o ciclo de vida das particularidades de BUG, FEATURE e TASK | `issue-state.registry.ts`, `*-transition.policy.ts` |
| D-03 | Guardas e permissões no caso de uso | A interface só exibe ações disponíveis, mas a API valida novamente ação, papel e condição | `issue-transition.guards.ts`, `issues.use-cases.ts` |
| D-04 | Concorrência otimista com `If-Match` | Evita sobrescrever operações baseadas em versão desatualizada | DTO/controller, repositórios e testes |
| D-05 | Histórico append-only na mesma transação da transição | Evita status alterado sem auditoria correspondente | `prisma-issues.repository.ts`, migração e trigger |
| D-06 | Observer desacoplado da FSM | Permite adicionar efeitos de comunicação sem alterar regras de transição | `issue-event-bus.ts`, `issue-notification.observer.ts` |
| D-07 | PostgreSQL + Prisma para persistência principal | Necessidade de persistência relacional e transações reais no ambiente institucional | `prisma/schema.prisma`, migração, repositórios Prisma |
| D-08 | Pool PostgreSQL limitado a uma conexão no ambiente compartilhado | A conta institucional atingiu a cota de conexões; o limite reduz a concorrência do pool e evita o erro P2037 observado | `src/database/prisma.service.ts` |

## 3. Crítica da solução

**O que funcionou:** State e políticas por tipo mantêm as transições legíveis; o Observer remove a dependência direta entre transição e notificação; o histórico permite reconstruir a sequência; o versionamento detecta conflito; a transação Prisma mantém alteração e auditoria consistentes.

**O que não deve ser superestimado:** o Observer não é uma fila durável; o RBAC é demonstrativo e não autentica pessoas; o SLA usa horas corridas; o pool de uma conexão é uma configuração para a cota institucional, não uma recomendação universal de produção. O CI usa adaptadores em memória, enquanto a integração com o PostgreSQL institucional foi validada manualmente.

## 4. Decisões de implementação específicas

- BUG e FEATURE seguem Code Review; TASK segue diretamente para QA.
- FEATURE exige critérios de aceite com pelo menos 20 caracteres para iniciar desenvolvimento.
- Ações de triagem, desenvolvimento, revisão, QA e deploy são associadas a perfis específicos.
- Alterações de estado exigem `If-Match`; ausência da versão gera 428 e conflito gera 409. Transição inválida gera 422 e perfil sem permissão gera 403.
- Histórico contém ação, estados anterior/novo, ator, perfil, justificativa, timestamp e versão. No PostgreSQL, trigger impede UPDATE e DELETE da auditoria.
- O evento é publicado depois da persistência da transição. O observador gera notificações por menção, atribuição e mudança de estado; não há Outbox ou mecanismo de retentativa.

## 5. Validação vinculada às decisões

- PostgreSQL institucional: migração aplicada, seed de três projetos, criação e leitura de issue, transição persistida e recuperação após reinício do backend.
- Issue #4: seis transições sucessivas de BACKLOG até CONCLUIDO, seis eventos na auditoria individual e sete registros na auditoria global (incluindo uma transição anterior da issue #1).
- SLA da issue #4: prioridade MEDIA, 72 horas, concluída no prazo.
- Erro operacional encontrado: `P2037` / `too many connections for role`. Ajuste do pool para `max: 1`, `idleTimeoutMillis: 5000` e `connectionTimeoutMillis: 5000`; após reinício, histórico individual e auditoria global voltaram a carregar.
- GitHub Actions, execução `43493281543`: jobs Backend NestJS e Frontend Next.js concluídos com sucesso. Backend: build, lint e testes; frontend: lint, TypeScript e build.
- Correção do pool registrada no commit `ea8fc104635ced4de51903b3be400e2966822cec`.

## 6. Limitações e próximos passos técnicos

1. Implementar autenticação e autorização confiáveis baseadas na identidade da sessão.
2. Considerar Outbox transacional, fila durável, retentativas e idempotência para notificações.
3. Avaliar testes de integração com PostgreSQL no CI, incluindo transação, trigger e concorrência.
4. Revisar o tamanho do pool conforme os limites do ambiente de implantação.
5. Definir calendário comercial para o SLA se exigido pelo domínio.

## 7. Integridade acadêmica

A análise crítica e as evidências técnicas registram o que foi observado no repositório e nos testes. A reflexão em primeira pessoa está em `AI-LOG.md` como texto-base elaborado com auxílio da IA e precisa ser revisada pelos integrantes para refletir fielmente sua experiência.