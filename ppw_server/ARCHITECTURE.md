# Arquitetura do backend

O backend organiza issues e projetos em camadas inspiradas na Clean Architecture. As pastas `domain`, `application` e `infrastructure` separam as regras e os contratos da implementação em memória; controllers e DTOs ficam na camada HTTP dos módulos.

## Camadas

- **domain/**: entidades e tipos centrais do sistema.
- **application/**: casos de uso e contratos (portas) dos repositórios.
- **infrastructure/**: implementações concretas dos repositórios. Atualmente, os dados ficam em memória.
- **Camada HTTP**: controllers e DTOs NestJS recebem as requisições, validam os dados e devolvem respostas.

## Direção das dependências

Controllers chamam casos de uso. Os casos de uso dependem de contratos de repositório, não da implementação em memória. Os módulos NestJS conectam esses contratos às implementações concretas usando tokens de injeção de dependência.

Na criação e edição de uma issue, o caso de uso verifica se o projeto informado existe. A API também rejeita campos inválidos, propriedades extras e atualizações vazias.

## Limites atuais

- Os repositórios são em memória. Ao reiniciar o backend, as alterações feitas durante a execução são perdidas.
- Não há autenticação nem autorização. A API deve ser usada apenas no ambiente de desenvolvimento/demonstração; CORS não substitui controle de acesso.
- Os casos de uso usam recursos de injeção de dependência e exceções do NestJS, então a separação em camadas é pragmática, não uma implementação totalmente independente de framework.

Para adicionar persistência, pode-se criar outra implementação dos contratos de repositório e registrá-la nos módulos, mantendo os casos de uso e controllers.
