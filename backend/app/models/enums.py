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
