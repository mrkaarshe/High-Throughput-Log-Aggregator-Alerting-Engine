import redis from "../config/redis";
import AlertModel from "../models/AlertModel";
import LogModel from "../models/LogModel";
import RuleModel from "../models/RuleModel";
import { sendSlackNotification } from "../utils/wepHook";
import { WORKER_CONFIG } from '../config/workerConfig';

export const backgroundWorker = async () => {
    console.log('Background process started and listening...');
     while (true) {
          try {
       
            // Fetch the first 500 logs from the tail of the queue
            const result = await redis.lmpop(1,'log_queue',"RIGHT","COUNT",WORKER_CONFIG.BATCH_SIZE)
           
            
            if (!result) {
                // Wait 1 second if result is empty
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            const rawlogs =  result[1]

            if (!rawlogs.length) {
                // Wait 1 second if queue is empty
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }

            // Parse raw string logs into JSON objects
            const validLogs = [];
            for(const raw of rawlogs){
                try {
                    validLogs.push(JSON.parse(raw))
                } catch (error) {
                    console.log('bad Json',error);
                    
                }
            }
            if (validLogs.length === 0) {
                continue;
            }
            
            // MongoDB Bulk Insert Asynchronous background task
            try {
                 LogModel.insertMany(validLogs, { ordered: false });
            } catch (err) {
                console.error(err);
            }

            const now: number = Date.now();

            // Map to hold error counts per service in the current batch
            const errorsCountsByServics: Record<string, number> = {}; 

            for (const log of validLogs) {
                if (log.log_level === 'ERROR' && log.service_name) {
                    errorsCountsByServics[log.service_name] = (errorsCountsByServics[log.service_name] || 0) + 1;
                }
            }

            const serviceOrder = Object.keys(errorsCountsByServics); 
            if (serviceOrder.length === 0) continue;
            
            // Fetch dynamic threshold rules from MongoDB using a lean query for performance
            const activeRules = await RuleModel.find({ service_name: { $in: serviceOrder } }).lean();
            const RulesMap = new Map(activeRules.map(i => [i.service_name, i]));
            
            // Global Pipeline to bundle all Redis commands into one single network round-trip
            const globalPipeline = redis.pipeline();
            const activeServicesInPipeline: string[] = [];
            
        
            for (let [serviceName, count] of Object.entries(errorsCountsByServics)) {
                const Rule = RulesMap.get(serviceName);
                const currentWindowSizeMs = Rule ? Rule.time_window_ms : WORKER_CONFIG.DEFAULT_WINDOW_MS;

                const redisKey = `Alert:${serviceName}:errors`;
                const zaddArgs: (string | number)[] = []; 
                
                for (let i = 0; i < count; i++) {
                    // Combine timestamp,  and index loop to guarantee absolute uniqueness
                    zaddArgs.push(now, `${now}-${i}`);
                }

                globalPipeline.zadd(redisKey, ...zaddArgs);        
                globalPipeline.zremrangebyscore(redisKey, '-inf', now - currentWindowSizeMs);
                globalPipeline.zcard(redisKey);
                globalPipeline.expire(redisKey, 60);

                activeServicesInPipeline.push(serviceName);
            }

            const results = await globalPipeline.exec();
            if (!results) continue;

            const CooldownPipeline = redis.pipeline();

            const breachedServices: Array<{ serviceName: string; errorsCount: number; rule: any }> = [];

            for (let i = 0; i < activeServicesInPipeline.length; i++) {

                const serviceName = activeServicesInPipeline[i]; 
                
                
                const rule = RulesMap.get(serviceName);

                const currentThreshold = rule ? rule.threshold : WORKER_CONFIG.DEFAULT_THRESHOLD;
            
                // Extracting ZCARD result index from the flat pipeline results array
                const zcardIndex = (i * 4) + 2; 
                const errorsCount = results[zcardIndex]?.[1] as number;

                const currentWindowSizeMs = rule ? rule.time_window_ms : WORKER_CONFIG.DEFAULT_WINDOW_MS;

                console.log(`[Redis Monitor] Service: ${serviceName} | Errors in last ${currentWindowSizeMs}ms : ${errorsCount} (Threshold limit: ${currentThreshold})`);
        
                if (errorsCount > currentThreshold) {
                    const coolDownKey = `Alert:${serviceName}:CoolDown:Activated`;
                    // Stage a distributed lock using SET NX with an expiration time
                    CooldownPipeline.set(coolDownKey, "ACTIVE", "EX", WORKER_CONFIG.COOL_DOWN_DURATION, 'NX');
                    breachedServices.push({ serviceName, errorsCount, rule });
                }
            }

            // Only execute cooldown pipeline if there are actual breached services
            const coolDownResult = breachedServices.length ? await CooldownPipeline.exec() : [];

            
            for (let i = 0; i < breachedServices.length; i++) {
                const { serviceName, errorsCount, rule } = breachedServices[i];

                const currentThreshold = rule ? rule.threshold : WORKER_CONFIG.DEFAULT_THRESHOLD;
                const currentWindowSizeMs = rule ? rule.time_window_ms : WORKER_CONFIG.DEFAULT_WINDOW_MS;

                // Save the triggered alert audit entry into MongoDB asynchronously 
                try {
                     AlertModel.create({
                        service_name: serviceName,
                        errors_count: errorsCount,
                        threshold_limit: currentThreshold,
                        window_size: currentWindowSizeMs
                    });
                    console.log('breached service log saved to the data base');
                    
                } catch (err: any) {
                    console.error(err.message);
                }
                
            
                const lockAcquired  = coolDownResult[i]?.[1]==="OK"; 
                
                if (!lockAcquired) {
                    console.log(`[Cooldown] Alert suppressed for ${serviceName}. Engine is cooling down.`);
                    continue;
                }

                console.log(`Service: ${serviceName} has breached error threshold`);
                
                // Dispatch real-time alert webhook notification to Slack channel
                await sendSlackNotification(serviceName, errorsCount, currentThreshold, currentWindowSizeMs);
              
            }
        } catch (error) {
        console.error("Worker process error:", error);
         await new Promise(r => setTimeout(r, 1000));
    }
        }
  
};