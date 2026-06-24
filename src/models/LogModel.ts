import mongoose from'mongoose'
const logSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    service_name: { type: String, required: true },
    log_level: { type: String, enum: ['INFO', 'WARN', 'ERROR'],required: true },
    message: { type: String, required: true },
    metadata: mongoose.Schema.Types.Mixed
});

const LogModel = mongoose.model('Log', logSchema);

export default LogModel;