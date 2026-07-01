# High-Throughput-Log-Aggregator-Alerting-Engine
# A high-performance, asynchronous log ingestion and real-time alerting engine built with **Bun**, **Hono**, and **Mongoose (MongoDB)**. This system is designed using the **Fire-and-Forget** architectural pattern to handle high-volume log streams without blocking client connections.

## Project Structure
```text
├── src/
│   ├── config/       # Database & environment configurations
│   ├── models/       # Mongoose Schemas (Log & Rule Schemas)
│   ├── routes/       # Hono API Route Handlers (LogRoutes.ts, RuleRoutes.ts)
│   └── index.ts      # Main Application Entrypoint
├── .env              # Environment Variables
├── tsconfig.json     # TypeScript Configuration
├── package.json      # Dependencies and Scripts
└── performance-report.txt  # Verified Production Benchmark Metrics
## Data Flow
[ Client Request / Mock Stream ] ──► POST /v1/logs
                                             │
                                             ▼
                                   [ Ingestion Layer (Hono) ]
                                             │
         ┌───────────────────────────────────┴───────────────────────────────────┐
         ▼ (Sync Response)                                                       ▼ (Async Background Process)
  [ 202 Accepted ]                                                      [ Bulk Database Insert ]
                                                                        (Batch Insert Optimized)
                                                                                 │
                                                                                 ▼
                                                                     [ Redis In-Memory Pipeline ]
                                                                        ├── ZADD (Bulk Ingestion)
                                                                        ├── ZREMRANGEBYSCORE (Pruning)
                                                                        └── ZCARD (Dynamic Threshold Check)
                                                                                 │
                                                                                 ▼
                                                                    [ Dynamic Rule Evaluation ]
                                                                                 │
                                                                        (Is Count > Rule Limit?)
                                                                          ├── NO  ──► [ Terminate ]
                                                                          └── YES ──► [ Trigger Alert ]
                                                                                             │
                                                                                             ▼
                                                                                  [ Persistent Alert Log ]
                                                                                             │
                                                                                             ▼
                                                                                  [ Redis Distributed Lock ]
                                                                                   (SET key 'ACTIVE' NX EX 300)
                                                                                             │
                                                                             ┌───────────────┴───────────────┐
                                                                             ▼ (Lock Failed)                 ▼ (Lock Acquired)
                                                                      [ Alert Muted ]               [ Webhook Dispatched ]
                                                                      (Cooldown Active)             (Slack Notification)