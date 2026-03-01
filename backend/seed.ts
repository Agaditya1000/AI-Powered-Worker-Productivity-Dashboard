import { getDb, initDb } from './database';
import { subMinutes, addMinutes, formatISO } from 'date-fns';

const workers = [
    { id: 'W1', name: 'Alice Smith' },
    { id: 'W2', name: 'Bob Johnson' },
    { id: 'W3', name: 'Charlie Brown' },
    { id: 'W4', name: 'Diana Prince' },
    { id: 'W5', name: 'Evan Wright' },
    { id: 'W6', name: 'Fiona Gallagher' }
];

const workstations = [
    { id: 'S1', name: 'Assembly Line A', type: 'Assembly' },
    { id: 'S2', name: 'Assembly Line B', type: 'Assembly' },
    { id: 'S3', name: 'Quality Control 1', type: 'Inspection' },
    { id: 'S4', name: 'Quality Control 2', type: 'Inspection' },
    { id: 'S5', name: 'Packaging 1', type: 'Packaging' },
    { id: 'S6', name: 'Packaging 2', type: 'Packaging' }
];

export const seedDatabase = async () => {
    await initDb();
    const db = await getDb();

    console.log('Clearing existing data...');
    await db.exec('DELETE FROM events');
    await db.exec('DELETE FROM workstations');
    await db.exec('DELETE FROM workers');

    console.log('Inserting workers and workstations...');
    for (const worker of workers) {
        await db.run('INSERT INTO workers (id, name) VALUES (?, ?)', [worker.id, worker.name]);
    }

    for (const station of workstations) {
        await db.run('INSERT INTO workstations (id, name, type) VALUES (?, ?, ?)', [station.id, station.name, station.type]);
    }

    console.log('Generating sample events...');
    // Generate events for the last 8 hours
    const now = new Date();
    const shiftStart = subMinutes(now, 8 * 60);

    const eventTypes = ['working', 'idle', 'absent'];

    for (let i = 0; i < workers.length; i++) {
        const worker = workers[i]!;
        const workstation = workstations[i]!; // Assign one worker per station for simplicity

        let currentTime = new Date(shiftStart.getTime());
        let isWorking = false;

        while (currentTime < now) {
            // Pick a random state change based on current state
            let nextState;
            if (isWorking) {
                // 80% stay working, 15% idle, 5% absent
                const r = Math.random();
                if (r < 0.8) nextState = 'working';
                else if (r < 0.95) nextState = 'idle';
                else nextState = 'absent';
            } else {
                // Return to work (90% chance back to working)
                nextState = Math.random() < 0.9 ? 'working' : 'idle';
            }

            // state duration between 5 to 30 mins
            const durationMins = Math.floor(Math.random() * 26) + 5;

            // Log the state
            await db.run(
                `INSERT INTO events (timestamp, worker_id, workstation_id, event_type, confidence) VALUES (?, ?, ?, ?, ?)`,
                [formatISO(currentTime), worker.id, workstation.id, nextState, (Math.random() * 0.1) + 0.9] // 90-100% confidence
            );

            isWorking = nextState === 'working';

            // If they are working, maybe they produced something!
            if (isWorking) {
                // Generate a product_count event randomly during this block
                if (Math.random() > 0.3) {
                    const productTime = addMinutes(currentTime, Math.floor(durationMins / 2));
                    if (productTime < now) {
                        const count = Math.floor(Math.random() * 5) + 1; // 1 to 5 items
                        await db.run(
                            `INSERT INTO events (timestamp, worker_id, workstation_id, event_type, confidence, count) VALUES (?, ?, ?, ?, ?, ?)`,
                            [formatISO(productTime), worker.id, workstation.id, 'product_count', 0.95, count]
                        );
                    }
                }
            }

            currentTime = addMinutes(currentTime, durationMins);
        }
    }

    console.log('Seeding complete.');
};

// Allow running directly from CLI
if (require.main === module) {
    seedDatabase().catch(err => {
        console.error('Seeding failed:', err);
        process.exit(1);
    });
}
