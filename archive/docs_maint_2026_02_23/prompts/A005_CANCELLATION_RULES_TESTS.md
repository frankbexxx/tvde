# A005_CANCELLATION_RULES_TESTS

Goal

Validate cancellation logic.

Tests file

tests/test_cancellation_rules.py

Cases

TEST-CAN-001 passenger cancel before accept

Assert
no fee

TEST-CAN-002 passenger cancel after accept

Assert
cancellation fee applied

TEST-CAN-003 driver cancel

Assert
driver penalty recorded
