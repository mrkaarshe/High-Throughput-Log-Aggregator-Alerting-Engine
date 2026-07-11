# High-Throughput Log Aggregator & Alerting Engine — V2

A production-grade, highly optimized asynchronous log ingestion and real-time anomaly alerting engine built with **Bun**, **Hono**, **Redis**, and **MongoDB (Mongoose)**. 

The **V2 Architecture** shifts from standard event streams into an advanced **Micro-Batch Injection & Aggregation** system. By decoupling ultra-fast network ingestion from analytical execution, the system processes limit logs latencies without hitting disk thresholds under peak stress.

---

## V2 Core Upgrades & Enhancements

*   **Atomic Queue Batching (`LMPOP`):** Utilizes Redis `LMPOP` (`RIGHT COUNT`) atomic commands to extract bulk log strings efficiently, dropping queue contention compared to legacy single-pop shifts.
*   **Unified Global Pipelining:** Groups multi-stage operations (`ZADD`, `ZREMRANGEBYSCORE`, `ZCARD`, `EXPIRE`) into a single network round-trip per pipeline transaction, bypassing sequential network blocks.
*   **High-Resolution Time Series Keys:** Generates mathematically unique time series metrics inside Redis Sorted Sets by appending loop-index pointers (`${timestamp}-${index}`) to handle microsecond log writes.
*   **Concurrent Multi-Stage Pipelines:** Dual-pipeline topology splits structural metrics reporting from structural locking rules. Cooldown parameters (`SET NX`) execute in isolated atomic blocks.
*   **Lean Multi-Tenant Rule Sharding:** Uses high-speed Mongoose `.lean()` index maps to pull microservice rules on the fly, matching memory signatures before executing Redis computations.

---
## 📂 Project Structure

```text
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
└── README.md


# Build custom Alpine images and trigger services in background mode
docker compose up --build -d

# Stream real-time engine processing cycles and V2 monitor alerts
docker compose logs -f app


# Build custom Alpine images and trigger services in background mode
docker compose up --build -d

# Stream real-time engine processing cycles and V2 monitor alerts
docker compose logs -f app