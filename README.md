# IssueFlow — Bug Tracker / Issue Tracker

Aplicação acadêmica para organizar bugs, funcionalidades e tarefas, com fluxo de trabalho controlado, regras por tipo de issue, histórico de auditoria, concorrência otimista, SLA e notificações por eventos.

## Tecnologias

- **Frontend:** Next.js 15, React 19, TypeScript e Tailwind CSS.
- **Backend:** NestJS 11, TypeScript e API REST.
- **Runtime validado:** Node.js 24.
- **Armazenamento atual:** adaptadores em memória no backend e cache local no navegador.

## Identidade visual

O projeto utiliza o logotipo vetorial **IssueFlow**, localizado em `ppw_client/public/issueflow-logo.svg`, e seu favicon em `ppw_client/public/favicon.svg`. O símbolo representa caminhos/etapas conectadas do fluxo de uma issue.

## Como executar localmente

### Pré-requisitos

- Node.js 24 e npm.
- Git para clonar o repositório.

### Windows

1. Clone o repositório.
2. Abra a pasta do projeto.
3. Execute `iniciar-ambiente.bat`.
4. Selecione a opção **3 — Iniciar BACKEND + FRONTEND**.

O script usa caminhos relativos à pasta do repositório. Ele aceita Node.js instalado no sistema ou a distribuição portátil `node-v24.21.0-win-x64` colocada na raiz do projeto.

### Linux, macOS ou execução manual

Terminal 1 — backend:

```bash
cd ppw_server
npm ci
npm run start:dev
```

Terminal 2 — frontend:

```bash
cd ppw_client
npm ci
npm run dev
```

Endereços locais:

- Frontend: http://localhost:3000
- API: http://localhost:8000

A variável `NEXT_PUBLIC_API_URL` pode apontar o frontend para outra URL da API. No backend, `PORT` define a porta HTTP e `CORS_ORIGINS` aceita uma lista de origens separadas por vírgula.

### Verificações

No backend:

```bash
npm run build
npm run lint
npm test -- --runInBand
```

No frontend:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

O workflow de GitHub Actions executa essas verificações nos dois projetos.

## Organização do repositório

```text
ppw_client/
  public/                 # Logo e favicon SVG
  src/app/                # Dashboard, issues, projetos e notificações
  src/components/         # Layout e componentes reutilizáveis
  src/lib/                # API HTTP e cache local
  src/types/              # Contratos TypeScript
ppw_server/
  src/issues/domain/      # Issue, estados, eventos, auditoria e SLA
  src/issues/application/ # Casos de uso, portas, State e Observer
  src/issues/infrastructure/ # Repositórios em memória
  src/projects/           # Consulta de projetos
docs/
  implementation-audit.md
  ai-decisions.md
AI-LOG.md
```

## Máquina de estados

O status não pode ser alterado pelo `PATCH /issues/:id`. A mudança exige uma ação específica em `POST /issues/:id/transitions`, com a versão atual no cabeçalho `If-Match`.

```mermaid
stateDiagram-v2
    [*] --> BACKLOG
    BACKLOG --> TRIAGEM: INICIAR_TRIAGEM
    TRIAGEM --> EM_DESENVOLVIMENTO: INICIAR_DESENVOLVIMENTO

    EM_DESENVOLVIMENTO --> CODE_REVIEW: BUG ou FEATURE / ENVIAR_PARA_REVISAO
    CODE_REVIEW --> EM_DESENVOLVIMENTO: SOLICITAR_AJUSTES
    CODE_REVIEW --> QA: APROVAR_REVISAO
    QA --> EM_DESENVOLVIMENTO: REABRIR_DESENVOLVIMENTO

    EM_DESENVOLVIMENTO --> QA: TASK / ENVIAR_PARA_QA
    QA --> PRONTO_PARA_DEPLOY: APROVAR_QA
    PRONTO_PARA_DEPLOY --> CONCLUIDO: LIBERAR_DEPLOY
    CONCLUIDO --> [*]
```

