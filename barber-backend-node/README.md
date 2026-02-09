# Barber Backend (Node + MongoDB)

This service replaces Supabase with a Node.js + MongoDB API.

## Quick Start

1. Copy env file:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Seed data (creates a demo salon + owner):

```bash
npm run seed
```

4. Run the API:

```bash
npm run dev
```

## API Endpoints

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/salons/slug/:slug`
- `GET /api/salons/:id`
- `GET /api/services?salonId=...`
- `POST /api/services`
- `PATCH /api/services/:id`
- `DELETE /api/services/:id`
- `POST /api/push-subscriptions`

## Notes

- Auth uses JWT (`Authorization: Bearer <token>`).
- Update `CORS_ORIGIN` to match the frontend URL.
