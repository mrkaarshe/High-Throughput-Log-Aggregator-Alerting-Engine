import { WORKER_CONFIG } from "../config/workerConfig";

export const sendSlackNotification = (serviceName: string, errorsCount: number, threshold: number, windowMs: number) => {
    if (!WORKER_CONFIG.WEBHOOK_URL) return;

    const payload = {
        text: `!*CRITICAL ALERT*! \n\n*Service:* \`${serviceName}\` has breached error rules!\n*Active Errors:* \`${errorsCount}\` inside a rolling \`${windowMs / 1000}s\` window.\n*Threshold Limit:* \`${threshold}\``
    };

    fetch(WORKER_CONFIG.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(() => console.log(`Webhook Slack notification successfully dispatched for [${serviceName}].`))
    .catch(err => console.error('Webhook Error:', err));
};