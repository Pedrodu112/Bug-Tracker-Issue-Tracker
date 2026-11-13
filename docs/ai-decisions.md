# Registro de decisões e uso de IA

## Desafio técnico

A terceira entrega exige uma máquina de estados finitos para issues, regras condicionais por tipo, controle de permissões, eventos/notificações desacoplados, histórico de auditoria, concorrência, SLA e tratamento de falhas. O desafio específico do enunciado foi separar os gatilhos de mudança de estado das regras de notificação.

## Prompt exato registrado

> Como implementar o padrão State/Observer para desacoplar gatilhos de transição das regras de notificação?

## Resposta da IA registrada para o desafio

```text
Separe o comportamento de estado do mecanismo de notificação. Modele os estados da issue por objetos que representem BACKLOG, TRIAGEM, EM_DESENVOLVIMENTO, CODE_REVIEW, QA, PRONTO_PARA_DEPLOY e CONCLUIDO. O estado atual deve expor somente as transições válidas; a política da issue (BUG, FEATURE ou TASK) complementa essa decisão com regras específicas do tipo.

O caso de uso valida o estado atual, a ação solicitada, o papel do ator, as guardas e a versão esperada. Depois de persistir a nova versão e o registro de auditoria, publica um evento de domínio imutável, como ISSUE_TRANSITIONED. O caso de uso não deve chamar diretamente uma classe de e-mail, alerta ou notificação.

Um barramento de eventos permite que observadores se inscrevam. Um IssueNotificationObserver recebe ISSUE_CREATED, ISSUE_UPDATED e ISSUE_TRANSITIONED e decide se deve criar notificações por menção, atribuição ou mudança de status. Assim, a FSM decide se a transição pode ocorrer, enquanto o observador decide quais efeitos de comunicação decorrem do evento.

A gravação do estado e do histórico precisa ser atômica no banco. A publicação de eventos externos deve ocorrer depois do commit; para não perder eventos entre o commit e a entrega, uma evolução de produção deve usar Outbox transacional. Em uma implementação em memória, é necessário declarar que não existe garantia ACID nem entrega durável.
```

## Crítica técnica e refatoração aplicada

### O que foi aproveitado

1. A máquina de estados foi separada das regras de notificação.
2. A implementação passou a representar cada estado por um objeto em `IssueStateRegistry`.
3. As políticas de transição por tipo (`BugTransitionPolicy`, `FeatureTransitionPolicy` e `TaskTransitionPolicy`) permanecem separadas e funcionam como estratégia para as regras específicas do tipo.
4. O `IssueEventBus` publica eventos e o `IssueNotificationObserver` gera notificações sem acoplar o caso de uso da transição à interface.
5. A validação de versão e a escrita de histórico permanecem no adaptador de repositório, antes da publicação do evento.

### Limitações identificadas

- O barramento e os repositórios são em memória. Não existe fila durável nem Outbox; uma reinicialização perde as notificações.
- O histórico e a mudança de status são atômicos apenas dentro da implementação em memória e de um único processo. Isso não prova ACID.
- O RBAC é uma simulação: `actorId` e `actorRole` vêm do cliente. Sem autenticação, o cliente pode falsificar o papel.
- Os prazos de SLA são parâmetros do projeto, não métricas normativas de mercado.
- Não há tabela/serviço de usuários. O identificador de destinatário das notificações é um texto normalizado, não uma chave estrangeira.

### Refatorações efetivamente aplicadas

- Objetos de estado explícitos para os sete estados de issue.
- Políticas separadas para BUG, FEATURE e TASK; TASK não passa por Code Review.
- Guarda de critérios de aceite para FEATURE.
- Barramento Observer e observador responsável por menções, atribuição e alterações de status.
- Controle otimista por versão e testes de disputa entre operações concorrentes.
- Histórico append-only para transições e teste de falha na gravação da auditoria.
- Cálculo de SLA por prioridade, com classificação de risco e vencimento.
- Interface para consultar notificações e acompanhar SLA.

