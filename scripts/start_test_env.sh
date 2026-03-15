#!/bin/bash
# Arranque do ambiente de teste — TVDE
# Executa: ./scripts/start_test_env.sh
# Requer: Docker, Python, Node. Inicia BD, backend e frontend.
# Protocolo: docs/testing/HUMAN_TESTING_PROTOCOL.md

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== TVDE — Arranque do Ambiente de Teste ==="
echo "PROJECT_ROOT: $ROOT"
echo ""

# 1. PostgreSQL (Docker)
echo "1. A iniciar PostgreSQL..."
if command -v docker &>/dev/null; then
    docker start ride_postgres 2>/dev/null || \
    docker run --name ride_postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ride_db -p 5432:5432 -d postgres
    sleep 8
else
    echo "   AVISO: Docker nao encontrado. Assume PostgreSQL a correr em localhost:5432"
fi
echo ""

# 2. Backend (background)
echo "2. A iniciar backend..."
cd "$ROOT/backend"
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd "$ROOT"
sleep 8
echo ""

# 3. Verificar backend
echo "3. A verificar backend..."
for i in 1 2 3 4 5 6; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health | grep -q 200; then
        echo "   Backend OK."
        break
    fi
    if [ $i -eq 6 ]; then
        echo "ERRO: Backend nao responde."
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    echo "   Tentativa $i/6 — a aguardar..."
    sleep 5
done
echo ""

# 4. Frontend (background)
echo "4. A iniciar frontend..."
cd "$ROOT/web-app"
npm run dev &
FRONTEND_PID=$!
cd "$ROOT"
sleep 8
echo ""

# 5. Verificar frontend
echo "5. A verificar frontend..."
frontend_ok=false
for i in 1 2 3 4; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 2>/dev/null | grep -q 200; then
        echo "   Frontend OK."
        frontend_ok=true
        break
    fi
    echo "   Tentativa $i/4 — a aguardar..."
    sleep 3
done
if [ "$frontend_ok" = false ]; then
    echo "   AVISO: Frontend pode ainda nao estar pronto. Verifica http://localhost:5173 manualmente."
fi
echo ""

# 6. Resumo
echo "=== Sistema pronto para testes ==="
echo ""
echo "URLs:"
echo "  Frontend:  http://localhost:5173"
echo "  API Docs:  http://localhost:8000/docs"
echo ""
echo "Para parar: kill $BACKEND_PID $FRONTEND_PID"
echo "Verificacao pre-teste: docs/testing/PRE_TEST_VERIFICATION.md"
echo "Testes: docs/testing/TEST_BOOK_*.md"
echo ""
