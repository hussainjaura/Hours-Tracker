# Quick Start Guide

## Prerequisites

1. **Node.js** installed (v18 or higher)
2. **PostgreSQL** database running
3. **Environment variables** configured

## Starting the Application

You need to run **both** the backend server and frontend client in separate terminal windows.

### Step 1: Start the Backend Server

Open a terminal and navigate to the server directory:

```bash
cd server
```

Make sure you have a `.env` file in the `server` directory with your database connection:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
API_VERSION=1.0.0
NODE_ENV=development
```

Install dependencies (if not already done):
```bash
npm install
```

Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

You should see:
```
Server running on http://localhost:4000
```

**Keep this terminal open!**

### Step 2: Start the Frontend Client

Open a **new terminal** window and navigate to the client directory:

```bash
cd client
```

Install dependencies (if not already done):
```bash
npm install
```

Make sure you have a `.env` file in the `client` directory:

```env
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=Work Hours Tracker
```

Start the frontend:
```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### Step 3: Open in Browser

Open your browser and navigate to:
```
http://localhost:3000
```

You should see the landing page!

## Troubleshooting

### Backend Connection Refused Error

**Error:** `ERR_CONNECTION_REFUSED` when trying to register/login

**Solution:**
1. Make sure the backend server is running (Step 1)
2. Check that the server is running on port 4000
3. Verify your `.env` file in the `client` folder has `VITE_API_URL=http://localhost:4000`
4. Make sure your database is running and the `DATABASE_URL` in `server/.env` is correct

### Database Connection Error

**Error:** Database connection failed

**Solution:**
1. Make sure PostgreSQL is running
2. Check your `DATABASE_URL` in `server/.env`
3. Run database migrations if needed:
   ```bash
   cd server
   npx prisma migrate dev
   ```

### Port Already in Use

**Error:** Port 4000 or 3000 is already in use

**Solution:**
1. Find and stop the process using the port:
   - Windows: `netstat -ano | findstr :4000` then `taskkill /PID <pid> /F`
   - Mac/Linux: `lsof -ti:4000 | xargs kill`
2. Or change the port in the configuration files

## Development Workflow

1. **Backend changes:** The server will auto-reload if you use `npm run dev`
2. **Frontend changes:** Vite will hot-reload automatically
3. **Database changes:** Run `npx prisma migrate dev` in the server directory

## Testing the Connection

Once both servers are running, you can test the backend directly:

```bash
# Test health endpoint
curl http://localhost:4000/health

# Should return JSON with status information
```

## Common Commands

### Backend (in `server/` directory)
- `npm start` - Start server
- `npm run dev` - Start with auto-reload
- `npx prisma migrate dev` - Run database migrations
- `npx prisma studio` - Open Prisma Studio (database GUI)

### Frontend (in `client/` directory)
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
