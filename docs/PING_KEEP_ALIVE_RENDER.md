# Ping Keep-Alive — Evitar Cold Start no Render

O Render (plano gratuito) desliga o serviço após ~15 min de inatividade. O primeiro request demora 30–60 s (cold start) e os webhooks Stripe podem dar timeout.

**Solução:** Fazer ping ao endpoint `/health` a cada 14 minutos.

---

## Configuração (UptimeRobot — gratuito)

1. Criar conta em [uptimerobot.com](https://uptimerobot.com)
2. **Add New Monitor**
3. Preencher:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** TVDE API Keep-Alive
   - **URL:** `https://tvde-api-fd2z.onrender.com/health`
   - **Monitoring Interval:** 5 minutes (ou 10 min no plano gratuito)
4. **Create Monitor**

O UptimeRobot faz um GET ao URL a cada 5–10 min. O Render mantém o serviço ativo.

---

## Alternativa: cron-job.org

1. Criar conta em [cron-job.org](https://cron-job.org)
2. **Create cronjob**
3. **URL:** `https://tvde-api-fd2z.onrender.com/health`
4. **Schedule:** Every 14 minutes
5. **Save**

---

## Verificação

Após configurar, o serviço não deve adormecer. Os webhooks Stripe passam a receber resposta sem timeout.