### Regras por tipo

O tipo é definido na criação e permanece imutável. Isso impede que uma issue altere sua categoria no meio do fluxo para contornar uma etapa obrigatória, como o Code Review de BUGs e FEATUREs.

| Tipo | Fluxo | Regra específica |

| --- | --- | --- |
| BUG | Triagem → Desenvolvimento → Code Review → QA → Deploy | Revisão de código obrigatória |
| FEATURE | Triagem → Desenvolvimento → Code Review → QA → Deploy | Exige critérios de aceite com pelo menos 20 caracteres antes do desenvolvimento |
| TASK | Triagem → Desenvolvimento → QA → Deploy | Não passa por Code Review |

### Permissões por ação

| Ação | Perfis autorizados |
| --- | --- |
| Iniciar triagem | TRIAGER, ADMIN |
| Iniciar desenvolvimento | DEVELOPER, ADMIN |
| Enviar BUG/FEATURE para revisão | DEVELOPER, ADMIN |
| Solicitar ajustes / aprovar revisão | REVIEWER, ADMIN |
| Reabrir desenvolvimento após QA | QA, ADMIN |
| Enviar TASK para QA | DEVELOPER, ADMIN |
| Aprovar QA | QA, ADMIN |
| Liberar deploy | RELEASE_MANAGER, ADMIN |

O backend valida novamente a ação, o estado, o perfil e as guardas. **Limite conhecido:** o perfil e o identificador do autor ainda são fornecidos pelo cliente para demonstração; não há autenticação. Portanto, este RBAC demonstra as regras de negócio, mas ainda não é uma fronteira de segurança confiável.

## Modelo conceitual de dados

O diagrama abaixo representa as relações lógicas utilizadas pelo sistema, não um esquema físico de banco de dados. O projeto ainda não possui banco relacional configurado.

```mermaid
erDiagram
    PROJECT ||--o{ ISSUE : contains
    ISSUE ||--o{ ISSUE_HISTORY_ENTRY : records
    ISSUE ||--o{ ISSUE_NOTIFICATION : generates

    PROJECT {
        int id
        string name
        string description
    }
    ISSUE {
        int id
        int projectId
        string title
        string type
        string priority
        string status
        int version
        datetime createdAt
        datetime updatedAt
    }
    ISSUE_HISTORY_ENTRY {
        int id
        int issueId
        string previousStatus
        string newStatus
        string actorId
        string actorRole
        string justification
        datetime timestamp
        int version
    }
    ISSUE_NOTIFICATION {
        int id
        int issueId
        string recipientId
        string type
        string message
        datetime createdAt
        boolean read
    }
```

## Princípios SOLID aplicados

- **SRP:** casos de uso orquestram; políticas definem transições; guardas validam pré-condições; repositórios cuidam de armazenamento; o Observer trata notificações.
- **OCP:** o caso de uso depende da interface `IssueTransitionPolicy`; novas estratégias podem ser registradas no `IssueTransitionPolicyRegistry` sem inserir condicionais por tipo no fluxo de aplicação.
- **LSP:** `BugTransitionPolicy`, `FeatureTransitionPolicy` e `TaskTransitionPolicy` cumprem o mesmo contrato e podem ser usadas pelo caso de uso sem depender de suas classes concretas.

## Auditoria, concorrência e rollback

- Toda transição bem-sucedida gera um registro append-only com issue, ação, estado anterior/novo, autor, perfil, justificativa, timestamp e versão.
- A atualização de status e a inclusão do histórico são agrupadas no mesmo trecho síncrono do adaptador em memória. Um teste injeta falha na gravação da auditoria e verifica que nem o status nem o histórico são alterados.
- Edições e transições exigem `If-Match`. Cabeçalho ausente resulta em **428**; versão desatualizada resulta em **409**.
- Transição incompatível com o estado resulta em **422**; perfil sem permissão resulta em **403**.
- O teste de concorrência disputa uma edição comum e uma transição usando a mesma versão e confirma que só uma operação é aceita.

