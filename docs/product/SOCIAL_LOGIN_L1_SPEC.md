# Login social — fase **L1** (decisões de produto, fluxos, conformidade)

**Estado:** especificação **L1** — sem implementação obrigatória neste ficheiro.  
**Próximo passo técnico:** **A3** (gate) → **L2** (backend + provedor).  
**Relacionado:** [`docs/audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md`](../audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md).

---

## 1. Objectivo da v1

Permitir **entrada com Google** (único provedor na primeira entrega) para **reduzir fricção** no passageiro, **sem** remover o login actual (telefone + OTP / BETA) até haver paridade testada.

---

## 2. Público-alvo (v1)

| Papel | Incluir na v1? | Notas |
|-------|----------------|--------|
| **Passageiro** | **Sim** | Primeiro caso; menor risco operacional que motorista+frota. |
| Motorista | Não (inicialmente) | Exige cruzar licença/TVDE e telefone já verificado — onda L1.1 ou L2+. |
| Partner / Admin | Não (inicialmente) | Manter fluxos actuais; OAuth org = decisão futura. |

*Se todos os papéis forem necessários de imediato, L2 estima-se mais caro; rever antes de codar.*

---

## 3. Fluxos obrigatórios

1. **Primeira vez (Google novo na plataforma)**  
   Criar `User` com email (e nome) do token Google; papel **passageiro** por defeito; pedir **telefone + verificação** se a viagem/pagamento o exigir (alinhado ao modelo actual).

2. **Conta já existe com mesmo email**  
   Associar **Google OAuth** à conta existente após verificação explícita (evitar account takeover por email coincidente mal verificado).

3. **Conta já existe só com telefone**  
   Fluxo de **ligação**: utilizador autenticado por Google vê prompt para confirmar telefone ou merge guiado; não duplicar utilizadores.

4. **Erro / cancelamento**  
   Mensagens claras: “Conta já usa outro método”, “Google temporariamente indisponível”.

5. **BETA / dev**  
   Manter `dev` tokens e passwords de teste **inalterados** em dev; OAuth **opcional** em local com credenciais de test Google.

---

## 4. Dados e RGPD (mínimo para L2)

- **Dados obtidos do Google (v1):** `sub` (ID estável), email verificado, nome para apresentação; **não** pedir scopes desnecessários.
- **Base legal:** execução do serviço + consentimento onde aplicável; texto curto no ecrã de login e link para política de privacidade **quando existir** (T8 audit — advogado fora deste spec).
- **Retenção / apagar conta:** seguir política já definida para `User`; OAuth revogado no Google não apaga dados TVDE — copy honesta.

---

## 5. Riscos explícitos (do audit → L1)

- **T2:** sem rate-limit forte, combinar OAuth com **novos** endpoints aumenta superfície → **A2-01** é P0.
- **T4:** OAuth sem **staging** duplica erros de redirect e chaves → **A2-02** é P0.
- **JWT sem refresh (audit):** v1 pode manter sessão actual; documentar se tokens de OAuth geram a mesma duração/rotina.

---

## 6. Fora de âmbito L1

- Apple / Facebook login.
- Login social para motorista/frota.
- Stripe Link / “pagar com Google Pay” (pagamento ≠ identidade).

---

_Última actualização: **2026-05-12**._