## Reflexão do estudante — rascunho para validação

> A IA ajudou a estruturar as responsabilidades e a identificar os limites de uma solução em memória. A parte mais importante da revisão foi não tratar o Observer como uma garantia de entrega: o barramento desacopla os consumidores, mas ainda não é persistente. Também foi necessário separar o RBAC demonstrativo da autorização real, já que o sistema não possui autenticação. A implementação foi ajustada para representar os estados explicitamente e manter as regras por tipo em políticas próprias. Para uma versão de produção, eu priorizaria autenticação, banco relacional com transação real e Outbox para notificações.

**Atenção:** o parágrafo acima é um rascunho sugerido pela IA para revisão. O estudante deve confirmar se concorda com a avaliação e reescrevê-la com sua própria análise antes de entregar; ele não deve ser apresentado como depoimento pessoal sem validação.

## Evidências no repositório

- `ppw_server/src/issues/application/workflow/issue-state.registry.ts`
- `ppw_server/src/issues/application/workflow/issue-transition-policy.registry.ts`
- `ppw_server/src/issues/application/events/issue-event-bus.ts`
- `ppw_server/src/issues/application/events/issue-notification.observer.ts`
- `ppw_server/src/issues/domain/issue-sla.ts`
- `ppw_server/src/issues/infrastructure/in-memory-issues.repository.ts`
- `ppw_client/src/app/notificacoes/page.tsx`
- `ppw_client/src/app/auditoria/page.tsx`

## Limite do registro

Este documento registra o prompt específico do desafio, uma resposta da IA preparada para esse prompt, a crítica técnica e as alterações verificadas no repositório. Não afirma reproduzir integralmente todo o histórico textual das conversas ou respostas intermediárias.


## Atualização da implementação após integração PostgreSQL (13/11/2026)

A análise crítica acima registrava as limitações da primeira implementação, que utilizava adaptadores em memória. Essas limitações de persistência foram parcialmente resolvidas em uma etapa posterior, sem alterar o prompt original ou ocultar o histórico da evolução.

### Mudanças realizadas depois da análise inicial

- PostgreSQL 18.3 integrado ao backend por Prisma ORM 7.10.0 e adaptador `@prisma/adapter-pg`.
- Schema, migração SQL versionada e seed criados para projetos, issues, histórico e notificações.
- Repositórios de projetos, issues, auditoria e notificações substituídos por adaptadores Prisma na execução normal. Implementações em memória são mantidas nos testes automatizados para que o CI não dependa da VPN institucional.
- O status e o registro de auditoria são gravados na mesma transação Prisma. O controle de concorrência compara a versão atual no UPDATE.
- Trigger do PostgreSQL impede alteração e exclusão de registros da tabela de auditoria.

### Evidências práticas

Na infraestrutura institucional, a migração foi aplicada, os três projetos iniciais foram cadastrados, a API consultou os projetos, uma issue foi criada e conferida no DBeaver, e a ação `INICIAR_TRIAGEM` persistiu a mudança de BACKLOG para TRIAGEM com incremento de versão e registro em `issue_history`. Após reiniciar a API, a issue continuou disponível com status TRIAGEM e versão 2.

### Limitações que continuam válidas

- Não há autenticação real. `actorId` e `actorRole` continuam informados pelo cliente; o RBAC é demonstrativo.
- A entrega do Observer não usa fila durável ou Outbox. As notificações são persistidas, mas falhas no processamento do evento após o commit podem exigir reprocessamento.
- O SLA usa horas corridas e não considera calendário comercial, feriados ou pausas.
- Os testes automatizados do CI usam adaptadores isolados em memória; a conexão com o PostgreSQL institucional foi validada manualmente por depender da VPN e das credenciais individuais.

A reflexão em primeira pessoa acima continua sendo um rascunho para revisão do estudante. Ela deve ser adaptada à experiência real dos integrantes antes da entrega.
