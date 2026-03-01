# AI-Powered Worker Productivity Dashboard

A production-ready full-stack web application designed to ingest AI-generated events from computer-vision CCTV cameras, compute productivity metrics, and display them in a real-time React dashboard.

## 🚀 Quick Start (Local Deployment)

This application is fully containerized with Docker.

1. Ensure Docker and Docker Compose are installed.
2. Clone this repository.
3. Run the following command in the root folder:

```bash
docker-compose up --build
```

- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001/api`

*Note: The database is automatically seeded upon start. If you wish to refresh the dummy data, you can send a POST request to \`http://localhost:3001/api/seed\`.*

---

## 🏛️ Architecture Overview

The system follows an **Edge \u2192 Backend \u2192 Dashboard** architecture pattern:
1. **Edge (CCTV Cameras + CV Models)**: Running locally in the factory, models process frames and emit lightweight JSON events \`(working, idle, absent, product_count)\` over HTTP asynchronously.
2. **Backend (Node.js/Express + SQLite)**: Acts as an ingestion layer. It parses the JSON events, persists them into a relational database, and exposes REST endpoints computing real-time productivity aggregations.
3. **Dashboard (React + Vite + TailwindCSS)**: A client-side Single Page Application (SPA) that queries the backend on an interval to present a live operational view of workers and workstations.

---

## 🗄️ Database Schema

The backend uses a lightweight SQLite database suitable for this prototype scale.

- **workers**: \`id\` (PK), \`name\`
- **workstations**: \`id\` (PK), \`name\`, \`type\`
- **events**: \`id\` (PK), \`timestamp\`, \`worker_id\` (FK), \`workstation_id\` (FK), \`event_type\`, \`confidence\`, \`count\`

---

## 📊 Metric Definitions

- **Active / Idle Time**: Derived by computing the time difference between state-change events.
- **Utilization Percentage**: \`(Total Active Time / (Total Active Time + Total Idle Time)) * 100\`. Ignore \`absent\` time for strict workstation utilization.
- **Units per Hour (Throughput)**: \`Total Units / (Total Logged Time in Hours)\`.

### Assumptions & Tradeoffs
- **State Duration**: We assume an event (e.g., \`working\`) signifies the *start* of a state. The state persists until a new event for that worker arrives.
- **SQLite Concurrency**: For extreme event velocity, SQLite would hit write locks. In production, we assume stepping to PostgreSQL or a time-series DB (like TimescaleDB).
- **In-Memory Calculations**: Metrics are calculated in-memory in the Express server to prevent complicated SQLite Window Function version errors in local environments. In production, this would be shifted to SQL aggregation queries or materialized views.

---

## 🤔 Theoretical Handling (Q&A)

### 1. Handling Connectivity, Duplicates, and Out-of-Order Timestamps
- **Intermittent Connectivity**: The Edge layer must implement a local buffering queue (e.g., MQTT or local SQLite). If the network drops, it queues events and syncs a batch payload when connection is restored.
- **Duplicate Events**: We would introduce a unique \`event_id\` (UUID) generated at the Edge. The backend database would use this UUID as a Primary Key (or unique constraint) with \`INSERT IGNORE\` or \`ON CONFLICT DO NOTHING\` avoiding duplicates reliably.
- **Out-of-Order Timestamps**: Because the backend metrics computation explicitly sorts all events by their embedded \`timestamp\` rather than their ingestion time, out-of-order events naturally fall into their correct chronological place during span calculation.

### 2. Model Versioning, Drift, and Retraining
- **Model Versioning**: Inject a \`model_version\` string directly into the JSON payload. This allows filtering dashboard metrics by model version to run A/B accuracy comparisons natively.
- **Detect Model Drift**: Continuously monitor the baseline distribution of the \`confidence\` scores. If the rolling average confidence drops below a statistical threshold, an alert triggers indicating drift.
- **Trigger Retraining**: Save edge-case video frames locally if confidence is low (e.g., \`0.6 < confidence < 0.8\`). Forward these frames to a centralized cloud blob storage. Once a set threshold of frames is reached, trigger an automated CI/CD pipeline step (like Kubeflow) to retrain and produce the next model version.

### 3. Scaling from 5 Cameras to Multi-Site
- **Ingestion**: Swap Express/SQLite for an Event Stream like Apache Kafka or AWS Kinesis to handle thousands of concurrent requests.
- **Database**: Move to a Time-Series Database (e.g., TimescaleDB or InfluxDB) which seamlessly partitions massive timestamped datasets.
- **Multi-Site Routing**: Transition to a Cloud architecture where each site acts as an Edge Node hitting a centralized load balancer, tagging events with \`site_id\` for cross-factory analytics.
