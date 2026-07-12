High-Throughput Log Aggregator & Alerting Engine — V2

A scalable asynchronous log ingestion and real-time alerting engine built with Bun, Hono, Redis, and MongoDB (Mongoose).

The system is designed to handle high-volume application telemetry by separating fast HTTP ingestion from background log processing. Incoming logs are buffered through Redis, processed in micro-batches, stored in MongoDB, and evaluated against dynamic alert rules using Redis Sorted Sets.

The V2 architecture focuses on improving throughput, reducing network overhead, and providing reliable real-time alert detection under heavy traffic.
---
## Project Structure

├── src/
│   ├── config/
│   │   ├── db.ts               # MongoDB Mongoose connection instance
│   │   ├── redis.ts            # Redis cluster initialization configuration
│   │   └── workerConfig.ts     # Engine metrics and batching thresholds
│   ├── models/
│   │   ├── LogModel.ts         # Sharded raw log telemetry collection
│   │   ├── RuleModel.ts        # Dynamic microservice threshold policies
│   │   └── AlertModel.ts       # Triggered notification audit history logs
│   ├── workers/
│   │   └── logWorker.ts        # The core background processing loop
│   ├── utils/
│   │   └── webHook.ts          # Slack Block Kit integration delivery engine
│   └── index.ts                # Hono HTTP router & lifecycle bootloader
├── .env                        # System infrastructure secrets
├── Dockerfile                  # Application multi-stage build manifest
├── docker-compose.yml          # Infrastructure orchestrator engine
├── package.json
├── performance-report.txt
└── README.md


# Environment Configuration

The application uses environment variables for database connections, Redis configuration, and webhook notifications.

Create a `.env` file in the project root:

```env
MONGO_URI=mongodb://localhost:27017/logDb

REDIS_URL=redis://127.0.0.1:6379

PORT=9000

WEBHOOK_URL=your_slack_webhook_url_here

# Build custom Alpine images and trigger services in background mode
docker compose up --build -d

# Stream real-time engine processing cycles and V2 monitor alerts
docker compose logs -f app


# Build custom Alpine images and trigger services in background mode
docker compose up --build -d

# Stream real-time engine processing cycles and V2 monitor alerts
docker compose logs -f app