# AI-LOG — Uso de IA, decisões, dificuldades e reflexão

**Projeto:** IssueFlow — Bug Tracker / Issue Tracker  
**Entrega:** fluxo complexo de issues, auditoria, notificações, SLA e persistência  
**Branch:** `feat/complex-issue-workflow`  
**Atualização deste registro:** 13/11/2026

## 1. Contexto do desafio

A atividade exigiu transformar o acompanhamento de issues em um fluxo controlado, em vez de permitir que qualquer atualização alterasse o status diretamente. O trabalho envolveu máquina de estados finitos, regras diferentes para BUG, FEATURE e TASK, permissões por ação, guardas, concorrência otimista, auditoria append-only, notificações desacopladas, SLA, tratamento de erros HTTP, persistência e documentação.

O ponto central do enunciado foi responder à pergunta: como separar as decisões que permitem uma transição das ações secundárias que devem ocorrer por causa dela, especialmente as notificações? A solução precisou manter a regra de negócio no backend e fazer a interface consumir as ações autorizadas pela API, sem inventar transições.

## 2. Prompt relacionado ao requisito de State/Observer

> Como implementar o padrão State/Observer para desacoplar gatilhos de transição das regras de notificação?

Este é o prompt do requisito acadêmico registrado para orientar a implementação. O texto da resposta abaixo é uma síntese técnica organizada para documentar a orientação aplicada; não deve ser interpretado como transcrição literal de uma mensagem anterior.

## 3. Resposta técnica registrada

A máquina de estados deve decidir quais transições são válidas a partir do estado atual. Cada estado expõe apenas as ações que podem sair dele, e uma política específica do tipo da issue acrescenta as regras próprias de BUG, FEATURE ou TASK. O caso de uso valida a ação, o estado de origem, o perfil do ator, as guardas e a versão esperada antes de persistir a mudança.

Depois que a alteração e seu registro de auditoria são confirmados, o caso de uso publica um evento de domínio, por exemplo `ISSUE_TRANSITIONED`. O caso de uso não deve conhecer diretamente o mecanismo que envia ou armazena notificações. Um barramento de eventos distribui o evento aos observadores inscritos; o `IssueNotificationObserver` interpreta o evento e decide se deve gerar notificações por menção, atribuição ou mudança de status.

A mudança de status e a gravação do histórico precisam ser atômicas no banco de dados. A publicação do evento ocorre após a persistência. Em uma solução de produção, uma Outbox transacional ou fila durável seria necessária para reduzir o risco de perder notificações entre o commit e o processamento do evento. Um barramento apenas em memória desacopla responsabilidades, mas não garante entrega durável.

## 4. Crítica da orientação e decisões adotadas

### Aspectos aproveitados

- Separar a máquina de estados do mecanismo de notificação, evitando chamadas diretas do fluxo de transição para componentes de comunicação.
- Representar os estados por objetos e as regras por tipo por políticas específicas, reduzindo condicionais espalhadas pelo caso de uso.
- Publicar eventos de domínio e deixar os observadores reagirem a eles.
- Tratar persistência e concorrência como responsabilidades do repositório, usando versão esperada e transação.
- Distinguir o que é uma demonstração acadêmica do que seria necessário para uma implantação real.

### Pontos que exigiram correção ou ressalva

- O padrão Observer, isoladamente, não oferece fila persistente, retentativa nem entrega exatamente uma vez. O barramento do projeto continua em memória; as notificações são persistidas pelo adaptador Prisma, mas uma falha no observador após o commit pode exigir reprocessamento.
- O RBAC implementado valida as regras de cada perfil, mas não constitui autenticação real: `actorId` e `actorRole` são enviados pelo cliente e podem ser falsificados.
- A garantia de atomicidade não poderia ser atribuída ao primeiro repositório em memória. Ela só passou a ser demonstrada no caminho real de persistência com PostgreSQL e transação Prisma.
- O SLA é uma regra acadêmica configurada por prioridade e horas corridas; não representa, por si só, uma política de SLA comercial com expediente, feriados ou pausas.
- Os testes automatizados do CI usam adaptadores em memória para não depender da VPN institucional. Por isso, a validação do PostgreSQL real precisou ser executada separadamente no ambiente da faculdade.

## 5. Implementação correspondente no repositório

| Decisão | Implementação / evidência |
| --- | --- |
| Estados explícitos | `ppw_server/src/issues/application/workflow/issue-state.registry.ts` |
| Políticas por tipo | `bug-transition.policy.ts`, `feature-transition.policy.ts` e `task-transition.policy.ts` |
| Guardas de negócio | `issue-transition.guards.ts` |
| Orquestração das operações | `ppw_server/src/issues/application/issues.use-cases.ts` |
| Observer e barramento | `issue-event-bus.ts` e `issue-notification.observer.ts` |
| Histórico e repositório PostgreSQL | `ppw_server/src/issues/infrastructure/prisma-issues.repository.ts` |
| Configuração do Prisma | `ppw_server/src/database/prisma.service.ts` |
| SLA | `ppw_server/src/issues/domain/issue-sla.ts` |
| Tela de auditoria | `ppw_client/src/app/auditoria/page.tsx` |
| Tela de notificações | `ppw_client/src/app/notificacoes/page.tsx` |

