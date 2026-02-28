# Schema da base de dados (reflete modelos SQLAlchemy atuais)
# Se a DB tiver schema antigo, executar ALTER TABLE conforme migrations ou recriar tabelas em dev.

ride_db=# \dt
           List of relations
 Schema |     Name     | Type  | Owner
--------+--------------+-------+-------
 public | audit_events | table | ride
 public | drivers      | table | ride
 public | otp_codes    | table | ride
 public | payments     | table | ride
 public | trips        | table | ride
 public | users        | table | ride
(6 rows)

ride_db=# \d+ users
ride_db=# \d+ users
                                                                    Table "public.users"
   Column   |           Type           | Collation | Nullable | Default | Storage  | Compression | Stats target |                Description
------------+--------------------------+-----------+----------+---------+----------+-------------+--------------+--------------------------------------------
 id         | uuid                     |           | not null |         | plain    |             |              | Unique user identifier.
 role       | role_enum                |           | not null |         | plain    |             |              | Active role for permissions.
 name       | character varying(120)   |           | not null |         | extended |             |              | Display name.
 phone      | character varying(32)    |           | not null |         | extended |             |              | Phone number used for OTP login.
 status     | user_status_enum         |           | not null |         | plain    |             |              | Account status.
 created_at | timestamp with time zone |           | not null | now()   | plain    |             |              | Creation timestamp.
 updated_at | timestamp with time zone |           | not null | now()   | plain    |             |              | Updated on state changes or profile edits.
Indexes:
    "users_pkey" PRIMARY KEY, btree (id)
    "ix_users_phone" UNIQUE, btree (phone)
    "ix_users_role_status" btree (role, status)
Referenced by:
    TABLE "drivers" CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "trips" CONSTRAINT "trips_passenger_id_fkey" FOREIGN KEY (passenger_id) REFERENCES users(id) ON DELETE RESTRICT
Access method: heap

ride_db=# \d+ drivers
                                                                      Table "public.drivers"
       Column       |           Type           | Collation | Nullable | Default | Storage  | Compression | Stats target |               Description
--------------------+--------------------------+-----------+----------+---------+----------+-------------+--------------+------------------------------------------
 user_id            | uuid                     |           | not null |         | plain    |             |              | User identifier for the driver profile.
 status             | driver_status_enum       |           | not null |         | plain    |             |              | Driver approval status.
 documents          | text                     |           |          |         | extended |             |              | Document references or URLs.
 commission_percent | numeric(5,2)             |           | not null |         | main     |             |              | Commission percentage for this driver.
 created_at         | timestamp with time zone |           | not null | now()   | plain    |             |              | Creation timestamp.
 updated_at         | timestamp with time zone |           | not null | now()   | plain    |             |              | Updated on approval or contract changes.
Indexes:
    "drivers_pkey" PRIMARY KEY, btree (user_id)
    "ix_drivers_status" btree (status)
Foreign-key constraints:
    "drivers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
Referenced by:
    TABLE "trips" CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES drivers(user_id) ON DELETE SET NULL
Access method: heap

ride_db=# \d+ trips
ride_db=# \d+ trips
                                                                            Table "public.trips"
     Column      |           Type           | Collation | Nullable | Default | Storage | Compression | Stats target |                      Description
-----------------+--------------------------+-----------+----------+---------+---------+-------------+--------------+-------------------------------------------------------
 id              | uuid                     |           | not null |         | plain   |             |              | Unique trip identifier.
 passenger_id    | uuid                     |           | not null |         | plain   |             |              | Passenger user identifier.
 driver_id       | uuid                     |           |          |         | plain   |             |              | Assigned driver identifier (nullable until accepted).
 status          | trip_status_enum         |           | not null |         | plain   |             |              | Lifecycle status of the trip.
 origin_lat      | numeric(9,6)             |           | not null |         | main    |             |              | Origin latitude.
 origin_lng      | numeric(9,6)             |           | not null |         | main    |             |              | Origin longitude.
 destination_lat | numeric(9,6)             |           | not null |         | main    |             |              | Destination latitude.
 destination_lng | numeric(9,6)             |           | not null |         | main    |             |              | Destination longitude.
 estimated_price | numeric(10,2)            |           | not null |         | main    |             |              | Estimated price at request time.
 final_price     | numeric(10,2)            |           |          |         | main    |             |              | Final price after completion.
 started_at      | timestamp with time zone |           |          |         | plain   |             |              | Timestamp when the trip was started by the driver.
 completed_at    | timestamp with time zone |           |          |         | plain   |             |              | Timestamp when the trip was marked as completed.
 created_at      | timestamp with time zone |           | not null | now()   | plain   |             |              | Creation timestamp.
 updated_at      | timestamp with time zone |           | not null | now()   | plain   |             |              | Updated on state transitions or price updates.
