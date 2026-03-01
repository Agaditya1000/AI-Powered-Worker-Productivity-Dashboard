import express from 'express';
import cors from 'cors';
import { getDb, initDb } from './database';
import { seedDatabase } from './seed';
import { differenceInSeconds, parseISO } from 'date-fns';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Init DB
initDb().catch(console.error);

app.post('/api/events', async (req, res) => {
    try {
        const { timestamp, worker_id, workstation_id, event_type, confidence, count } = req.body;
        if (!timestamp || !worker_id || !workstation_id || !event_type || confidence === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const db = await getDb();
        const result = await db.run(
            'INSERT INTO events (timestamp, worker_id, workstation_id, event_type, confidence, count) VALUES (?, ?, ?, ?, ?, ?)',
            [timestamp, worker_id, workstation_id, event_type, confidence, count || null]
        );
        res.status(201).json({ id: result.lastID, message: 'Event ingested successfully' });
    } catch (error) {
        console.error('Error ingesting event:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/seed', async (req, res) => {
    try {
        await seedDatabase();
        res.json({ message: 'Database seeded successfully' });
    } catch (error) {
        console.error('Error seeding database:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * Metric Computation Helpers
 */
const computeDurations = (events: any[]) => {
    const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    let working = 0;
    let idle = 0;

    for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        if (!['working', 'idle', 'absent'].includes(current.event_type)) continue;

        let next: any = null;
        for (let j = i + 1; j < sorted.length; j++) {
            if (['working', 'idle', 'absent'].includes(sorted[j].event_type)) {
                next = sorted[j];
                break;
            }
        }

        const endTime = next ? parseISO(next.timestamp) : new Date();
        const diff = differenceInSeconds(endTime, parseISO(current.timestamp));

        if (diff < 0) continue;

        if (current.event_type === 'working') working += diff;
        if (current.event_type === 'idle') idle += diff;
    }

    return { working, idle };
};

const getMetricsBase = async (groupField: 'worker_id' | 'workstation_id') => {
    const db = await getDb();
    const table = groupField === 'worker_id' ? 'workers' : 'workstations';
    const records = await db.all(`SELECT * FROM ${table}`);
    const events = await db.all('SELECT * FROM events');

    return records.map(record => {
        const recordEvents = events.filter(e => e[groupField] === record.id);
        const { working, idle } = computeDurations(recordEvents);

        const totalProducts = recordEvents
            .filter(e => e.event_type === 'product_count')
            .reduce((sum, e) => sum + (e.count || 0), 0);

        const totalTime = working + idle;
        const utilization = totalTime > 0 ? (working / totalTime) * 100 : 0;
        const throughput = totalTime > 0 ? (totalProducts / (totalTime / 3600)) : 0;

        return {
            ...record,
            active_time_s: working,
            idle_time_s: idle,
            utilization_pct: utilization,
            total_units: totalProducts,
            units_per_hour: throughput
        };
    });
};

/* Metrics Endpoints */
app.get('/api/metrics/workers', async (req, res) => {
    try { res.json(await getMetricsBase('worker_id')); }
    catch (e) { res.status(500).json({ error: 'Failed to fetch' }); }
});

app.get('/api/metrics/workstations', async (req, res) => {
    try { res.json(await getMetricsBase('workstation_id')); }
    catch (e) { res.status(500).json({ error: 'Failed to fetch' }); }
});

app.get('/api/metrics/factory', async (req, res) => {
    try {
        const workers = await getMetricsBase('worker_id');

        const totalWorking = workers.reduce((sum: number, w: any) => sum + w.active_time_s, 0);
        const totalIdle = workers.reduce((sum: number, w: any) => sum + w.idle_time_s, 0);
        const totalProducts = workers.reduce((sum: number, w: any) => sum + w.total_units, 0);

        const avgUtilization = workers.reduce((sum: number, w: any) => sum + w.utilization_pct, 0) / (workers.length || 1);
        const avgProduction = workers.reduce((sum: number, w: any) => sum + w.units_per_hour, 0) / (workers.length || 1);

        res.json({
            total_productive_time_s: totalWorking,
            total_idle_time_s: totalIdle,
            total_units: totalProducts,
            avg_utilization_pct: avgUtilization,
            avg_production_rate_hr: avgProduction
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
