from enum import Enum


class Role(str, Enum):
    passenger = "passenger"
    driver = "driver"
    admin = "admin"
    super_admin = "super_admin"
    partner = "partner"


class UserStatus(str, Enum):
    active = "active"
    blocked = "blocked"
    pending = "pending"  # BETA: awaiting admin approval


class DriverStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class TripStatus(str, Enum):
    requested = "requested"
    assigned = "assigned"
    accepted = "accepted"
    arriving = "arriving"
    ongoing = "ongoing"
    completed = "completed"
    cancelled = "cancelled"
    failed = "failed"
    queued = "queued"  # B2 next-trip; inert until ENABLE_NEXT_TRIP_CHAINING writers


class PaymentStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    succeeded = "succeeded"
    failed = "failed"


class OfferStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    expired = "expired"


class ComplaintStatus(str, Enum):
    received = "received"
    under_review = "under_review"
    awaiting_info = "awaiting_info"
    resolved = "resolved"
    closed = "closed"


class ComplaintCategory(str, Enum):
    trip_service = "trip_service"
    payment_price = "payment_price"
    driver_vehicle = "driver_vehicle"
    safety = "safety"
    account_app = "account_app"
    other = "other"


class ComplaintSource(str, Enum):
    in_app = "in_app"


class ComplaintComplainantRole(str, Enum):
    passenger = "passenger"
    driver = "driver"


class ComplaintHistoryEventType(str, Enum):
    received = "received"
    status_changed = "status_changed"
    resolved = "resolved"
    reopened = "reopened"
    closed = "closed"
    assignment_changed = "assignment_changed"