**Limitação importante:** a atomicidade e o controle de concorrência verificados são locais ao adaptador em memória e a um único processo. Não representam transação ACID nem garantem coordenação entre múltiplas instâncias. A persistência transacional real depende da escolha e integração futura do banco.

## SLA por prioridade

A contagem começa em `createdAt` e termina na transição para `CONCLUIDO`.

| Prioridade | Prazo de referência |
| --- | ---: |
| CRITICA | 4 horas |
| ALTA | 8 horas |
| MEDIA | 72 horas |
| BAIXA | 168 horas |

A issue é classificada como **em risco** ao consumir 80% do prazo e **vencida** ao ultrapassar o limite. Conclusões são classificadas como dentro ou fora do prazo. Esses valores são parâmetros acadêmicos configuráveis do projeto.

## Eventos, Observer e menções

Os casos de uso publicam eventos de criação, edição e transição. O `IssueEventBus` notifica observadores inscritos; o `IssueNotificationObserver` converte eventos em notificações sem colocar regras de notificação dentro da FSM.

- Menções são reconhecidas no título, descrição e critérios de aceite com a sintaxe `@usuario`.
- Uma nova atribuição gera notificação ao novo responsável.
- Uma transição gera notificação ao responsável atual, exceto quando ele próprio executa a ação.
- A central de notificações fica na rota `/notificacoes`; a API expõe `GET /notifications/:recipientId`.
- A trilha global de auditoria fica na rota `/auditoria`, com links para abrir cada issue e consultar sua linha do tempo.

As notificações usam repositório em memória. O barramento é desacoplado, mas não é uma fila durável nem uma implementação de Outbox.

## API principal

| Método | Rota | Função |
| --- | --- | --- |
| GET | `/issues` | Lista issues |
| GET | `/issues/:id` | Consulta uma issue |
| POST | `/issues` | Cria uma issue |
| PATCH | `/issues/:id` | Edita campos, sem permitir status |
| POST | `/issues/:id/transitions` | Executa uma ação válida da FSM |
| GET | `/issues/:id/actions?actorRole=...` | Lista ações disponíveis para o perfil informado |
| GET | `/issues/:id/history` | Consulta histórico da issue |
| GET | `/issues/audit` | Consulta o histórico global |
| GET | `/issues/:id/sla` | Calcula o estado atual do SLA |
| GET | `/notifications/:recipientId` | Consulta notificações do destinatário |
| GET | `/projetos` e `/projetos/:id` | Consulta projetos |
| DELETE | `/issues/:id` | Exclui uma issue |

Exemplo de transição:

```http
POST /issues/12/transitions
If-Match: "3"
Content-Type: application/json

{
  "action": "INICIAR_TRIAGEM",
  "actorId": "triager-01",
  "actorRole": "TRIAGER",
  "justification": "Triagem iniciada após a análise inicial."
}
```

## Persistência e limitações conhecidas

- Não há banco de dados, ORM, autenticação, tabela de usuários ou fila de mensagens configurados.
- Issues, projetos, histórico e notificações do backend residem em memória e são perdidos ao reiniciar o servidor.
- O `localStorage` do frontend funciona como cache de consulta e contingência visual; não substitui persistência no servidor.
- As regras RBAC são demonstrativas enquanto o backend aceitar `actorId` e `actorRole` enviados no corpo da requisição.
- A auditoria em memória não deve ser descrita como ACID. Para isso é necessário gravar issue e histórico na mesma transação de banco.

## Documentação de uso de IA

- `AI-LOG.md`: índice do registro de uso de IA.
- `docs/ai-decisions.md`: desafio, prompt, resposta registrada, análise crítica e alterações aplicadas.

O código deve ser revisado e compreendido pelos integrantes antes da defesa. O registro distingue o que foi implementado, as limitações e os pontos que ainda dependem de infraestrutura futura.
