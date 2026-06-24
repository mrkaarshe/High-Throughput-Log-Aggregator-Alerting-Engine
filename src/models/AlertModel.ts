import { Schema, model } from 'mongoose';

const alertSchema = new Schema({
    service_name: { type: String, required: true },
    errors_count: { type: Number, required: true },
    threshold_limit: { type: Number, required: true },
    window_size: { type: String, required: true },
    triggered_at: { type: Date, default: Date.now }
});

export default model('Alert', alertSchema);