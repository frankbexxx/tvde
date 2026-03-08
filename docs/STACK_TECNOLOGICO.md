# Stack Tecnológico — TVDE

Lista de frameworks, bibliotecas e ligações externas do projeto.

---

## Backend (Python)

| Pacote | Versão | Uso |
|--------|--------|-----|
| **FastAPI** | — | Framework web, API REST |
| **Uvicorn** | standard | Servidor ASGI |
| **SQLAlchemy** | ≥2.0 | ORM, modelos, queries |
| **psycopg2-binary** | — | Driver PostgreSQL |
| **Pydantic** | — | Validação, schemas |
| **pydantic-settings** | — | Config (.env) |
| **python-dotenv** | — | Carregar .env |
| **PyJWT** | — | Tokens JWT (auth) |
| **Stripe** | ≥8.0.0 | Pagamentos (PaymentIntent) |
| **pytest** | — | Testes |
| **httpx** | — | Cliente HTTP (testes) |

---

## Frontend (JavaScript/TypeScript)

| Pacote | Versão | Uso |
|--------|--------|-----|
| **React** | 19.x | UI |
| **React DOM** | 19.x | Renderização |
| **React Router DOM** | 7.x | Rotas, navegação |
| **Vite** | 7.x | Build, dev server |
| **TypeScript** | 5.9 | Tipagem |
| **Tailwind CSS** | 3.4 | Estilos |
| **PostCSS** | 8.x | Processamento CSS |
| **ESLint** | 9.x | Linting |
| **TypeScript ESLint** | 8.x | Regras TS |

---

## Base de Dados

| Tecnologia | Uso |
|------------|-----|
| **PostgreSQL** | Base de dados principal |

- Local: Docker (`postgres` image)
- Produção: Render PostgreSQL

---

## Serviços Externos

| Serviço | Uso |
|---------|-----|
| **Stripe** | Pagamentos (PaymentIntent, webhooks) |
| **Render** | Hosting (backend, frontend, PostgreSQL) |
| **GitHub** | Repositório, CI/CD (deploy automático) |

---

## Ferramentas de Desenvolvimento

| Ferramenta | Uso |
|------------|-----|
| **Docker** | PostgreSQL local |
| **Stripe CLI** | `stripe listen` — webhook local |
| **Node.js / npm** | Frontend, dependências |
| **Python 3** | Backend |

---

## Resumo por Camada

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + Vite + Tailwind)                     │
│  → Deploy: Render (static site)                         │
└─────────────────────────────────────────────────────────┘
                            │
                            │ HTTP (VITE_API_URL)
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Backend (FastAPI + Uvicorn)                            │
│  → Deploy: Render (Web Service)                         │
│  → Ligações: PostgreSQL, Stripe API, Stripe Webhook     │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  PostgreSQL  │   │  Stripe API  │   │ Stripe       │
│  (Render)    │   │  (pagamentos)│   │ Webhook      │
└──────────────┘   └──────────────┘   └──────────────┘
```
