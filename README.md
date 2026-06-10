# CPU Scheduling Simulator

**Aplicação online:** [https://gugacarbo.github.io/cpu-scheduling-simulator/](https://gugacarbo.github.io/cpu-scheduling-simulator/)

Simulador web de algoritmos de escalonamento de CPU (RR, RR com prioridade, RM e EDF). Permite carregar configurações em JSON, visualizar o diagrama de Gantt, reproduzir a execução passo a passo e exportar o LOG em TXT com estatísticas e análises de viabilidade.

## Requisitos da atividade

O simulador lê um arquivo de configuração em JSON e gera um **LOG de saída em TXT** com as informações exigidas para cada família de algoritmos.

### Formato de entrada (JSON)

```json
{
  "simulation_time": 14,
  "scheduler_name": "EDF",
  "tasks": [
    {
      "offset": 0,
      "computation_time": 5,
      "period_time": 14,
      "quantum": 1,
      "deadline": 14
    }
  ]
}
```

| Campo | Descrição |
|-------|-----------|
| `simulation_time` | Duração total da simulação |
| `scheduler_name` | `RR`, `PRR`, `RR_PRIORITY`, `RM` ou `EDF` |
| `tasks[].offset` | Tempo de chegada da primeira instância |
| `tasks[].computation_time` | Tempo de CPU por job |
| `tasks[].period_time` | Período entre liberações |
| `tasks[].quantum` | Quantum (RR / PRR) |
| `tasks[].deadline` | Deadline relativo ao release |

Exemplos prontos: [`public/examples/edf-example.json`](public/examples/edf-example.json) e [`public/examples/rr-example.json`](public/examples/rr-example.json).

### Algoritmos tradicionais

Dado o JSON de entrada, o LOG em TXT deve contemplar:

| Algoritmo | Descrição |
|-----------|-----------|
| **RR** | Round Robin |
| **PRR** | RR alternativo com prioridades fixas — quanto menor o `computation_time`, maior a prioridade |

**Informações obrigatórias no LOG:**

- Sequência de execução das tarefas
- Nível de utilização do sistema
- Turnaround time médio de cada tarefa (`TAT_avgⁿ`) entre as múltiplas execuções
- Turnaround time médio do sistema (`TAT_avg`)
- Waiting time médio de cada tarefa (`WT_avgⁿ`) entre as múltiplas execuções
- Waiting time médio do sistema (`WT_avg`)
- Tarefas com maior e menor waiting time médio
- Identificação de starvation, se houver

### Algoritmos de tempo real

Dado o JSON de entrada, o LOG em TXT deve contemplar:

| Algoritmo | Descrição |
|-----------|-----------|
| **RM** | Rate Monotonic — menor `period_time` implica maior prioridade; teste Liu & Layland |
| **EDF** | Earliest Deadline First — menor deadline absoluto primeiro; teste U ≤ 1 |

**Informações obrigatórias no LOG:**

- Resultado do teste de escalonabilidade do conjunto de tarefas
- Sequência de execução das tarefas
- Em caso de perda de deadline:
  - Percentual de perdas da tarefa
  - Percentual de perdas do sistema
- Nível de utilização do sistema
- `TAT_avgⁿ`, `TAT_avg`, `WT_avgⁿ` e `WT_avg`
- Tarefas com maior e menor waiting time médio
- Identificação de starvation, se houver

Documento completo da especificação: [`REQUIREMENTS.md`](REQUIREMENTS.md).

## Como usar

1. **Carregar configuração** — arraste um `.json` para a área de upload, edite o JSON no editor ou use **Exemplo EDF** / **Exemplo RR**.
2. **Escolher algoritmo** — selecione RR, RR Prioridade, RM ou EDF (substitui o `scheduler_name` do JSON na simulação).
3. **Simular** — o cabeçalho exibe tempo, algoritmo e utilização.
4. **Timeline** — Gantt com cores por tarefa, tooltips e marcadores de deadline (RM/EDF).
5. **Playback** — play/pause, passos e velocidade para animar fatia a fatia.
6. **Estatísticas** — TAT/WT, escalonabilidade, starvation e deadline miss.
7. **LOG** — visualize o relatório em português e baixe como `.txt`.

## Stack

- Vite + React + TypeScript
- shadcn/ui + Tailwind CSS
- Zod (validação do JSON)

## Desenvolvimento

### Requisitos do ambiente

- Node.js 18+ (CI usa Node 22)
- pnpm 9+

### Instalação

```bash
pnpm install
```

### Servidor local

```bash
pnpm dev
```

Abra o endereço exibido no terminal (geralmente `http://localhost:5173`).

### Build e preview

```bash
pnpm build
pnpm preview
```

### Lint e formatação

```bash
pnpm lint      # verifica lint e formatação (Biome)
pnpm format    # formata os arquivos
pnpm check     # corrige automaticamente o que for possível
```

O deploy para GitHub Pages ocorre automaticamente a cada push na branch `main` (workflow em [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

---

**Aplicação online:** [https://gugacarbo.github.io/cpu-scheduling-simulator/](https://gugacarbo.github.io/cpu-scheduling-simulator/)
