import * as sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let dbInstance: Database | null = null;

export const getDb = async (): Promise<Database> => {
    if (dbInstance) return dbInstance;

    dbInstance = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    return dbInstance;
};

export const initDb = async () => {
    const db = await getDb();

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON;');

    // Create tables
    await db.exec(`
        CREATE TABLE IF NOT EXISTS workers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS workstations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            worker_id TEXT NOT NULL,
            workstation_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            confidence REAL NOT NULL,
            count INTEGER,
            FOREIGN KEY (worker_id) REFERENCES workers (id),
            FOREIGN KEY (workstation_id) REFERENCES workstations (id)
        );
        
        -- Create indexes for performance on metrics queries
        CREATE INDEX IF NOT EXISTS idx_events_worker ON events(worker_id);
        CREATE INDEX IF NOT EXISTS idx_events_workstation ON events(workstation_id);
        CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    `);

    console.log('Database initialized successfully.');
};
