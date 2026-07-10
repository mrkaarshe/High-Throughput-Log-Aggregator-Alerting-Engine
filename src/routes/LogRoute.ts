import { Hono } from "hono";
import redis from "../config/redis";

const logRouter = new Hono();

logRouter.post('/logs', async (c)=> {
   try {
     const logs =  await c.req.json();
    // first chake logs is array
    if(!Array.isArray(logs)){
        return c.json({ status: 'error', message: 'Expected an array of log entries' }, 400);
    }

    // send response to the client 
    const response = c.json({ 
        status: "Accepted", 
        message: "Logs received successfully.",
        received_count:logs.length
    }, 202);

    // then background work
    (async () => {
      try {

        // also filter logs
        const validLogs = logs.filter(log => log && typeof log === "object" && log.service_name)
        if (validLogs.length === 0) return;


        // make queu redis pipline
        const queueRedis = redis.pipeline();
        for(const log of validLogs){
          // change in to jsonStringify to underStand redis queue list
            queueRedis.lpush('log_queue',JSON.stringify(log));
        }

        await queueRedis.exec();

        console.log(`Queue Ingest ${validLogs.length} logs successfully buffered to Redis`);
      } catch (error) {
        console.error(error)
       
      }

    })();

    return response


   } catch (error) {
     return c.json({ status: 'error', message: 'Internal Server Error' }, 500);
   }
})

export default logRouter