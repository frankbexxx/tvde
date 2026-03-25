-- A025 — UNIQUE em payments.stripe_payment_intent_id + índice em status
-- Pré-requisito: backup (ex.: pg_dump) antes de correr em produção.
-- PostgreSQL: vários NULL em coluna UNIQUE são permitidos.
--
-- Correr por blocos (1→2→3→4). Não reexecutar o DELETE nem o ALTER se já aplicados.
-- Se `unique_stripe_payment_intent_id` já existir: ignorar passo 3.

-- 1) Detetar duplicados
-- SELECT stripe_payment_intent_id, COUNT(*)
-- FROM payments
-- WHERE stripe_payment_intent_id IS NOT NULL
-- GROUP BY stripe_payment_intent_id
-- HAVING COUNT(*) > 1;

-- 2) Limpar: manter o registo com maior id por stripe_payment_intent_id
DELETE FROM payments
WHERE id IN (
    SELECT id
    FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (
                PARTITION BY stripe_payment_intent_id
                ORDER BY id DESC
            ) AS rn
        FROM payments
        WHERE stripe_payment_intent_id IS NOT NULL
    ) sub
    WHERE rn > 1
);

-- 3) Constraint UNIQUE (falha se ainda existirem duplicados)
ALTER TABLE payments
ADD CONSTRAINT unique_stripe_payment_intent_id
UNIQUE (stripe_payment_intent_id);

-- 4) Índice para filtros por estado (opcional; UNIQUE em (2) já indexa PI)
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
