# TASK
Create a Driver Simulation Engine to test dispatch and concurrency.

Goal:
Simulate multiple drivers sending location updates and accepting trips.

This must be implemented as a standalone script.

---

# FILE LOCATION

Create:

scripts/driver_simulator.py

---

# INPUT PARAMETERS

The simulator should support CLI parameters:

--drivers N
--interval seconds
--base-lat
--base-lng

Example:

python scripts/driver_simulator.py --drivers 10 --interval 3

---

# DRIVER MODEL

Each simulated driver should:

1 register / login
2 send location updates
3 fetch available trips
4 accept trip if available

---

# PSEUDOCODE

create_driver_objects(N)

loop forever:

    for driver in drivers:

        location = random_offset(base_location)

        POST /drivers/location

        trips = GET /driver/trips/available

        if trips not empty:

            choose first trip

            POST /driver/trips/{trip_id}/accept

    sleep(interval)

---

# LOCATION GENERATION

Drivers should move slightly around base location.

Example:

lat = base_lat + random(-0.002, 0.002)
lng = base_lng + random(-0.002, 0.002)

This simulates movement inside a city.

---

# LOGGING

Print events:

driver online
location update
trip accepted

Example:

[driver_3] location updated
[driver_3] accepted trip 482

---

# SAFETY

Do NOT create infinite driver accounts in DB.

Reuse a small pool of drivers if possible.

Alternatively create test drivers once.

---

# TEST PLAN

Run simulator:

10 drivers

Create trips from passenger dashboard.

Expected:

drivers pick up trips
multiple trips handled concurrently
no crashes in backend logs