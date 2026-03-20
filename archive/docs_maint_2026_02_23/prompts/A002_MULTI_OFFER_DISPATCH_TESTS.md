# A002_MULTI_OFFER_DISPATCH_TESTS

Goal

Validate multi-offer dispatch system.

Tests file

tests/test_multi_offer_dispatch.py

Test cases

TEST-MOD-001 offer creation

Arrange
trip requested
5 drivers available

Act
dispatch triggered

Assert
5 offers created

TEST-MOD-002 only first accept wins

Arrange
offer sent to 5 drivers

Act
two drivers accept simultaneously

Assert
first accept succeeds
second accept returns 409

TEST-MOD-003 rejected offers handled

Arrange
offers sent

Act
driver rejects

Assert
offer.status = rejected

TEST-MOD-004 expired offers

Arrange
offer pending

Act
wait timeout

Assert
offer.status = expired