Indexes:
    "trips_pkey" PRIMARY KEY, btree (id)
    "ix_trips_driver_id" btree (driver_id)
    "ix_trips_passenger_id" btree (passenger_id)
    "ix_trips_status" btree (status)
Foreign-key constraints:
    "trips_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES drivers(user_id) ON DELETE SET NULL
    "trips_passenger_id_fkey" FOREIGN KEY (passenger_id) REFERENCES users(id) ON DELETE RESTRICT
Referenced by:
    TABLE "payments" CONSTRAINT "payments_trip_id_fkey" FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
Access method: heap

ride_db=# \d+ payments
                                                                  Table "public.payments"
         Column          |           Type           | Collation | Nullable | Default | Storage | Compression | Stats target |            Description
-------------------------+--------------------------+-----------+----------+---------+---------+-------------+--------------+------------------------------------
 id                       | uuid                     |           | not null |         | plain   |             |              | Unique payment identifier.
 trip_id                  | uuid                     |           | not null |         | plain   |             |              | Associated trip identifier.
 total_amount             | numeric(10,2)            |           | not null |         | main    |             |              | Total charged amount.
 commission_amount        | numeric(10,2)            |           | not null |         | main    |             |              | Platform commission amount.
 driver_amount            | numeric(10,2)            |           | not null |         | main    |             |              | Driver payout amount.
 stripe_payment_intent_id | character varying(128)   |           |          |         | extended|             |              | Stripe PaymentIntent identifier, when available.
 currency                 | character varying(3)     |           | not null | 'EUR'::character varying | extended |   |              | ISO currency code (e.g., EUR).
 status                   | payment_status_enum      |           | not null |         | plain   |             |              | Payment status.
 authorization_expires_at | timestamp with time zone |           |          |         | plain   |             |              | Stripe authorization expiration timestamp, if available.
 created_at               | timestamp with time zone |           | not null | now()   | plain   |             |              | Creation timestamp.
 updated_at                | timestamp with time zone |           | not null | now()   | plain   |             |              | Updated on payment status changes.
Indexes:
    "payments_pkey" PRIMARY KEY, btree (id)
    "uq_payments_trip_id" UNIQUE CONSTRAINT, btree (trip_id)
Foreign-key constraints:
    "payments_trip_id_fkey" FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
Access method: heap

ride_db=# \d+ otp_codes
                                                             Table "public.otp_codes"
   Column    |           Type           | Collation | Nullable | Default | Storage  | Compression | Stats target |          Description
-------------+--------------------------+-----------+----------+---------+----------+-------------+--------------+--------------------------------
 id          | uuid                     |           | not null |         | plain    |             |              | Unique OTP request identifier.
 phone       | character varying(32)    |           | not null |         | extended |             |              | Phone number used for OTP.
 code_hash   | character varying(128)   |           | not null |         | extended |             |              | Hashed OTP code.
 expires_at  | timestamp with time zone |           | not null |         | plain    |             |              | OTP expiration timestamp.
 consumed_at | timestamp with time zone |           |          |         | plain    |             |              | Timestamp when OTP was used.
 created_at  | timestamp with time zone |           | not null | now()   | plain    |             |              | Creation timestamp.
Indexes:
    "otp_codes_pkey" PRIMARY KEY, btree (id)
    "ix_otp_codes_phone" btree (phone)
    "ix_otp_codes_phone_expires" btree (phone, expires_at)
Access method: heap

ride_db=# \d+ audit_events
                                                           Table "public.audit_events"
   Column    |           Type           | Collation | Nullable | Default | Storage  | Compression | Stats target |          Description
-------------+--------------------------+-----------+----------+---------+----------+-------------+--------------+--------------------------------
 id          | uuid                     |           | not null |         | plain    |             |              | Unique audit event identifier.
 event_type  | character varying(64)    |           | not null |         | extended |             |              | Event type identifier.
 entity_type | character varying(32)    |           | not null |         | extended |             |              | Entity type (e.g., trip).
 entity_id   | character varying(64)    |           | not null |         | extended |             |              | Entity identifier as string.
 payload     | jsonb                    |           | not null |         | extended |             |              | Serialized event payload.
 occurred_at | timestamp with time zone |           | not null |         | plain    |             |              | Timestamp when event occurred.
 created_at  | timestamp with time zone |           | not null | now()   | plain    |             |              | Persistence timestamp.
Indexes:
    "audit_events_pkey" PRIMARY KEY, btree (id)
    "ix_audit_events_entity" btree (entity_type, entity_id)
    "ix_audit_events_occurred_at" btree (occurred_at)
Access method: heap

ride_db=#
