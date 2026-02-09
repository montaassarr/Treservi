# API Endpoint Test Script

This folder contains a simple smoke test for all backend API endpoints.

## Run

```bash
node /home/montassar/Desktop/reservi/scripts/test-api-endpoints.js
```

## Environment Variables (optional)

- `API_BASE_URL` (default `http://localhost:4000`)
- `SUPER_ADMIN_EMAIL` (default `superadmin@barbershop.com`)
- `SUPER_ADMIN_PASSWORD` (default `ChangeMe123!`)

The script creates a temporary salon, staff user, and appointment, then cleans them up.