### Regras de fluxo verificadas

- Os sete estados são `BACKLOG`, `TRIAGEM`, `EM_DESENVOLVIMENTO`, `CODE_REVIEW`, `QA`, `PRONTO_PARA_DEPLOY` e `CONCLUIDO`.
- BUG e FEATURE passam por Code Review; TASK segue diretamente de desenvolvimento para QA.
- FEATURE exige critérios de aceite com pelo menos 20 caracteres antes do início do desenvolvimento.
- Ações de triagem, desenvolvimento, revisão, QA e deploy possuem perfis autorizados específicos; o backend consulta novamente as regras ao executar uma transição.
- A edição genérica não pode alterar o status e o tipo da issue é imutável após a criação.
- `If-Match` exige a versão atual: versão ausente resulta em 428; conflito de versão resulta em 409. Transição incompatível retorna 422 e perfil sem permissão retorna 403.
- O histórico registra ação, estado anterior e novo, autor, perfil, justificativa, timestamp e versão. No PostgreSQL, a alteração da issue e o evento de auditoria são gravados na mesma transação; trigger impede UPDATE e DELETE no histórico.

## 6. Dificuldades reais e como foram tratadas

### 6.1 Preservar a base existente

O trabalho começou sobre um repositório já estruturado em Next.js e NestJS. Foi necessário entender as camadas existentes e evoluir o projeto sem recriá-lo do zero. Também foi importante manter as mudanças na branch `feat/complex-issue-workflow`, preservando o histórico de commits e separando a entrega da `main`.

### 6.2 Respeitar o fluxo e as permissões

Durante o teste manual, a primeira tentativa de iniciar a triagem foi feita com o perfil Desenvolvedor. A API não liberou a ação porque a regra correta exige TRIAGER ou ADMIN. A troca para o perfil Triagem revelou `INICIAR_TRIAGEM`; depois foram testados os perfis Desenvolvedor, Revisor, QA e Responsável pelo deploy. Isso ajudou a confirmar que a interface não deveria oferecer uma ação apenas por conveniência visual: ela precisava refletir o resultado da API.

### 6.3 Conectar ao PostgreSQL institucional

A conexão ao banco dependia da Forcepoint VPN e das permissões disponibilizadas pela instituição. A conta não tinha permissão de criação no schema `public`, então a aplicação foi configurada para usar o schema autorizado da própria conta. Na integração com Prisma ORM 7.10.0 e `@prisma/adapter-pg`, também foi necessário passar explicitamente o schema nas opções do adaptador, além de mantê-lo na `DATABASE_URL`.

### 6.4 Diagnosticar o erro de auditoria e o limite de conexões

Na validação pela interface, a consulta `GET /issues/4/history` retornou HTTP 500. A primeira resposta do navegador mostrava apenas `Internal server error`; a inspeção do terminal do NestJS revelou o código Prisma `P2037`, com a mensagem `too many connections for role` no PostgreSQL. Portanto, o problema não era perda dos eventos nem defeito de renderização: o banco estava recusando novas conexões para a conta.

A configuração do `PrismaPg` foi ajustada para `max: 1`, `idleTimeoutMillis: 5000` e `connectionTimeoutMillis: 5000`, compatibilizando o pool com o limite restrito do ambiente compartilhado. Após reiniciar o backend, a consulta voltou a retornar os seis eventos da issue #4 e a interface passou a exibi-los. A página global de auditoria também apresentou os sete registros existentes.

### 6.5 Validar sem confundir arquivos gerados com código-fonte

Durante a inspeção do VS Code, um arquivo JavaScript dentro de `dist` chamou atenção por estar em vermelho. A análise identificou que era saída gerada pelo compilador TypeScript, não o arquivo-fonte a editar. A alteração correta deveria ser feita no `.ts` dentro de `src`, deixando a compilação regenerar `dist`.

## 7. Validação prática realizada em 13/11/2026

Na issue de teste #4, criada pela interface e persistida no PostgreSQL, foi executado o fluxo completo:

