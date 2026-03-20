# A001_DRIVER_AVAILABILITY_TESTS

Goal

Validate driver availability feature.

Steps

1. Analyze backend driver model and endpoints.
2. Identify where driver availability is stored.

Tests to create

tests/test_driver_availability.py

Test cases

TEST-DA-001 driver goes online

Arrange
driver exists
driver.is_available = false

Act
POST /driver/status/online

Assert
response 200
driver.is_available = true

TEST-DA-002 driver goes offline

Arrange
driver.is_available = true

Act
POST /driver/status/offline

Assert
response 200
driver.is_available = false

TEST-DA-003 offline driver not eligible for dispatch

Arrange
driver.is_available = false

Act
trip request

Assert
driver not included in dispatch candidates

Execution

Run:

pytest
