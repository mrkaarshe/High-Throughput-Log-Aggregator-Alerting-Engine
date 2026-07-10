import { Hono } from 'hono'
import './config/db'
import './config/redis'
import logRouter from './routes/LogRoute'
import RulerRout from './routes/RuleRoute'


import { backgroundWorker } from './workers/logWorker'
const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello From Server!')
})

app.route('/v2',logRouter);
app.route('/v2/rule', RulerRout)
backgroundWorker()



export default {
  fetch:app.fetch,
  port:Bun.env.port || 9000
}
