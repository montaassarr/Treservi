# Local Setup - Atlas Only

## Summary

This project now uses **MongoDB Atlas only**. There is no local MongoDB data directory and no Docker database container required.

## Required backend env

Set `MONGODB_URI` in `barber-backend-node/.env` to your Atlas connection string:

```bash
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/barber
```

## Run locally

### Backend

```bash
cd barber-backend-node
npm install
npm run dev
```

### Frontend

```bash
cd barber-frontend
npm install
npm run dev
```

## Access

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

## Troubleshooting

- If the backend fails with `ECONNREFUSED`, check that the Atlas URI is correct and your IP is allowed in Atlas Network Access.
- If login fails, confirm the backend is running and `MONGODB_URI` is set before starting it.

## Next steps

1. Put your Atlas URI into `barber-backend-node/.env`
2. Run the backend and frontend
3. Test login and dashboard loading
