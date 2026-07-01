import { Schema, model } from 'mongoose';

const ruleSchema = new Schema({
    service_name: { type: String, required: true, unique: true }, 
    log_level: { type: String, required: true, default: 'ERROR' },
    threshold: { type: Number, required: true },
    time_window_ms: { type: Number, required: true },
    created_at: { type: Date, default: Date.now }
});

export default model('Rule', ruleSchema);