# AI Software Factory

Sistema multi-agente de IA que automatiza etapas do ciclo de vida de desenvolvimento de software — da leitura de requisitos à criação de itens no Jira, passando por análise de código, planejamento, arquitetura, geração de código e testes.

---

## Descrição

O **AI Software Factory** é um pipeline automatizado construído em **Node.js + TypeScript** que orquestra 10 agentes de IA para transformar um arquivo de requisito de funcionalidade em:

- Requisito estruturado
- Histórias de usuário e tasks técnicas
- Estrutura de código (Flutter ou C#/.NET)
- Casos de teste
- Itens no Jira (Epic → Story → Subtask)
- Branch Git com commit e push automáticos

O sistema suporta múltiplos projetos via arquivo de configuração e utiliza **cache de artefatos** para evitar reprocessamento.

---

## Funcionalidades

- **CLI interativo** — entrada de dados via terminal
- **Suporte multi-projeto** — configurado via `project.config.json`
- **Detecção automática de tecnologia** — Flutter (Dart) e C# (.NET)
- **Git automation** — criação de branch, commit e push
- **Ingestão de feature files** — suporta `.txt`, `.md`, `.xml`
- **10 agentes especializados** — cada um com responsabilidade única
- **Cache de artefatos** — resultados salvos em JSON, reaproveitados em re-execuções
- **Integração Jira** — Epic → Story → Subtask com resolução de tipos por ID
- **Sistema de logs** — arquivo `logs/execution.log` + console com timestamps
- **Pipeline resiliente** — falha em um step não interrompe os demais (exceto Git)

---

## Arquitetura

```
Feature File
     ↓
    CLI
     ↓
 Orchestrator ──→ 10 Steps
     │
     ├── Git Agent
     ├── Code Analysis Agent
     ├── Refactor Agent
     ├── Requirement Agent
     ├── Planning Agent
     ├── Architecture Agent
     ├── Dev Agent
     ├── Test Agent
     ├── Jira Agent
     └── PR Agent
```

### Camadas

| Camada | Responsabilidade |
|--------|-----------------|
| **Agents** | Lógica de cada etapa do pipeline |
| **Services** | Integrações externas (Jira, Git, LLM, Artefatos) |
| **Models** | Interfaces TypeScript para dados entre agentes |
| **Prompts** | Templates de prompt para o LLM |
| **Orchestrator** | Controle de fluxo do pipeline |
| **Utils** | CLI, Logger, LLM mock |
| **Config** | Configuração de projetos e variáveis de ambiente |

---

## Estrutura do Projeto

```
ai-software-factory/
├── src/
│   ├── agents/
│   │   ├── architecture.agent.ts
│   │   ├── code-analysis.agent.ts
│   │   ├── dev.agent.ts
│   │   ├── git.agent.ts
│   │   ├── jira.agent.ts
│   │   ├── planning.agent.ts
│   │   ├── pr.agent.ts
│   │   ├── refactor.agent.ts
│   │   ├── requirement.agent.ts
│   │   └── test.agent.ts
│   ├── config/
│   │   ├── env.ts
│   │   └── project.config.json
│   ├── models/
│   │   ├── architecture.model.ts
│   │   ├── codeAnalysis.model.ts
│   │   ├── projectConfig.model.ts
│   │   ├── refactor.model.ts
│   │   ├── requirement.model.ts
│   │   ├── story.model.ts
│   │   ├── task.model.ts
│   │   └── testCase.model.ts
│   ├── orchestrator/
│   │   └── orchestrator.ts
│   ├── prompts/
│   │   ├── architecture.prompt.ts
│   │   ├── planning.prompt.ts
│   │   └── requirement.prompt.ts
│   ├── services/
│   │   ├── artifact.service.ts
│   │   ├── featureFile.service.ts
│   │   ├── git.service.ts
│   │   ├── jira.service.ts
│   │   ├── llm.service.ts
│   │   └── projectConfig.service.ts
│   ├── utils/
│   │   ├── cli.ts
│   │   ├── llm.ts
│   │   └── logger.ts
│   └── index.ts
├── logs/
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## Configuração

### project.config.json

Suporta múltiplos projetos. Cada entrada define:

| Campo | Descrição |
|-------|-----------|
| `name` | Identificador do projeto (usado no CLI) |
| `path` | Caminho absoluto do projeto no disco |
| `technology` | `flutter` ou `netcore` |
| `jiraProjectKey` | Chave do projeto no Jira (ex: `TPA`) |
| `defaultBranch` | Branch padrão (`main`, `develop`, etc.) |
| `featuresFolder` | Pasta onde os feature files são copiados |

**Exemplo:**

```json
{
  "projects": [
    {
      "name": "task_pair_app",
      "path": "D:\\desenvolvimento\\FLUTTER\\task_pair_app",
      "technology": "flutter",
      "jiraProjectKey": "TPA",
      "defaultBranch": "main",
      "featuresFolder": "features"
    },
    {
      "name": "GestorOperacionalWeb",
      "path": "D:\\desenvolvimento\\NETCORE\\GestorOperacionalWeb",
      "technology": "netcore",
      "jiraProjectKey": "GOW",
      "defaultBranch": "main",
      "featuresFolder": "features"
    }
  ]
}
```

### Variáveis de Ambiente

Criar arquivo `.env` na raiz do projeto:

```env
JIRA_URL=https://seu-dominio.atlassian.net/
JIRA_EMAIL=seu-email@exemplo.com
JIRA_TOKEN=seu_api_token
JIRA_PROJECT=TPA
```

> **Importante:**
> - `JIRA_URL` deve incluir `https://` e terminar com `/`
> - `JIRA_PROJECT` deve ser a **chave** do projeto (não o nome)
> - O token é gerado em: https://id.atlassian.com/manage-profile/security/api-tokens

---

## Instalação

```bash
# 1. Clonar o repositório
git clone https://github.com/seu-usuario/ai-software-factory.git
cd ai-software-factory

# 2. Instalar dependências
npm install

# 3. Criar arquivo .env (veja seção acima)

# 4. Configurar projetos em src/config/project.config.json
```

---

## Uso

```bash
npm run dev
```

O CLI solicitará 3 informações:

```
📦 Project name: task_pair_app
🔖 Feature name: login_social
📄 Requirement file path: D:\docs\login_social.md
```

---

## Fluxo de Execução

O orchestrator executa 10 steps sequenciais:

```
[STEP  1] Git Agent          — START
[STEP  1] Git Agent          — DONE
[STEP  2] Code Analysis      — START
[STEP  2] Code Analysis      — DONE
...
[STEP 10] PR Agent           — DONE
```

### Detalhamento

| Step | Agente | Descrição |
|------|--------|-----------|
| 1 | **Git Agent** | Faz checkout da branch padrão, cria branch `features/[nome]`. **Crítico** — falha aborta o pipeline. |
| 2 | **Code Analysis Agent** | Escaneia o projeto e extrai módulos, services, repositories, controllers (Flutter ou C#). |
| 3 | **Refactor Agent** | Analisa código-fonte e gera relatório de oportunidades de refatoração. |
| 4 | **Requirement Agent** | Processa o feature file e gera requisito estruturado via LLM. |
| 5 | **Planning Agent** | Gera histórias de usuário e tasks técnicas via LLM. |
| 6 | **Architecture Agent** | Define estrutura de implementação (layers, novos arquivos, arquivos a alterar). |
| 7 | **Dev Agent** | Gera scaffold de código (Flutter: `lib/features/` / C#: `Application/`, `Domain/`, `API/`). |
| 8 | **Test Agent** | Gera casos de teste e arquivos placeholder de teste. |
| 9 | **Jira Agent** | Cria Epic, Stories e Subtasks no Jira via API REST v3. |
| 10 | **PR Agent** | Executa `git add`, `git commit`, `git push`. Falha no push não aborta o pipeline. |

### Cache de Artefatos

Agentes dos steps 2 a 8 salvam seus resultados em:

```
[projectPath]/ai/[tipo]/FEATURE_[NOME].json
```

Em re-execuções, se o artefato já existir, o agente reutiliza o cache sem reprocessar.

**Tipos de artefato:** `code-analysis`, `refactor`, `requirement`, `planning`, `architecture`, `tests`, `review`

---

## Exemplo de Saída

Após executar com `feature: login_social` no projeto `task_pair_app`:

```
✓ Branch criada: features/login_social
✓ Feature file copiado para: features/FEATURE_LOGIN_SOCIAL.md
✓ Artefatos salvos em: ai/requirement/, ai/planning/, ai/architecture/
✓ Scaffold gerado: lib/features/login_social/data/, domain/, presentation/
✓ Jira: Epic + 2 Stories + 6 Subtasks criados
✓ Commit e push realizados
```

---

## Suporte a Tecnologias

| Tecnologia | Análise de Código | Scaffold (Dev Agent) | Detecção |
|------------|:-:|:-:|----------|
| **Flutter** (Dart) | ✅ | ✅ | `pubspec.yaml` na raiz |
| **C# / .NET** | ✅ | ✅ | `.csproj` na raiz ou subpasta |

### Flutter — Estrutura gerada

```
lib/features/[feature]/
├── data/
│   ├── [feature]_service.dart
│   └── [feature]_repository.dart
├── domain/
│   ├── [feature]_usecase.dart
│   └── [feature]_model.dart
└── presentation/
    ├── [feature]_page.dart
    └── [feature]_controller.dart
```

### C# / .NET — Estrutura gerada

```
API/Controllers/[Feature]Controller.cs
Application/Services/[Feature]Service.cs
Application/DTOs/[Feature]Dto.cs
Domain/Entities/[Feature].cs
Domain/Interfaces/I[Feature]Service.cs
Domain/Interfaces/I[Feature]Repository.cs
Infrastructure/Repositories/[Feature]Repository.cs
```

---

## Limitações Atuais

- **LLM mockado** — respostas simuladas, sem integração real com OpenAI/Azure
- **Refactor Agent** — detecta problemas mas não aplica correções automaticamente
- **Jira** — requer configuração manual de tipos de issue no projeto

---

## Roadmap

- [ ] Integração com LLM real (OpenAI / Azure OpenAI)
- [ ] Review Agent (análise de qualidade de código gerado)
- [ ] Estimate Agent (story points e complexidade)
- [ ] Documentation Agent (geração de docs técnicos)
- [ ] RAG com vector database (indexação de código e docs)
- [ ] GitHub API integration (criação automática de Pull Request)
- [ ] Dashboard web para acompanhamento do pipeline

---

## Boas Práticas

- Mantenha os feature files claros e detalhados
- Use nomes consistentes para features (snake_case)
- Valide a configuração do Jira antes de executar
- Verifique se o projeto alvo tem repositório Git inicializado
- Use a pasta `ai/` do projeto para inspecionar artefatos gerados

---

## Tecnologias

- **Node.js** + **TypeScript**
- **ts-node** para execução direta
- **axios** para chamadas HTTP (Jira API)
- **dotenv** para variáveis de ambiente
- **child_process** para operações Git

---

## Licença

MIT
