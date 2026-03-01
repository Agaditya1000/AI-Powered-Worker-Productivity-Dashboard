# AI-Powered Worker Productivity Dashboard

A production-ready full-stack web application designed to ingest AI-generated events from computer-vision CCTV cameras, compute productivity metrics, and display them in a real-time React dashboard.

## 🌐 Live Demonstrations

- **Frontend Application (Vercel)**: [https://ai-powered-worker-productivity-dash-bice.vercel.app/](https://ai-powered-worker-productivity-dash-bice.vercel.app/)
- **Backend API Server (Render)**: [https://ai-powered-worker-productivity-dashboard-ur16.onrender.com/](https://ai-powered-worker-productivity-dashboard-ur16.onrender.com/)

*(Wait up to 30 seconds for initial backend sleep cycles to wake up on the first load for free Render tiers).*

## 🚀 Quick Start (Local Deployment with Docker)

This application is fully containerized with Docker for easy, one-click execution.

1. Ensure Docker and Docker Compose are installed.
2. Clone this repository.
3. Run the following command in the root folder:

```bash
docker-compose up --build
```

- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001/api`

*Note: The database is automatically seeded upon start. If you wish to refresh the dummy data, you can send a POST request to `http://localhost:3001/api/seed`.*

---

## 💻 Manual Local Development (Without Docker)

If you prefer to run and edit the projects natively on your machine without Docker, you will need two separate terminal windows.

**1. Start the Backend API (Terminal 1)**
```bash
cd backend
npm install
npm run dev
```

**2. Start the Frontend Dashboard (Terminal 2)**
```bash
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:5173` and automatically connect to your native backend at `http://localhost:3001`.

---

## 1. Edge → Backend → Dashboard Architecture

The system follows a continuous pipeline pattern:
1. **Edge (CCTV Cameras + CV Models)**: Running locally in the factory, models process frames and emit lightweight JSON events (`working`, `idle`, `absent`, `product_count`) over HTTP asynchronously.
2. **Backend (Node.js/Express + SQLite)**: Acts as the ingestion layer. It parses the JSON events, persists them into a relational database, and exposes REST endpoints that compute real-time productivity aggregations.
3. **Dashboard (React + Vite + TailwindCSS)**: A client-side Single Page Application (SPA) that queries the backend on an interval to present a live operational view of workers and workstations.

---

## 🗄️ Database Schema

The backend uses a lightweight SQLite database suitable for this prototype scale.

- **workers**: `id` (PK), `name`
- **workstations**: `id` (PK), `name`, `type`
- **events**: `id` (PK), `timestamp`, `worker_id` (FK), `workstation_id` (FK), `event_type`, `confidence`, `count`

---

## 📊 Metric Definitions

- **Active / Idle Time**: Derived by computing the time difference between state-change events.
- **Utilization Percentage**: `(Total Active Time / (Total Active Time + Total Idle Time)) * 100`. Ignore `absent` time for strict workstation utilization.
- **Units per Hour (Throughput)**: `Total Units / (Total Logged Time in Hours)`.

### Assumptions & Tradeoffs
- **State Duration**: We assume an event (e.g., `working`) signifies the *start* of a state. The state persists until a new event for that worker arrives.
- **SQLite Concurrency**: For extreme event velocity, SQLite would hit write locks. In production, we assume stepping to PostgreSQL or a time-series DB (like TimescaleDB).
- **In-Memory Calculations**: Metrics are calculated in-memory in the Express server to prevent complicated SQLite Window Function version errors in local environments. In production, this would be shifted to SQL aggregation queries or materialized views.

---

## 2. How we handle:

- **Intermittent connectivity**: The Edge layer must implement a local buffering queue (e.g., MQTT or local SQLite). If the external network drops, it queues events locally and syncs a batch payload when the connection is restored.
- **Duplicate events**: We would introduce a unique `event_id` (UUID) generated at the Edge. The backend database would use this UUID as a Primary Key (or unique constraint) with `INSERT IGNORE` or `ON CONFLICT DO NOTHING` avoiding duplicates reliably.
- **Out-of-order timestamps**: Because the backend metrics computation explicitly sorts all events chronologically by their embedded `timestamp` rather than their ingestion time, out-of-order events naturally fall into their correct place during span and duration calculations.

---

## 3. How we would:

- **Add model versioning**: Inject a `model_version` string directly into the JSON payload emitted by the camera. This allows filtering dashboard metrics natively to run A/B accuracy comparisons between varying models.
- **Detect model drift**: Continuously monitor the baseline distribution of the `confidence` scores. If the rolling average confidence drops below a defined statistical threshold over a time window, an alert triggers indicating drift.
- **Trigger retraining**: Save edge-case video frames locally if confidence is low (e.g., `0.6 < confidence < 0.8`). Forward these frames to a centralized cloud blob storage. Once a set threshold of frames is reached, trigger an automated CI/CD pipeline step (like Kubeflow) to retrain and deploy the next model version.

---

## 4. How this scales from: 5 cameras → 100+ cameras → multi-site

- **Ingestion**: Swap Express/SQLite for a scalable Event Stream log like Apache Kafka or AWS Kinesis to handle thousands of concurrent ingestion requests buffer without backpressure.
- **Database**: Move from SQLite to a distributed Time-Series Database (e.g., TimescaleDB or InfluxDB) which seamlessly partitions massive timestamped event datasets for rapid analytics querying.
- **Multi-Site Routing**: Transition to a Cloud architecture where each site acts as an Edge Node hitting a centralized cloud load balancer, tagging events with a `site_id` header for global cross-factory dashboard analytics.
