# Simulador de Escalonamento

Aplicação web para simular algoritmos de escalonamento de CPU (RR, RR Prioridade, RM e EDF), visualizar o Gantt, reproduzir a execução passo a passo e exportar o LOG em TXT.

## Requisitos

- Node.js 18+
- npm

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

Abra o endereço exibido no terminal (geralmente `http://localhost:5173`).

## Build de produção

```bash
npm run build
npm run preview
```

## Lint e formatação

```bash
npm run lint      # verifica lint e formatação (Biome)
npm run format    # formata os arquivos
npm run check     # corrige automaticamente o que for possível
```

## Como usar

1. **Carregar configuração** — arraste um arquivo `.json` para a área de upload, cole/edite o JSON no editor ou use os botões **Exemplo EDF** / **Exemplo RR**.
2. **Escolher algoritmo** — selecione RR, RR Prioridade, RM ou EDF no seletor (substitui o `scheduler_name` do JSON na simulação).
3. **Simular** — clique em **Simular**. O cabeçalho exibirá tempo, algoritmo e utilização.
4. **Timeline** — Gantt estático com cores por tarefa, tooltips e marcadores de deadline (RM/EDF).
5. **Playback** — controle play/pause, passos e velocidade para animar a execução fatia a fatia.
6. **Estatísticas** — TAT/WT, escalonabilidade, starvation e deadline miss.
7. **LOG** — visualize o relatório em português e baixe como `.txt`.

## Formato do JSON

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
| `tasks[].quantum` | Quantum (RR/PRR) |
| `tasks[].deadline` | Deadline relativo ao release |

Exemplos prontos em `public/examples/edf-example.json` e `public/examples/rr-example.json`.

## Algoritmos

| Nome | Tipo | Descrição |
|------|------|-----------|
| RR | Tradicional | Fila circular com quantum da tarefa em execução |
| PRR | Tradicional | Menor `computation_time` = maior prioridade; desempate por chegada |
| RM | Tempo real | Menor `period_time` = maior prioridade; teste Liu & Layland |
| EDF | Tempo real | Menor deadline absoluto primeiro; teste U ≤ 1 |

## Stack

- Vite + React + TypeScript
- shadcn/ui + Tailwind CSS
- Zod (validação do JSON)
