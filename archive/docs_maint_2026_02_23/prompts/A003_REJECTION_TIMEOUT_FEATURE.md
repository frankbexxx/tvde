# A003_REJECTION_TIMEOUT_FEATURE

Goal

Ensure offers expire automatically.

Rules

Driver has 15 seconds to accept.

After timeout:

offer.status = expired

Expired offers trigger re-dispatch.

Redispatch strategy

expand radius
or send to next drivers
