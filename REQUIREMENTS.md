# Descrição da Atividade

Desenvolva um software que realize a simulação de diferentes algoritmos de escalonamento para a obtenção de informações estatísticas e análises de viabilidade de projeto.

O simulador em questão deve ser capaz de ler um arquivo de configuração no formato JSON com o layout conforme o exemplo abaixo:

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
    },
    {
      "offset": 1,
      "computation_time": 2,
      "period_time": 10,
      "quantum": 2,
      "deadline": 5
    },
    {
      "offset": 3,
      "computation_time": 7,
      "period_time": 30,
      "quantum": 5,
      "deadline": 40
    },
    {
      "offset": 2,
      "computation_time": 3,
      "period_time": 15,
      "quantum": 3,
      "deadline": 10
    }
  ]
}
````

---

# Algoritmos de Escalonamento Tradicionais

Dado um arquivo de entrada com um conjunto específico de tarefas e seus respectivos parâmetros, gere um **LOG de saída no formato TXT** que considere os algoritmos de escalonamento:

* **RR**: Round Robin;
* **Versão alternativa do RR**, criada por você, baseada em prioridades fixas:

  * quanto menor o `computation_time`, maior a prioridade.

As seguintes informações precisam estar descritas no arquivo de saída:

* sequência de execução das tarefas;
* nível de utilização do sistema;
* turnaround time médio de cada tarefa, `TAT_avgⁿ`, entre as múltiplas execuções;
* turnaround time médio do sistema, `TAT_avg`;
* waiting time médio de cada tarefa, `WT_avgⁿ`, entre as múltiplas execuções;
* waiting time médio do sistema, `WT_avg`;
* apontar quais tarefas possuem o maior e o menor waiting time médio, respectivamente;
* caso alguma tarefa sofra starvation, apontar qual.

---

# Algoritmos de Escalonamento de Tempo Real

Dado um arquivo de entrada com um conjunto específico de tarefas e seus respectivos parâmetros, gere um **LOG de saída no formato TXT** que considere os algoritmos de escalonamento:

* **RM**: Rate Monotonic;
* **EDF**: Earliest Deadline First.

As seguintes informações precisam estar descritas no arquivo de saída:

* resultado do teste de escalonabilidade do conjunto de tarefas;
* sequência de execução das tarefas;
* caso alguma tarefa perca o deadline, apresentar:

  * percentual de perdas da tarefa em questão;
  * percentual de perdas do sistema como um todo;
* nível de utilização do sistema;
* turnaround time médio de cada tarefa, `TAT_avgⁿ`, entre as múltiplas execuções;
* turnaround time médio do sistema, `TAT_avg`;
* waiting time médio de cada tarefa, `WT_avgⁿ`, entre as múltiplas execuções;
* waiting time médio do sistema, `WT_avg`;
* tarefas com maior e menor waiting time médio, respectivamente;
* caso alguma tarefa sofra starvation, apontar qual.

---
