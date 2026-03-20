# A003_REJECTION_TIMEOUT_TESTS

Goal

Validate offer timeout behavior.

Tests

tests/test_offer_timeout.py

Cases

TEST-OT-001 offer expires after timeout

Arrange
offer created

Act
simulate timeout

Assert
status = expired

TEST-OT-002 redispatch triggered

Arrange
all offers expired

Act
dispatch logic triggered

Assert
new offers created
