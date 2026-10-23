# Arquitetura do backend

O backend organiza os módulos de issues e projetos em camadas inspiradas na Clean Architecture.

## Camadas

- **domain/**: entidades e tipos centrais, sem dependência do NestJS.
- **application/**: casos de uso e contratos (portas) dos repositórios.
- **infrastructure/**: implementação concreta dos repositórios; atualmente os dados ficam em memória.
- **presentation**: controllers NestJS e DTOs HTTP, responsáveis por receber requisições, validar entradas e devolver respostas.

## Direção das dependências

Controllers chamam casos de uso. Casos de uso dependem de interfaces de repositório, não da implementação em memória. Os módulos NestJS conectam as interfaces às implementações concretas por tokens de injeção de dependência.

## Limite atual

Os repositórios em memória são reinicializados quando o backend reinicia. Não há banco de dados nem persistência permanente no servidor. Para adicionar um banco futuramente, basta criar outra implementação do contrato de repositório e registrá-la no módulo, preservando os casos de uso e os controllers.
