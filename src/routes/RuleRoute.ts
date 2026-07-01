import { Hono } from 'hono';
import RuleModel from '../models/RuleModel';

const RulerRout = new Hono();
RulerRout.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const { service_name, log_level, threshold, time_window_ms } = body;

        if (!service_name || !threshold || !time_window_ms) {
            return c.json({ status: 'error', message: 'Missing required fields' }, 400);
        }

        const rule = await RuleModel.findOneAndUpdate(
            { service_name },
            { log_level: log_level || 'ERROR', threshold, time_window_ms },
            { new: true, upsert: true }
        );

        return c.json({ status: 'success', message: 'Rule saved successfully', data: rule }, 200);
    } catch (error: any) {
        return c.json({ status: 'error', message: error.message },);
    }
});

RulerRout.get('/', async (c) => {
    const rules = await RuleModel.find();
    return c.json({ status: 'success', data: rules });
});

export default RulerRout