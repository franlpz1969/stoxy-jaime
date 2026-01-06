#!/bin/bash

# Kill any existing processes on ports 3000 and 3001
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

# Start Backend
echo "Starting Backend on port 3001..."
FMP_API_KEY=cXjaiMrFSXvCALbdRKQlh3cMO4934mm7 PORT=3001 npm run server &
BACKEND_PID=$!

# Wait a moment for backend to initialize
sleep 2

# Start Frontend
echo "Starting Frontend on port 3000..."
npm run dev -- --port 3000 &
FRONTEND_PID=$!

echo "App is running!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:3001"
echo ""
echo "Press CTRL+C to stop both servers."

# Trap SIGINT (Ctrl+C) to kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT

# Keep script running
wait
