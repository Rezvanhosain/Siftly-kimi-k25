#!/bin/sh
set -e

# Set database URL with default
export DATABASE_URL="${DATABASE_URL:-file:/data/siftly.db}"
echo "Using database: $DATABASE_URL"

# Create the database file if it doesn't exist
if [ ! -f "/data/siftly.db" ]; then
    echo "Creating new database file..."
    touch /data/siftly.db
fi

# Start the app - database tables will be created on first run via Prisma Client
echo "Starting Siftly..."
cd /app
exec npx next start
