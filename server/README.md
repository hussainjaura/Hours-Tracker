# Backend Server - Work Hours Tracker

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the `server` directory:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/database_name
   API_VERSION=1.0.0
   NODE_ENV=development
   ENABLE_EMAIL_VERIFICATION=false
   FRONTEND_URL=http://localhost:3000
   ```

3. **Set up the database:**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:4000`

## Available Scripts

- `npm start` - Start the server
- `npm run dev` - Start with nodemon (auto-reload)
- `npx prisma migrate dev` - Run database migrations
- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma generate` - Generate Prisma Client

## API Endpoints

- `GET /health` - Health check
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user (protected)

See `POSTMAN_TESTING_GUIDE.md` for complete API documentation.

## Troubleshooting

### Server won't start
- Check that PostgreSQL is running
- Verify `DATABASE_URL` in `.env` is correct
- Make sure port 4000 is not in use

### Database connection errors
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Run migrations: `npx prisma migrate dev`
