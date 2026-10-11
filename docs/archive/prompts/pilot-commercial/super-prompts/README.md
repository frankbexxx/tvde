# Super prompts — apenas ordem de execução em série

**Definição:** «Super prompt» **não** é um tipo de prompt nem substitui os ficheiros `PROMPT_*.md`.  
É só um **termo** para um **pacote de execução em série**: uma **soma sequencial** das prompts granulares, **por ordem**, até fechar o objetivo do bloco.

- A **fonte de verdade** por tarefa continua a ser cada **`PROMPT_<ID>_*.md`** (quando existir na pasta da fase).
- Os ficheiros `SUPER_PROMPT_0N_*.md` abaixo são **roteiros / checklist do pacote**: listam a sequência, contexto partilhado e notas — para não confundir com uma única «mega-prompt».

| Ordem do pacote | Roteiro (sequência + notas)                                                            | Prompts granulares neste pacote (executar **nesta ordem**) |
| --------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1               | [`SUPER_PROMPT_01_PARTNER_UX_CORE.md`](SUPER_PROMPT_01_PARTNER_UX_CORE.md)             | **C017 → C013 → C014 → C015 → C016 → I009 → I010 → I011**  |
| 2               | [`SUPER_PROMPT_02_CONSISTENCY_HARDENING.md`](SUPER_PROMPT_02_CONSISTENCY_HARDENING.md) | G008 → G009 → G010 (G008 = prioridade máxima)              |
| 3               | [`SUPER_PROMPT_03_OPERATION_VISIBILITY.md`](SUPER_PROMPT_03_OPERATION_VISIBILITY.md)   | **I012 → C018 → H009 → H010 → J009 → K008**                |
| 4               | [`SUPER_PROMPT_04_SMOOTHING.md`](SUPER_PROMPT_04_SMOOTHING.md)                         | S001 → S002 → S003 → S004 → S005 → J010                    |

**Como usar no Cursor:** para cada item da sequência, abrir ou criar o **`PROMPT_*.md`** correspondente e executar **uma prompt de cada vez**; o roteiro `SUPER_PROMPT_0N` serve para contexto e ordem, não para saltar a prompt individual.

**Índice geral:** [`../README.md`](../README.md).  
**Roadmap:** C017 e G008 descritos nos roteiros 1 e 2.

---

_Última revisão: 2026-04-07_
