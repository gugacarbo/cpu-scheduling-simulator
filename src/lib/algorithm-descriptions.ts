import type { SchedulerName } from '@/lib/types'

export interface AlgorithmDescription {
  title: string
  body: string
}

const ALGORITHM_DESCRIPTIONS: Record<SchedulerName, AlgorithmDescription> = {
  RR: {
    title: 'Round Robin (RR)',
    body: 'Algoritmo preemptivo que mantém as tarefas prontas em uma fila circular. Cada tarefa executa por um quantum de tempo; ao esgotá-lo, vai para o fim da fila e a próxima é despachada. Garante alternância justa entre processos, evitando que tarefas longas monopolizem a CPU.',
  },
  PRR: {
    title: 'Round Robin com Prioridade (PRR)',
    body: 'Variante do Round Robin em que a prioridade é fixa: menor tempo de computação implica maior prioridade. As tarefas são despachadas em filas circulares respeitando essa ordem, conforme a alternativa RR dos requisitos do projeto. Combina fatiamento por quantum com preferência por tarefas mais curtas.',
  },
  RR_PRIORITY: {
    title: 'Round Robin com Prioridade (PRR)',
    body: 'Variante do Round Robin em que a prioridade é fixa: menor tempo de computação implica maior prioridade. As tarefas são despachadas em filas circulares respeitando essa ordem, conforme a alternativa RR dos requisitos do projeto. Combina fatiamento por quantum com preferência por tarefas mais curtas.',
  },
  RM: {
    title: 'Rate Monotonic (RM)',
    body: 'Escalonador para tarefas periódicas de tempo real com prioridades estáticas. Tarefas com período menor recebem prioridade maior (taxa de execução mais alta). É preemptivo; Liu e Layland estabeleceram condições de utilizabilidade para garantir escalonabilidade em um único processador.',
  },
  EDF: {
    title: 'Earliest Deadline First (EDF)',
    body: 'Escalonador preemptivo com prioridade dinâmica: em cada instante, executa a tarefa cujo prazo absoluto termina primeiro. É ótimo em um único processador para tarefas periódicas quando a utilizabilidade total não excede 100% (U ≤ 1).',
  },
}

export function getAlgorithmDescription(scheduler: SchedulerName): AlgorithmDescription {
  return ALGORITHM_DESCRIPTIONS[scheduler]
}
