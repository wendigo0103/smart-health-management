# Docker Setup for Smart Health Queue

Run the entire app (React SPA + Express API + MongoDB) with one command.

## Prerequisites

- **Docker** installed on your machine
- **Docker Compose** (usually included with Docker Desktop)

## Quick Start

1. **Clone or copy the project folder to your computer**

2. **Navigate to the project directory:**
   ```bash
   cd smart-health-queue-3a8
   ```

3. **Start everything with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

   This will:
   - Build the React frontend
   - Install dependencies
   - Start MongoDB
   - Start the web server on port 8080

4. **Open your browser:**
   ```
   http://localhost:8080
   ```

## Stopping the App

```bash
docker-compose down
```

This stops and removes all containers.

## Seeding Demo Data

To add demo doctors and admin accounts:

1. **Run the seed command inside the container:**
   ```bash
   docker-compose exec app npx tsx server/scripts/seed.ts
   ```

2. **Demo accounts** (password: `Doctor123!`):
   - `dr.sarah@healthqueue.demo` (Cardiology)
   - `dr.michael@healthqueue.demo` (General Medicine)
   - `admin@healthqueue.demo` (Admin)

## Troubleshooting

**Port already in use?**
- Change the port mapping in `docker-compose.yml`:
  ```yaml
  ports:
    - "3000:8080"  # Use port 3000 instead
  ```

**MongoDB connection issues?**
- Wait a few seconds after starting for MongoDB to initialize
- Check logs: `docker-compose logs mongodb`

**Build fails?**
- Ensure you have enough disk space
- Try: `docker-compose build --no-cache`

## What's Included

- **App container**: Node.js 20 with React frontend + Express API
- **MongoDB container**: Latest MongoDB with persistent storage
- **Auto-restart**: Both containers restart automatically if they crash
