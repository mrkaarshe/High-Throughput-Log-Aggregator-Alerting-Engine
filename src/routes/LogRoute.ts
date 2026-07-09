import { Hono } from 'hono';
import logModel from '../models/LogModel';
import redis from '../config/redis';
import AlertModel from '../models/AlertModel';
import RuleModel from '../models/RuleModel';

const router = new Hono();
const wepHookUrl = 'https://hooks.slack.com/services/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';

router.post('/logs', async (c) => {
    const logs = await c.req.json();

    if (!Array.isArray(logs)) {
        return c.json({ status: 'error', message: 'Expected an array of log entries' }, 400);
    }

    const response = c.json({ 
        status: "Accepted", 
        message: "Logs received successfully.",
        received_count: logs.length
    }, 202);

    // Background process 
    (async () => {
        try {
            await logModel.insertMany(logs).catch(err => 
                console.error('[MongoDB Error] Bulk insertion failed:', err.message)
            );

            const now = Date.now();
            const coolDownDuration = 300; 

           
            const errorCountsByService: Record<string, number> = {}; 
            for (const log of logs) {
                if (log.log_level === 'ERROR' && log.service_name) {
                    errorCountsByService[log.service_name] = (errorCountsByService[log.service_name] || 0) + 1;
                }
            }

            const serviceOrder = Object.keys(errorCountsByService);
            if (serviceOrder.length === 0) return;

            
            const activeRules = await RuleModel.find({ service_name: { $in: serviceOrder } });
            const rulesMap = new Map(activeRules.map(r => [r.service_name, r]));
            
            

            const globalPipeline = redis.pipeline();
            const activeServicesInPipeline: string[] = [];

           
            for (const [serviceName, count] of Object.entries(errorCountsByService)) { 
                const rule = rulesMap.get(serviceName);
                const currentWindowSizeMs = rule ? rule.time_window_ms : 10000;

                const redisKey = `alerts:${serviceName}:errors`;
                let zaddArgs: (string | number)[] = [];
                
                for (let i = 0; i < count; i++) {
                    const uniqueMember = `${now}-${Math.random().toString(36).substring(2, 9)}`;
                    zaddArgs.push(now, uniqueMember);
                }
                
                globalPipeline.zadd(redisKey, ...zaddArgs);
                globalPipeline.zremrangebyscore(redisKey, '-inf', now - currentWindowSizeMs);
                globalPipeline.zcard(redisKey);
                globalPipeline.expire(redisKey, 60);

                activeServicesInPipeline.push(serviceName);
            }

            const results = await globalPipeline.exec();
            if (!results) return;


            for (let i = 0; i < activeServicesInPipeline.length; i++) {
                const serviceName = activeServicesInPipeline[i];
                const rule = rulesMap.get(serviceName);
                
                const currentThreshold = rule ? rule.threshold : 20;
                const currentWindowSizeMs = rule ? rule.time_window_ms : 10000; 
                
                const zcardIndex = (i * 4) + 2; 
                const errorsCount = results[zcardIndex]?.[1] as number;

                console.log(`[Redis Monitor] Service: ${serviceName} | Errors in last ${currentWindowSizeMs}ms : ${errorsCount} (Threshold limit: ${currentThreshold})`);

                if (errorsCount > currentThreshold) {
                    console.log(`THRESHOLD BREACHED: Service [${serviceName}] crossed limits!`);
                    
                    await AlertModel.create({
                        service_name: serviceName,
                        errors_count: errorsCount,
                        threshold_limit: currentThreshold,
                        window_size: currentWindowSizeMs
                    }).catch(err => console.error('[MongoDB Error] Alert creation failed:', err.message));
                    
                    const coolDownKey = `Alert:${serviceName}:CoolDownActivated`;
                    const lockAcquired = await redis.set(coolDownKey, 'ACTIVE', 'EX', coolDownDuration, 'NX');

                    if (!lockAcquired) {
                        console.log(`[Throttling] Alert for [${serviceName}] is MUTED. Cooldown lock active.`);
                        continue; 
                    }

                    console.log(`[Throttling] Alert throttling ENGAGED for [${serviceName}]. Muted for 5 minutes.`);
                    
                    try {
                        const webhookPayload = {
                            text: `🚨 *CRITICAL ALERT* 🚨\n*Service:* \`${serviceName}\` has breached dynamic error rules!\n*Active Errors:* ${errorsCount} inside a rolling ${currentWindowSizeMs / 1000}s window.\n*Configured Threshold:* > ${currentThreshold}\n*Status:* Cooldown locked for 5 minutes.`
                        };

                        const webhookResponse = await fetch(wepHookUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(webhookPayload)
                        });

                        if (webhookResponse.ok) {
                            console.log(`[Webhook] Slack notification successfully dispatched for [${serviceName}].`);
                        } else {
                            console.error(`[Webhook Failure] Slack responded with status: ${webhookResponse.status}`);
                        }
                    } catch (webhookError) {
                        console.error('Failed to dispatch notification payload via Webhook:', webhookError);
                    }
                }
            }

        } catch (error) {
            console.error('Error processing backend log batch:', error);
        }
    })();

    return response;
});

export default router;
