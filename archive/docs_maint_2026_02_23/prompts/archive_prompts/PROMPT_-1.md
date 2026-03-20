# TASK
Perform a linguistic and naming audit of the codebase.

IMPORTANT:
This task is ONLY an analysis and rule-definition task.

Do NOT rename files or variables yet.
Do NOT modify business logic.

Goal:
Establish consistent language and terminology rules for the project.

---

# OBJECTIVES

Review and document:

1 Naming language
2 Terminology consistency
3 Comment language
4 User-visible strings

This task must produce a STYLE GUIDE, not a refactor.

---

# RULES TO APPLY

## Code identifiers

All code identifiers must be in English.

This includes:

variables
functions
classes
files
database tables
database columns
API routes

Example good:

driver_location
trip_status
accept_trip

Example bad:

localizacao_motorista
estado_viagem
aceitar_viagem

---

## Comments

Comments should be written in Portuguese.

Example:

# valida transição de estado da viagem

---

## Documentation

Documentation files (.md) should remain in Portuguese.

---

## User-facing strings

User-facing messages should eventually support i18n.

Example keys:

error.invalid_email
trip.not_found
driver.not_available

Implementation of i18n is NOT part of this task.

---

# TERMINOLOGY STANDARD

The system must consistently use these core terms.

trip → ride request
driver → motorista
passenger → passageiro
dispatch → trip assignment
matching → driver selection

These English terms must be used consistently in code.

---

# OUTPUT REQUIRED

Generate a document:

docs/architecture/NAMING_CONVENTIONS.md

The document should include:

1 Naming rules
2 Language rules
3 Terminology dictionary
4 Examples of good vs bad naming

---

# IMPORTANT

This task must NOT:

rename variables
rename functions
rename files
change imports
change database schema

Only produce the naming conventions document.

Refactors may happen later if necessary.