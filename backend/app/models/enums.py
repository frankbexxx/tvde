from enum import Enum


class Role(str, Enum):
    passenger = "passenger"
    driver = "driver"
    admin = "admin"


class UserStatus(str, Enum):
    active = "active"
    blocked = "blocked"


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

