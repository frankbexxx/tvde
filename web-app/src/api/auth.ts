import { apiFetch, COLD_START_FIRST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS } from './client'

export interface TokenResponse {
  access_token: string
  token_type: string
  user_id: string
  role: string
  expires_at: string
  /** Snapshot de `User.name` na emissão do token (BETA / OTP). */
  display_name?: string
  /** Telefone ou identificador sintético (login Google). */
  phone?: string
}

export interface AuthTokens {
  passenger: string
  admin: string
  driver: string
  /** Present when backend dev `/dev/tokens` includes a partner seed user. */
  partner?: string
}

export interface ConfigResponse {
  beta_mode: boolean
  google_oauth_enabled?: boolean
  google_oauth_client_id?: string
  otp_signup_enabled?: boolean
  legal_terms_url?: string
  legal_privacy_url?: string
}

export interface LegalAcceptanceStatus {
  required: boolean
  terms_version: string
  privacy_version: string
  terms_url: string
  privacy_url: string
}

export async function getConfig(timeoutMs: number = COLD_START_FIRST_TIMEOUT_MS): Promise<ConfigResponse> {
  return apiFetch<ConfigResponse>('/config', { timeoutMs })
}

export async function getDevTokens(timeoutMs: number = COLD_START_FIRST_TIMEOUT_MS): Promise<AuthTokens> {
  return apiFetch<AuthTokens>('/dev/tokens', {
    method: 'POST',
    timeoutMs,
  })
}

export async function login(
  phone: string,
  password: string,
  requestedRole?: string
): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      phone,
      password,
      requested_role: requestedRole ?? undefined,
    }),
  })
}

export async function exchangeGoogleCode(
  code: string,
  redirect_uri: string,
  requested_role: string = 'passenger',
  acceptLegal = false
): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/google/exchange', {
    method: 'POST',
    body: JSON.stringify({
      code,
      redirect_uri,
      requested_role,
      accept_legal: acceptLegal,
    }),
  })
}

export async function requestOtp(phone: string, requestedRole?: string): Promise<{ request_id: string }> {
  return apiFetch('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone, requested_role: requestedRole }),
  })
}

export async function verifyOtp(
  phone: string,
  code: string,
  acceptLegal: boolean,
  requestedRole?: string
): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({
      phone,
      code,
      accept_legal: acceptLegal,
      requested_role: requestedRole,
    }),
  })
}

export async function getLegalAcceptance(token: string): Promise<LegalAcceptanceStatus> {
  return apiFetch<LegalAcceptanceStatus>('/auth/legal-acceptance', { token })
}

export async function postLegalAcceptance(token: string): Promise<LegalAcceptanceStatus> {
  return apiFetch<LegalAcceptanceStatus>('/auth/legal-acceptance', {
    method: 'POST',
    token,
    body: JSON.stringify({ source: 'login_reaccept' }),
  })
}

export async function changeMyPassword(
  token: string,
  body: { current_password?: string | null; new_password: string }
): Promise<{ status: string }> {
  return apiFetch<{ status: string }>('/auth/me/password', {
    method: 'POST',
    token,
    body: JSON.stringify({
      new_password: body.new_password,
      current_password: body.current_password ?? undefined,
    }),
  })
}

export interface MeProfileResponse {
  user_id: string
  phone: string
  name: string
  has_custom_password: boolean
}

export async function getMeProfile(
  token: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<MeProfileResponse> {
  return apiFetch<MeProfileResponse>('/auth/me', { token, timeoutMs })
}

export async function patchMeProfile(token: string, name: string): Promise<MeProfileResponse> {
  return apiFetch<MeProfileResponse>('/auth/me', {
    method: 'PATCH',
    token,
    body: JSON.stringify({ name: name.trim() }),
  })
}
