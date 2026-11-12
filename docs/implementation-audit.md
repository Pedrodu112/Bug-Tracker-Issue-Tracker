# Auditoria inicial e plano de implementação

## Escopo

Este documento registra o estado observado no repositório antes das alterações do terceiro trabalho avaliativo. A análise foi feita sobre a branch `main`; a implementação será isolada em `feat/complex-issue-workflow`.

## Arquitetura existente

- Frontend: Next.js 15, React 19, TypeScript e Tailwind CSS.
- Backend: NestJS 11, TypeScript e API REST.
- O backend já possui separação inicial entre domínio, casos de uso, portas e adaptadores de infraestrutura.
- O módulo de issues injeta `IssuesRepository` por token, atualmente implementado por `InMemoryIssuesRepository`.
- O módulo de projetos também é consultado pelos casos de uso de issues.
- O frontend centraliza chamadas HTTP em `ppw_client/src/lib/api.ts` e mantém estado/cache por meio de `IssueProvider` e `localStorage`.

## Lacunas confirmadas no código

1. `PATCH /issues/:id` recebe `UpdateIssueDto`, derivado de `CreateIssueDto`, que inclui `status`. Assim, o status pode ser alterado diretamente por uma requisição genérica.
2. `IssuesUseCases.update()` encaminha os campos recebidos diretamente ao repositório, sem validar uma transição de estado.
3. `InMemoryIssuesRepository` mantém issues em um array na memória do processo. Os dados do backend são perdidos ao reiniciar o servidor.
4. Não foi localizada estrutura de histórico de transições, justificativa, autor ou notificações.
5. Não foi localizado controle de concorrência/versionamento nas entidades de issue.
6. O modelo atual contempla os tipos `BUG`, `FEATURE` e `TASK`; qualquer política nova deve considerar os três tipos, sem eliminar silenciosamente os dados/fluxos de TASK.
7. O projeto não possui banco de dados, ORM ou autenticação configurados no estado documentado pelo README.

## Diretrizes de implementação

- Remover a possibilidade de alterar status pelo endpoint genérico de edição.
- Criar operações de domínio/aplicação explícitas para transições, com validação do estado atual, tipo da issue, papel/ator e guardas.
- Preservar os estados existentes inicialmente: `BACKLOG`, `TRIAGEM`, `EM_DESENVOLVIMENTO`, `CODE_REVIEW`, `QA`, `PRONTO_PARA_DEPLOY` e `CONCLUIDO`.
- Definir políticas extensíveis por tipo de issue, cobrindo BUG e FEATURE e mantendo comportamento explícito para TASK.
- Introduzir histórico de transição e eventos de domínio; notificações devem reagir aos eventos sem acoplar o caso de uso de transição ao mecanismo de entrega.
- Introduzir controle de concorrência compatível com o adaptador de persistência escolhido.
- Manter as regras de negócio no backend; validações visuais no frontend serão apenas complementares.
- Não declarar conformidade ACID ou persistência durável enquanto o adaptador permanecer em memória. A escolha do banco e a estratégia de migração serão fechadas em etapa própria, conforme alinhamento com o estudante.

## Sequência de trabalho

1. Auditoria e registro das decisões arquiteturais.
2. Máquina de estados, políticas por tipo e remoção de alteração arbitrária de status.
3. Histórico de transições e testes das regras.
4. Concorrência otimista e persistência transacional, após definir a tecnologia de banco.
5. Eventos, menções e notificações desacopladas.
6. Integração de interface, feedback HTTP e documentação final.
7. Revisão de testes, README, DER, diagrama de estados e registro crítico de uso da IA.

## Limites desta auditoria

Esta auditoria não afirma que todas as telas ou todos os fluxos do frontend foram testados manualmente. Ela registra somente o que foi confirmado pela leitura dos arquivos listados na implementação atual. Nenhum código funcional foi alterado nesta etapa.


## Resultado da implementação na branch de trabalho

Esta seção complementa a auditoria inicial; os itens abaixo foram verificados no código e nos workflows da branch `feat/complex-issue-workflow`.

### Implementado

- Máquina de estados com objetos para os sete estados e políticas separadas para BUG, FEATURE e TASK.
- Transições explícitas por ação; `PATCH /issues/:id` não aceita status e o tipo da issue não pode ser alterado após a criação.
- RBAC demonstrativo por ação, guardas de critérios de aceite para FEATURE e justificativa para ações de retorno.
- Versionamento otimista com `If-Match`, respostas 428 para versão ausente e 409 para conflito; testes unitários e HTTP de concorrência.
- Histórico append-only das transições, com estado anterior/novo, ação, ator, perfil, justificativa, timestamp e versão.
- Teste de falha na gravação do histórico, confirmando que a transição não altera o status nem cria um registro parcial no adaptador em memória.
- Eventos de domínio e Observer para menções, atribuições e mudanças de status; falhas síncronas ou assíncronas de observadores são isoladas do fluxo principal.
- SLA por prioridade, indicador visual nos detalhes e cálculo da conclusão com base no instante da transição auditada.
- Central de notificações, timeline por issue e página global de auditoria.
- Logotipo vetorial e favicon, README com diagrama Mermaid, modelo conceitual e instruções de execução, além de `AI-LOG.md` e `docs/ai-decisions.md`.

### Limitações que permanecem

1. **Banco e ACID:** os repositórios de issues, histórico, projetos e notificações continuam em memória. A atomicidade demonstrada é local ao processo; não substitui uma transação ACID nem coordenação distribuída.
2. **Autenticação e RBAC real:** `actorId` e `actorRole` são enviados pelo cliente. As regras de autorização são demonstrativas e não protegem o sistema contra falsificação de identidade.
3. **Entrega durável de eventos:** o Observer é desacoplado, mas não existe fila persistente nem Outbox. Falhas de notificação são registradas no log e não revertem uma transição já confirmada.
4. **Persistência de notificações:** notificações e histórico desaparecem quando o backend reinicia; não há tabela de usuários ou vínculo por chave estrangeira.
5. **SLA:** os prazos são parâmetros acadêmicos em horas corridas, sem calendário comercial, feriados ou pausas.
6. **Reflexão de IA:** o texto em primeira pessoa de `AI-LOG.md` é um rascunho para validação e deve ser revisado pelo estudante antes da entrega.

### Validação automatizada

O workflow `.github/workflows/validate.yml` executa build, lint e testes do backend, além de lint, TypeScript e build do frontend. Os resultados devem ser consultados pelo SHA mais recente da branch; uma execução anterior não comprova alterações posteriores.

### Decisão pendente

A tecnologia de banco permanece deliberadamente sem escolha nesta etapa, conforme alinhamento com o estudante. Portanto, a entrega documenta claramente o limite da implementação atual em vez de afirmar persistência ou conformidade ACID inexistentes.
