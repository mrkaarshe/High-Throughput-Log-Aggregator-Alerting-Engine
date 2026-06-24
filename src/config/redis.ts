import Redis from "ioredis"
const redis = new Redis('redis://127.0.0.1:6379');
redis.on('connect',() => console.log('redis server connected success'));
redis.on('error',(err) => console.error('Redis Connection Error',err));
export default redis