import { Hono } from 'hono';
import logModel from '../models/LogModel';
import redis from '../config/redis';
import AlertModel from '../models/AlertModel';

const router = new Hono();

router.post('/logs', async (c) => {
    const logs = await c.req.json();
    const thresholdParam = c.req.query('threshold');
    const windowParam = c.req.query('window_size_ms');

    if (!Array.isArray(logs)) {
        return c.json({ status: 'error', message: 'Expected an array of log entries' }, 400);
    }

    const response = c.json({ 
        status: "Accepted", 
        message: "Logs received successfully.",
        received_count: logs.length
    }, 202);

    (async () => {
        try {
            await logModel.insertMany(logs);

            const now = Date.now();
            const CurrentWindowSizeMs = windowParam ? parseInt(windowParam) : 10000;
            const CurrentThreshold = thresholdParam ? parseInt(thresholdParam) : 5;

            const errorCountsByService: Record<string, number> = {}; // {auth:499,payment:453}
            for (const log of logs) {
                if (log.log_level === 'ERROR' && log.service_name) {
                    errorCountsByService[log.service_name] = (errorCountsByService[log.service_name] || 0) + 1;
                    
                    
                }
            }

            const globalPipeline = redis.pipeline();
            const serviceOrder = Object.keys(errorCountsByService);
            console.log(serviceOrder)
            for (const [serviceName, count] of Object.entries(errorCountsByService)) { // [auth,499]
                const redisKey = `alerts:${serviceName}:errors`;


                for (let i = 0; i < count; i++) {
                    const uniqueMember = `${now}-${Math.random().toString(36).substring(2,9)}`;
                    globalPipeline.zadd(redisKey, now, uniqueMember);
                }

                globalPipeline.zremrangebyscore(redisKey, '-inf', now - CurrentWindowSizeMs);
                globalPipeline.zcard(redisKey);
                globalPipeline.expire(redisKey, 60);
            }

            const results = await globalPipeline.exec();
            if (!results) return;

            let resultIndex = 0;
            for (const serviceName of serviceOrder) {
                const count = errorCountsByService[serviceName];
                const zcardPosition = resultIndex + count + 1;
                const errorsCount = results[zcardPosition]?.[1] as number;

                resultIndex += count + 3;

                console.log(`[Redis Monitor] Service: ${serviceName} | Errors in last ${CurrentWindowSizeMs}: ${errorsCount}`);

                if (errorsCount > CurrentThreshold) {
                    console.log(`🚨 THRESHOLD BREACHED: Service [${serviceName}] crossed limits!`);
                    
                    await AlertModel.create({
                        service_name: serviceName,
                        errors_count: errorsCount,
                        threshold_limit: CurrentThreshold,
                        window_size: CurrentWindowSizeMs
                    });
                    console.log('alert model created');
                    
                }
            }

        } catch (error) {
            console.error('Error processing backend log batch:', error);
        }
    })();

    return response;
});

export default router;