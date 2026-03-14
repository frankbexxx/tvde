import { apiFetch, INITIAL_LOAD_TIMEOUT_MS } from './client'

export interface TokenResponse {
  access_token: string
  token_type: string
  user_id: string
  role: string
  expires_at: string
}

export interface AuthTokens {
  passenger: string
  admin: string
  driver: string
}

export interface ConfigResponse {
  beta_mode: boolean
}

export async function getConfig(): Promise<ConfigResponse> {
  return apiFetch<ConfigResponse>('/config', { timeoutMs: INITIAL_LOAD_TIMEOUT_MS })
}

export async function getDevTokens(): Promise<AuthTokens> {
  return apiFetch<AuthTokens>('/dev/tokens', {
    method: 'POST',
    timeoutMs: INITIAL_LOAD_TIMEOUT_MS,
  })
}

export async function requestOtp(
  phone: string,
  requestedRole?: string
): Promise<{ request_id: string; expires_at: string }> {
  return apiFetch<{ request_id: string; expires_at: string }>('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone, requested_role: requestedRole ?? undefined }),
  })
}

export async function verifyOtp(
  phone: string,
  code: string,
  requestedRole?: string
): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code, requested_role: requestedRole ?? undefined }),
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
