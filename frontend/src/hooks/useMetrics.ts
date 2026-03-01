import { useState, useEffect } from 'react';

// In production (Docker Nginx), we use relative path. In dev, we use localhost.
const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

export const useMetrics = () => {
    const [factory, setFactory] = useState<any>(null);
    const [workers, setWorkers] = useState<any[]>([]);
    const [workstations, setWorkstations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMetrics = async () => {
        try {
            const [facRes, workRes, stationRes] = await Promise.all([
                fetch(`${API_BASE}/metrics/factory`),
                fetch(`${API_BASE}/metrics/workers`),
                fetch(`${API_BASE}/metrics/workstations`),
            ]);

            if (facRes.ok) setFactory(await facRes.json());
            if (workRes.ok) setWorkers(await workRes.json());
            if (stationRes.ok) setWorkstations(await stationRes.json());
        } catch (e) {
            console.error('Failed to fetch metrics', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 10000); // refresh every 10s
        return () => clearInterval(interval);
    }, []);

    return { factory, workers, workstations, loading, refresh: fetchMetrics };
};
