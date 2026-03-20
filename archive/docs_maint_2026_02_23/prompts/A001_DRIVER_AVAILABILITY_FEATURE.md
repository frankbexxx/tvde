# A001_DRIVER_AVAILABILITY_FEATURE

Goal

Implement driver online/offline availability control.

Current state

Drivers are always available.

Required behavior

Drivers must explicitly toggle availability.

Driver states

offline
online
busy

Rules

offline → cannot receive offers
online → can receive trip offers
busy → has active trip

Backend requirements

Add field:

drivers.is_available

Create endpoints

POST /driver/status/online
POST /driver/status/offline

When driver goes online:

update is_available = true

When driver goes offline:

update is_available = false

Dispatch must only consider drivers where:

is_available = true
