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
