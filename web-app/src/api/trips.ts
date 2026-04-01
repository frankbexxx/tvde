import { apiFetch } from './client'

export type TripStatus =
  | 'requested'
  | 'assigned'
  | 'accepted'
  | 'arriving'
  | 'ongoing'
  | 'completed'
  | 'cancelled'
  | 'failed'

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed'

export interface TripCreateRequest {
  origin_lat: number
  origin_lng: number
  destination_lat: number
  destination_lng: number
}

export interface TripCreateResponse {
  trip_id: string
  status: TripStatus
  estimated_price: number
  eta: number
  payment_status?: PaymentStatus
  final_price?: number
  commission_amount?: number
  driver_payout?: number
}

export interface TripStatusResponse {
  trip_id: string
  status: TripStatus
  payment_status?: PaymentStatus
  final_price?: number
  commission_amount?: number
  driver_payout?: number
}

export interface TripAvailableItem {
  trip_id: string
  origin_lat: number
  origin_lng: number
  destination_lat: number
  destination_lng: number
  estimated_price: number
  offer_id?: string | null
}

export interface TripHistoryItem {
  trip_id: string
  status: TripStatus
  origin_lat: number
  origin_lng: number
  destination_lat: number
  destination_lng: number
  estimated_price: number
  final_price?: number
  completed_at?: string
  payment_status?: PaymentStatus
  commission_amount?: number
  driver_payout?: number
}

/** Snapshot from GET /trips/:id (accepted | arriving | ongoing) or GET …/driver-location. */
export interface DriverLocationSnapshot {
  lat: number
  lng: number
  timestamp: number
}

export interface TripDetailResponse {
  trip_id: string
  status: TripStatus
  passenger_id: string
  driver_id?: string
  origin_lat: number
  origin_lng: number
  destination_lat: number
  destination_lng: number
  estimated_price: number
  final_price?: number
  distance_km?: number
  duration_min?: number
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
  payment_status?: PaymentStatus
  commission_amount?: number
  driver_payout?: number
  driver_location?: DriverLocationSnapshot | null
}

// --- Passenger ---

export async function createTrip(
  payload: TripCreateRequest,
  token: string
): Promise<TripCreateResponse> {
  return apiFetch<TripCreateResponse>('/trips', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  })
}

export async function cancelTrip(tripId: string, token: string): Promise<TripStatusResponse> {
  return apiFetch<TripStatusResponse>(`/trips/${tripId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({}),
    token,
  })
}

export async function getTripHistory(token: string): Promise<TripHistoryItem[]> {
  return apiFetch<TripHistoryItem[]>('/trips/history', { token })
}

export async function getTripDetail(tripId: string, token: string): Promise<TripDetailResponse> {
  return apiFetch<TripDetailResponse>(`/trips/${tripId}`, { token })
}

// --- Driver ---

export async function setDriverOnline(token: string): Promise<void> {
  await apiFetch<void>('/driver/status/online', {
    method: 'POST',
    token,
  })
}

export async function setDriverOffline(token: string): Promise<void> {
  await apiFetch<void>('/driver/status/offline', {
    method: 'POST',
    token,
  })
}

export async function getAvailableTrips(token: string): Promise<TripAvailableItem[]> {
  return apiFetch<TripAvailableItem[]>('/driver/trips/available', { token })
}

export async function getDriverTripHistory(token: string): Promise<TripHistoryItem[]> {
  return apiFetch<TripHistoryItem[]>('/driver/trips/history', { token })
}

export async function getDriverTripDetail(tripId: string, token: string): Promise<TripDetailResponse> {
  return apiFetch<TripDetailResponse>(`/driver/trips/${tripId}`, { token })
}

export async function acceptTrip(tripId: string, token: string): Promise<TripStatusResponse> {
  return apiFetch<TripStatusResponse>(`/driver/trips/${tripId}/accept`, {
    method: 'POST',
    token,
  })
}

export async function markArriving(tripId: string, token: string): Promise<TripStatusResponse> {
  return apiFetch<TripStatusResponse>(`/driver/trips/${tripId}/arriving`, {
    method: 'POST',
    token,
  })
}

export async function startTrip(tripId: string, token: string): Promise<TripStatusResponse> {
  return apiFetch<TripStatusResponse>(`/driver/trips/${tripId}/start`, {
    method: 'POST',
    token,
  })
}

export async function completeTrip(tripId: string, token: string): Promise<TripStatusResponse> {
  return apiFetch<TripStatusResponse>(`/driver/trips/${tripId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ final_price: 0 }),
    token,
  })
}

export async function assignTripAdmin(tripId: string, token: string): Promise<TripStatusResponse> {
  return apiFetch<TripStatusResponse>(`/admin/trips/${tripId}/assign`, {
    method: 'POST',
    token,
  })
}

export interface RunTimeoutsResponse {
  assigned_to_requested: number
  accepted_to_cancelled: number
  ongoing_to_failed: number
}

export async function runTimeoutsAdmin(token: string): Promise<RunTimeoutsResponse> {
  return apiFetch<RunTimeoutsResponse>('/admin/run-timeouts', {
    method: 'POST',
    token,
  })
}

export async function cancelTripByDriver(
  tripId: string,
  token: string
): Promise<TripStatusResponse> {
  return apiFetch<TripStatusResponse>(`/driver/trips/${tripId}/cancel`, {
    method: 'POST',
    token,
  })
}
