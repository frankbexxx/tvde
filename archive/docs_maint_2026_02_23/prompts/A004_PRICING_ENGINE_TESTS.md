# A004_PRICING_ENGINE_TESTS

Goal

Validate pricing engine calculations.

Tests file

tests/test_pricing_engine.py

Cases

TEST-PR-001 base fare applied

Arrange
distance = 0
time = 0

Assert
price = BASE_FARE

TEST-PR-002 distance pricing

Arrange
distance = 10km

Assert
price includes distance component

TEST-PR-003 time pricing

Arrange
trip duration = 15 min

Assert
price includes time component
