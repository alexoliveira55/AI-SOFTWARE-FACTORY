# AI Software Factory (MVP)

## Visão Geral

Este projeto tem como objetivo criar uma arquitetura de agentes de IA capazes de:

1. Ler uma necessidade de negócio
2. Gerar requisitos de software
3. Gerar histórias de usuário
4. Gerar tasks técnicas
5. Criar automaticamente itens no Jira
6. Evoluir futuramente para análise de código, testes, estimativas e arquitetura

Este é o **MVP (Minimum Viable Product)** de uma futura **AI Software Factory**.

---

# Arquitetura Inicial (MVP)

## Fluxo do Sistema

```
Necessidade
    ↓
Requirement Agent
    ↓
Planning Agent
    ↓
Jira Agent
    ↓
Criação de Stories e Tasks no Jira
```

---

# Estrutura do Projeto

```
ai-software-factory/
│
├── src/
│   ├── agents/
│   │   ├── requirement.agent.ts
│   │   ├── planning.agent.ts
│   │   └── jira.agent.ts
│   │
│   ├── models/
│   │   ├── requirement.model.ts
│   │   ├── story.model.ts
│   │   └── task.model.ts
│   │
│   ├── services/
│   │   └── jira.service.ts
│   │
│   ├── prompts/
│   │   ├── requirement.prompt.ts
│   │   └── planning.prompt.ts
│   │
│   ├── orchestrator/
│   │   └── orchestrator.ts
│   │
│   ├── utils/
│   │   └── llm.ts
│   │
│   └── index.ts
│
├── .env
├── package.json
└── README.md
```

---

# Setup do Projeto

## 1. Criar projeto Node + TypeScript

```bash
mkdir ai-software-factory
cd ai-software-factory

npm init -y
npm install axios dotenv
npm install -D typescript ts-node @types/node

npx tsc --init
```

---

## 2. Rodar o projeto

```
npx ts-node src/index.ts
```

---

# Variáveis de Ambiente

Criar arquivo `.env`:

```
JIRA_URL=https://seu-dominio.atlassian.net
JIRA_EMAIL=seuemail
JIRA_TOKEN=seu_token
JIRA_PROJECT=DEV
```

---

# Agentes do Sistema (MVP)

## Requirement Agent

Responsável por:

* Ler a necessidade
* Gerar requisito estruturado
* Regras de negócio
* Critérios de aceite
* Módulos impactados

## Planning Agent

Responsável por:

* Criar histórias de usuário
* Criar tasks técnicas
* Estimativas em horas
* Dependências

## Jira Agent

Responsável por:

* Criar Stories
* Criar Tasks
* Futuramente criar Epics
* Vincular Tasks às Stories

## Orchestrator

Responsável por:

* Controlar o fluxo dos agentes
* Executar o pipeline completo

---

# Modelos de Dados

## Requirement

```
{
  "title": "",
  "description": "",
  "businessRules": [],
  "acceptanceCriteria": [],
  "affectedModules": []
}
```

## Story

```
{
  "title": "",
  "description": "",
  "acceptanceCriteria": [],
  "tasks": []
}
```

## Task

```
{
  "title": "",
  "description": "",
  "estimateHours": 0
}
```

---

# Roadmap de Evolução

## Fase 1 – MVP

* Requirement Agent
* Planning Agent
* Jira Agent
* Orchestrator
* Prompts estruturados
* Criação de Story e Task no Jira

## Fase 2 – Análise de Código

* Code Analysis Agent
* Ler repositório Flutter
* Identificar módulos afetados
* Sugerir arquivos a alterar

## Fase 3 – Arquitetura

* Architecture Agent
* Definição de APIs
* Models
* Migrations
* Diagramas

## Fase 4 – Testes

* Test Agent
* Testes unitários
* Testes integração
* BDD
* Casos de teste

## Fase 5 – Estimativas

* Estimate Agent
* Story points
* Complexidade
* Riscos

## Fase 6 – RAG (Vector Database)

* Indexar código
* Indexar documentação
* IA responder baseada no sistema

## Fase 7 – Multi-Agent Completo

Arquitetura final:

```
Orchestrator
    ├── Requirement Agent
    ├── Code Agent
    ├── Architecture Agent
    ├── Test Agent
    ├── Estimate Agent
    ├── Planning Agent
    ├── Jira Agent
    ├── Documentation Agent
    └── Prototype Agent
```

---

# Objetivo Final

No estágio final, o sistema deverá ser capaz de:

```
Usuário descreve funcionalidade
        ↓
IA analisa sistema
        ↓
IA cria requisito
        ↓
IA cria arquitetura
        ↓
IA cria testes
        ↓
IA estima esforço
        ↓
IA cria backlog
        ↓
IA cria itens no Jira
        ↓
IA sugere código
```

Isso transformará o projeto em uma **AI Software Factory**.

---

# Próximos Passos Imediatos

1. Criar estrutura do projeto
2. Implementar Requirement Agent
3. Implementar Planning Agent
4. Implementar Jira Agent
5. Implementar Orchestrator
6. Executar primeiro fluxo completo
7. Criar Epics automaticamente
8. Vincular Stories e Tasks corretamente
9. Criar Code Analysis Agent
10. Implementar RAG com código Flutter

```
```
