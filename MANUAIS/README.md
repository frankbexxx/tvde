# Manuais VAMULÁ

Pasta para os manuais funcionais da aplicação, em linguagem simples, para quem usa a app no dia a dia.

Estes ficheiros descrevem **o que a app faz hoje**. Não substituem a documentação técnica em `docs/`.

## Manuais

| Manual | Ficheiro | Estado |
|--------|----------|--------|
| Passageiro | [`PASSAGEIRO.md`](PASSAGEIRO.md) | Existente — reconciliado com a app (Outubro 2026) |
| Motorista | [`MOTORISTA.md`](MOTORISTA.md) | Existente — reconciliado com a app (Outubro 2026) |
| Parceiro / Frota | — | Por criar |
| Admin | — | Por criar |
| Técnico / Operacional | — | Futuro |

## Versão e data

- **Última actualização desta pasta:** Outubro 2026  
- **Base da app:** após as correcções de experiência PR-UX-01 a PR-UX-28

## Legenda de placeholders

| Marcação | Significado |
|----------|-------------|
| `[PENDENTE — SMS REAL]` | Em produção ainda não há envio real de códigos por SMS |
| `[PENDENTE — STRIPE LIVE]` | Em produção a cobrança real com cartão ainda não está activa |
| `[PENDENTE — PUSH IOS]` | Notificações no iPhone ainda não estão fechadas |
| `[FUTURO — …]` | Funcionalidade planeada; **não** existe na app de hoje |
| `[SCREENSHOT — …]` | Local para uma imagem do ecrã (ainda por capturar) |

Quando um placeholder for resolvido na app, o manual correspondente deve ser actualizado na mesma altura.

## Regras editoriais

- Manuais de utilizador usam a marca **VAMULÁ**. `TVDE` fica para documentação técnica, nome do projecto e contexto regulatório quando for preciso.
- Linguagem **PT-PT**, frases curtas, sem jargão interno.
- Descrever o **comportamento actual** da app — não prometer o que ainda não existe.
- O que depende de produção ou está por fazer usa **placeholders** (tabela acima).
- **Notificações** nunca são apresentadas como garantidas: só quando a app está bem configurada e o dispositivo tem as permissões activas. No iPhone manter `[PENDENTE — PUSH IOS]` enquanto a integração não estiver fechada.
- Quando o piloto e o comportamento final diferem (por exemplo taxas ou cobranças), o manual diz o que acontece **no piloto actual** e deve ser actualizado se a política mudar.
- No futuro Manual do Motorista: documentar **horas de condução** como acompanhamento/avisos (o bloqueio automático ainda não está activo); incluir **SOS/emergência** com importância semelhante ao Passageiro, mas só após inspeccionar o fluxo real do Motorista.
