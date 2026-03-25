# A020 — SESSION / AUTH UX (PERSISTÊNCIA)

## 🎯 OBJETIVO

Eliminar necessidade de login repetido e garantir entrada automática do utilizador.

---

## 🔴 PROBLEMA ATUAL

- token não persistido corretamente
- refresh → logout implícito
- UX quebrada

---

## ✅ FIX 1 — PERSISTIR TOKEN

Guardar token em:

    localStorage

Chaves:

    access_token
    refresh_token (se existir)

---

## ✅ FIX 2 — RESTORE SESSION NO ARRANQUE

No load da app:

1. verificar localStorage
2. se existir token:
   - validar (decode simples ou ping API)
   - restaurar user

---

## ✅ FIX 3 — AUTH CONTEXT

No AuthContext:

- adicionar estado:

  isAuthenticated
  isLoadingAuth

Fluxo:

- início → isLoadingAuth = true
- tentar restore
- fim → isLoadingAuth = false

---

## ✅ FIX 4 — BLOQUEAR RENDER ATÉ VALIDAR

Enquanto isLoadingAuth:

mostrar:

    "A verificar sessão..."

NÃO mostrar login nem dashboard ainda

---

## ✅ FIX 5 — AUTO LOGIN

Se token válido:

- entrar direto no dashboard
- sem mostrar login

---

## ✅ FIX 6 — TOKEN INVÁLIDO

Se:

- token expirado
- erro 401

→ limpar:

    localStorage.removeItem("access_token")

→ mostrar login

---

## ✅ FIX 7 — INTERCEPTOR API

Adicionar interceptor:

Se resposta:

    401

→ logout automático

---

## ✅ FIX 8 — LOGOUT LIMPO

Ao logout:

- remover token
- reset state
- redirecionar para login

---

## ⚠️ IMPORTANTE

- NÃO usar cookies
- NÃO usar backend refresh ainda
- manter simples e previsível

---

## 🧪 TESTES

### TESTE 1

- login
- refresh

Esperado:

- continua logado

---

### TESTE 2

- fechar browser
- abrir app

Esperado:

- continua logado

---

### TESTE 3

- token inválido

Esperado:

- volta ao login

---

## ✅ DEFINIÇÃO DE SUCESSO

- login só acontece 1 vez
- refresh não faz logout
- entrada automática
