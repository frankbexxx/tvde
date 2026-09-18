/** Evento disparado quando o tab volta a ficar visível (após dormancy). Usado para auto-refresh. */
export const VISIBILITY_VISIBLE_EVENT = 'app:visibility-visible'

/** Disparado no logout (e 401→logout) para limpar estado de sessão não-auth (ex.: active trip). */
export const AUTH_LOGOUT_EVENT = 'auth:logout'
