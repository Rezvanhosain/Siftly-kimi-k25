#!/bin/sh
set -e
# Skip migrations - client is already generated
# Start the app
exec npx next start
