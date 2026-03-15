# TVDE Platform — Human Testing Protocol

## Purpose

This document defines the **official testing paradigm** for the TVDE platform.

The goal is to ensure that **any human tester can execute tests reliably**, even if they:

* have never seen the project before
* have no technical background
* change from day to day

The system must not depend on **memory, intuition, or interpretation**.

All instructions must be **deterministic and explicit**.

This protocol ensures that testing can be performed **consistently and safely**.

---

# Core Principle

Humans only see what is in front of them.

Everything else must be explicitly written.

Therefore:

* No assumptions are allowed
* No interpretation is allowed
* No optional steps are allowed

Every test must follow **exact instructions**.

---

# Language Rules

Documentation must follow strict language rules.

Allowed:

"You must do this."

"You must click this button."

"You must open this page."

"Confirm that X appears."

"Verify that Y is visible."

"Wait up to 30 seconds for Z."

"Record the result."

Not allowed:

"You can do this."

"You may try this."

"You could do this."

"Observe the list."

"Look at the screen."

"Wait until X happens."

"Check if Y."

All actions must be **mandatory and sequential**. All waits must specify a **maximum time**. If the expected result does not occur within that time, mark the test as **FAILED** and follow TEST_FAILURE_PROTOCOL.

---

# Test Documentation Structure

All test documentation must be located inside:

```
docs/testing/
```

Required files:

```
docs/testing/
│
├── HUMAN_TESTING_PROTOCOL.md
├── TESTING_RULES.md
├── TEST_FAILURE_PROTOCOL.md
├── PRE_TEST_VERIFICATION.md
├── TEST_ENVIRONMENT_SETUP.md
├── TEST_STATE_DEFINITION.md
├── TEST_NAVIGATION_MAP.md
├── TEST_BOOK_PASSENGER.md
├── TEST_BOOK_DRIVER.md
├── TEST_BOOK_SIMULATOR.md
└── TEST_BOOK_FULL_SYSTEM.md
```

Each file has a specific role.

---

# Pre-Test Verification (Mandatory Gate)

Defined in:

```
docs/testing/PRE_TEST_VERIFICATION.md
```

**No test may start without this verification being complete.**

All services must be online and communicating. If any verification step fails: STOP. Do not proceed to test books. Fix the issue and repeat.

---

# Test Failure Protocol

Defined in:

```
docs/testing/TEST_FAILURE_PROTOCOL.md
```

When a step fails: stop immediately, record Test ID, Step number, Expected, Observed. Do not continue.

---

# Testing Rules

Defined in:

```
docs/testing/TESTING_RULES.md
```

All tests must follow these rules.

1. Every test must have a **unique test ID** (TEST-P-001, TEST-D-001, etc.).
2. Every test must be numbered.
3. Every step must contain **one action only**.
4. Every step must define **expected result**.
5. Every wait action must include a **maximum wait time** (e.g. "Wait up to 30 seconds").
6. All failures must follow **TEST_FAILURE_PROTOCOL**.
7. No step may contain multiple actions.
8. No step may contain optional behaviour.

Example of invalid instruction:

Open the app and create a trip.

Correct version:

Step 1
Open the browser.

Step 2
Navigate to:

http://localhost:5173

Step 3
Click the button labeled:

Request Trip

Expected Result
A new trip appears on the map.

---

# Test Environment Setup

Defined in:

```
docs/testing/TEST_ENVIRONMENT_SETUP.md
```

This document explains **how to start the entire system**.

It must include:

Requirements
Software dependencies
Environment variables
Service startup order

Example startup sequence:

Step 1
Start PostgreSQL.

Step 2
Start backend server.

Command:

uvicorn app.main:app --reload

Step 3
Start frontend.

Command:

npm run dev

Step 4
Verify backend status.

Open:

http://localhost:8000/docs

Expected result:

Swagger interface appears.

---

# System State Definition

Defined in:

```
docs/testing/TEST_STATE_DEFINITION.md
```

This document defines the **exact state of the system before tests begin**.

Example state:

Database state:

No active trips exist.

Driver accounts:

At least one driver account exists.

Driver status:

approved = true

Driver availability:

is_available = true

Passenger account:

exists and can login.

Tests must not start unless the system state matches these conditions.

---

# System Navigation Map

Defined in:

```
docs/testing/TEST_NAVIGATION_MAP.md
```

This document describes **where testers must go in the interface**.

Example structure:

Passenger Application

Request Trip
Trip Status
Trip History

Driver Application

Available Trips
Active Trip
Trip History

Admin Panel

Users
Driver Approval

The navigation map prevents testers from getting lost.

---

# Passenger Test Book

Defined in:

```
docs/testing/TEST_BOOK_PASSENGER.md
```

This document defines **all passenger test scenarios**.

Examples:

Passenger login (TEST-P-001)
Create trip (TEST-P-002)
Verify trip status (TEST-P-002)
View trip history (TEST-P-004)

All tests use unique IDs. All waits have maximum times. All failures follow TEST_FAILURE_PROTOCOL.

Each test must contain:

Test name
Requirements
Steps
Expected results

---

# Driver Test Book

Defined in:

```
docs/testing/TEST_BOOK_DRIVER.md
```

Driver test scenarios include:

Driver login
View available trips
Accept trip
Start trip
Complete trip

All driver actions must follow the same deterministic format.

---

# Simulator Test Book

Defined in:

```
docs/testing/TEST_BOOK_SIMULATOR.md
```

This document explains how to run the **driver simulator**.

Example procedure:

Step 1
Open terminal.

Step 2
Navigate to project root.

Step 3
Run command:

python scripts/driver_simulator.py --drivers 10

Expected Result

Drivers appear online in the console logs.

---

# Full System Test

Defined in:

```
docs/testing/TEST_BOOK_FULL_SYSTEM.md
```

This test verifies the **entire platform pipeline**.

Actors:

1 passenger
10 simulated drivers

Sequence:

Start backend
Start frontend
Run driver simulator
Create trip
Observe driver acceptance
Observe trip lifecycle
Observe payment processing

Expected result:

Trip lifecycle completes successfully.

---

# Automated Test Environment Startup

To simplify testing for non-technical users, the project must provide startup scripts.

Scripts must be located in:

```
scripts/
```

Required scripts:

```
scripts/start_test_env.sh
scripts/start_test_env.ps1
```

These scripts must automatically:

Start database
Start backend
Start frontend
Verify endpoints

Expected output:

System ready for testing.

---

# Logging Verification

During tests, testers must verify system behaviour through logs.

Logs may include:

trip_created
trip_accepted
trip_started
trip_completed

These events confirm that the system behaves correctly.

---

# Test Execution Philosophy

Testing must follow a **linear path**.

Testers must not explore freely.

They must follow:

Step
Result
Step
Result

This prevents accidental errors.

---

# Testing Discipline

Testers must not:

modify code
restart services randomly
skip steps

If a test fails, testers must follow:

```
docs/testing/TEST_FAILURE_PROTOCOL.md
```

Report: Test ID, Step number, Expected, Observed. Stop immediately. Do not continue.

---

# Future Expansion

This testing framework will support future development.

All new features must include:

* corresponding test book entries
* clear system state definitions
* navigation instructions

This ensures that testing remains **structured and reliable**.

---

# Final Principle

Testing is not an improvisation.

Testing is a **protocol**.

This document establishes that protocol for the entire project.
