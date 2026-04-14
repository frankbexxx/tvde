# W2 — Runbook operacional (v0)

**Estado:** *placeholder* até fecharmos o desenho em **[`W2_RUNBOOK_UI_DESIGN.md`](W2_RUNBOOK_UI_DESIGN.md)** e preencher os passos finais (fase **W2-A**).

**Entrada:** web-app em produção → rota **Admin** (login com conta **admin**; o token fica na sessão da app — **não** uses Swagger para estes passos).

**Enquanto tanto:** usa a **tabela «Inventário»** (secção 2) do ficheiro de **desenho** — mapeia cada tipo de incidente à tab correcta (**Operações**, **Viagens**, **Saúde**, …).

---

## Checklist v0 (a expandir)

- [ ] Login como admin na app de produção.
- [ ] Incidente identificado → abrir tab sugerida no desenho.
- [ ] Registar o que fizeste (data + síntese) fora do Git ou num ticket — opcional.

---

*Última nota:* quando o desenho for **aceite**, este ficheiro passa a conter os passos literais (sem JSON de API), um por incidente.