1. `BACKLOG` → `TRIAGEM`, ação `INICIAR_TRIAGEM`, perfil `TRIAGER`, versão 2.
2. `TRIAGEM` → `EM_DESENVOLVIMENTO`, ação `INICIAR_DESENVOLVIMENTO`, perfil `DEVELOPER`, versão 3.
3. `EM_DESENVOLVIMENTO` → `CODE_REVIEW`, ação `ENVIAR_PARA_REVISAO`, perfil `DEVELOPER`, versão 4.
4. `CODE_REVIEW` → `QA`, ação `APROVAR_REVISAO`, perfil `REVIEWER`, versão 5.
5. `QA` → `PRONTO_PARA_DEPLOY`, ação `APROVAR_QA`, perfil `QA`, versão 6.
6. `PRONTO_PARA_DEPLOY` → `CONCLUIDO`, ação `LIBERAR_DEPLOY`, perfil `RELEASE_MANAGER`, versão 7.

Os seis eventos foram consultados diretamente em `GET /issues/4/history`, apareceram na trilha da issue e foram exibidos na página global `/auditoria`. O registro global mostrou sete eventos no total, pois também continha uma transição anterior da issue #1.

A issue #4, de prioridade MEDIA, apresentou SLA de 72 horas e foi classificada como `Concluída no prazo`. A validação também confirmou a consulta dos projetos, criação da issue, persistência após reinício do backend e integração de notificações com o PostgreSQL em testes anteriores.

### CI e estado da branch

- Commit da correção do pool: `ea8fc104635ced4de51903b3be400e2966822cec` — `Limita o pool de conexões do PostgreSQL`.
- Execução do GitHub Actions: `43493281543`, workflow `Validação do projeto`, conclusão `success`.
- Job `Backend NestJS`: instalação, compilação, lint e testes concluídos com sucesso.
- Job `Frontend Next.js`: instalação, lint, verificação de tipos TypeScript e build concluídos com sucesso.
- A branch de trabalho foi enviada ao GitHub e está separada da `main`; a Pull Request #9 está aberta para revisão, sem merge realizado.

## 8. Limitações conhecidas e melhorias futuras

1. **Autenticação:** implementar identidade real e obter ator/papel de uma sessão autenticada, em vez de confiar nos campos enviados pelo cliente.
2. **Entrega de eventos:** avaliar Outbox transacional e fila durável, com retentativa e idempotência, para reduzir o risco de notificações não processadas.
3. **SLA:** definir calendário de atendimento, feriados, pausas e regras de suspensão caso o domínio exija.
4. **Teste de integração de banco:** adicionar um ambiente de CI com PostgreSQL efêmero para exercitar transações, trigger de imutabilidade e concorrência no banco real, além dos testes isolados atuais.
5. **Pool de conexões:** o limite de uma conexão resolve a restrição da conta institucional, mas reduz a capacidade de paralelismo. Em produção, o limite deve ser dimensionado conforme a cota do banco e a quantidade de instâncias.

## 9. Reflexão do estudante — texto-base revisado

> Durante o desenvolvimento, percebi que implementar um fluxo de issues é mais do que trocar o status de um registro. Foi necessário definir quem pode executar cada ação, em qual estado ela é válida e quais condições precisam ser atendidas. A separação entre estados, políticas por tipo e observadores deixou essas responsabilidades mais claras e evitou concentrar todas as regras em um único ponto.

> Uma das partes mais trabalhosas foi integrar o sistema ao PostgreSQL disponibilizado pela instituição. A conexão dependia da VPN, a conta tinha permissões diferentes das esperadas no schema padrão e a configuração do Prisma precisou ser ajustada para respeitar o schema autorizado. Durante os testes, surgiu ainda um erro de limite de conexões (`P2037`) que fazia a consulta do histórico retornar HTTP 500. Em vez de presumir que os registros tinham sido perdidos, investigamos a resposta da API, o Network do navegador e o log do NestJS. A redução do pool para uma conexão resolveu o problema e permitiu confirmar os seis eventos da issue de teste, tanto na tela individual quanto na auditoria global.

> Também ficou claro que uma implementação pode passar nos testes automatizados e ainda apresentar problemas no ambiente real. Por isso, foi importante validar o cadastro pela interface, acompanhar as transições com perfis diferentes, consultar o banco e reiniciar o backend para verificar a persistência. O uso da IA ajudou a organizar ideias, revisar decisões e acelerar a investigação, mas as sugestões precisaram ser confrontadas com o código, os erros reais e os resultados dos testes. Para uma evolução futura, eu priorizaria autenticação real, entrega durável de eventos e testes de integração com PostgreSQL no CI.

**Nota de autoria:** este texto foi redigido com auxílio da IA a partir dos fatos registrados durante o desenvolvimento. Antes da entrega, cada integrante deve revisar a redação e ajustar qualquer avaliação subjetiva para que represente sua própria experiência e participação.

## 10. Integridade do registro

Este documento distingue requisitos, decisões, evidências observadas e limitações. A seção de resposta à IA é uma síntese técnica, não uma transcrição literal. As validações do PostgreSQL institucional foram manuais e dependiam da VPN; o CI automatizado executou os jobs de backend e frontend. Não se afirma que autenticação real, Outbox ou calendário comercial de SLA estejam implementados.