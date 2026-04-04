# Barber Backend (Node + MongoDB Atlas)

This service replaces Supabase with a Node.js API backed by MongoDB Atlas.

## Quick Start

1. Copy env file:

```bash
cp .env.example .env
```

2. Edit `.env` and set your MongoDB Atlas URI:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/barber
```

3. Install dependencies:

```bash
npm install
```

4. Seed data (creates a demo salon + owner):

```bash
npm run seed
```

5. Run the API:

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
- `POST /api/push-subscriptions/test`

## Notes

- Auth uses JWT (`Authorization: Bearer <token>`).
- Update `CORS_ORIGIN` to match the frontend URL.
- The backend expects a valid MongoDB Atlas connection string in `MONGODB_URI`.
- For push delivery, set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`.
- New appointments now trigger push sends to salon owners and assigned staff when subscriptions exist.
