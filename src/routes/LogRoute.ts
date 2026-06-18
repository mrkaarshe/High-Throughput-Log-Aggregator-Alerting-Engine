import { Hono } from 'hono';
import logModel from '../models/LogModel';
const router = new Hono();

router.post('/logs', async (c) => {
    const logData = await c.req.json();
    // Reject payloads that are not arrays
    if (!Array.isArray(logData)) {
        return c.json({ status: 'error', message: 'Expected an array of log entries' }, 400);
    }
    // // This tells the client we successfully received the logs
    const response = c.json({ 
        status: "Accepted", 
        message: "Logs received successfully.",
        received_count: logData.length
    }, 202);
    // This runs asynchronously, allowing us to return the response instantly without waiting for MongoDB.
    (async () => {
        try {
            await logModel.insertMany(logData);
            console.log(`Successfully persisted ${logData.length} logs to MongoDB`);

        } catch (error) {
            console.error('Error processing backend log batch:', error);
        }
    })();
    // Return response instantly 
    return response;
});

export default router;