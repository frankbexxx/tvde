import { apiFetch } from './client'

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

export async function getDevTokens(): Promise<AuthTokens> {
  return apiFetch<AuthTokens>('/dev/tokens', { method: 'POST' })
}

export async function requestOtp(phone: string): Promise<{ request_id: string; expires_at: string }> {
  return apiFetch<{ request_id: string; expires_at: string }>('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  })
}

export async function verifyOtp(phone: string, code: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  })
}
