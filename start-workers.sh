#!/bin/bash

# Start worker 1
WORKER_ID=1 npm run worker &

# Start worker 2
WORKER_ID=2 npm run worker &

# Start worker 3
WORKER_ID=3 npm run worker &

# Start worker 4
WORKER_ID=4 npm run worker &

# Wait for all background processes to complete
wait 