export const ADMIN_DRIVER_DOCS_REGISTRY_KEY = 'tvde_admin_driver_docs_registry_v1'

export const DRIVER_DOC_STATUSES = ['missing', 'pending_review', 'approved', 'rejected', 'expired'] as const

/** Operações — lista «Pagamentos em processing» da saúde (evita lista infinita). */
export const OPS_STUCK_PAYMENTS_PAGE_SIZE = 10

export const ADMIN_TRIP_CANCEL_STATUSES = ['requested', 'assigned', 'accepted'] as const
