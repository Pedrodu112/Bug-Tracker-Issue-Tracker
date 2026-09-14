# Plataforma de Bug Tracker / Issue Tracker

Projeto acadêmico simples para acompanhar o fluxo **registro → triagem → desenvolvimento → code review → QA → pronto para deploy → concluído**.

## Tecnologias e estrutura

- `ppw_client/`: Next.js, React, TypeScript e Tailwind CSS.
- `ppw_server/`: NestJS, TypeScript e API REST.
- `iniciar-ambiente.bat`: inicia os dois projetos no ambiente Windows configurado pelo aluno.

Não existe banco de dados, ORM ou autenticação neste projeto. O NestJS mantém dados temporários em memória; a persistência permanente das issues e projetos do usuário é feita no **localStorage do navegador**.

## Como executar

Em dois terminais:

```bash
cd ppw_server
npm install
npm run start:dev
```

```bash
cd ppw_client
npm install
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

Também é possível usar `iniciar-ambiente.bat` no local configurado pelo arquivo.

## API

| Método | Rota | Função |
| --- | --- | --- |
| GET | `/issues` | Lista issues |
| GET | `/issues/:id` | Busca uma issue |
| POST | `/issues` | Cria uma issue |
| PATCH | `/issues/:id` | Atualiza uma issue |
| DELETE | `/issues/:id` | Exclui uma issue |
| GET | `/projetos` e `/projetos/:id` | Consulta projetos |

## Fluxo de dados

```text
Usuário → Next.js → src/lib/api.ts → NestJS Controller → Service (memória)
                                           ↓ resposta
                         Next.js → estado React → src/lib/storage.ts → localStorage
```

No primeiro acesso, o frontend obtém issues e projetos da API e os salva no localStorage. Nos acessos seguintes, os dados locais são usados sem serem sobrescritos pelo backend. Criações, edições e exclusões primeiro chamam a API e, após a resposta válida, atualizam o localStorage.

## Arquivos principais

- `ppw_server/src/main.ts`: habilita CORS para o frontend e inicia a API na porta 8000.
- `ppw_server/src/issues/`: controller, service em memória, tipos e DTOs das issues.
- `ppw_server/src/projects/`: consulta dos projetos iniciais.
- `ppw_client/src/app/`: páginas Dashboard, Issues, Nova Issue, detalhes e Projetos.
- `ppw_client/src/lib/api.ts`: chamadas HTTP centralizadas com `fetch`.
- `ppw_client/src/lib/storage.ts`: acesso centralizado ao localStorage.
