# Erizon V8 Production Hardening

This package focuses on production-readiness, following the technical review priorities:

## Included
- Zod validation for all exposed routes
- Workspace auth/authorization helpers
- Token store repository (Meta credentials retrieved from DB, not request body)
- Real Meta Graph API connector implementation
- Benchmarks stored in database and loaded dynamically
- Deduplication for anomalies, risks, and opportunities
- Structured logger with request IDs and levels
- Pulse service using SQL aggregation instead of arbitrary snapshot limits
- Worker that iterates real ad accounts from the database
- Unit and service test scaffolding

## Notes
- The Graph API connector expects a valid token already stored in the database.
- Auth helper is structured for Supabase server validation and workspace membership checks.
- The package is a production-oriented hardening layer to integrate into the main Erizon app.
