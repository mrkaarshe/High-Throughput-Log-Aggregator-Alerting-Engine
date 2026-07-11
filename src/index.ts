import { Hono } from 'hono'
import './config/db'
import './config/redis'
import logRouter from './routes/LogRoute'
import RulerRout from './routes/RuleRoute'
const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello From Server!')
})

app.route('/v2/logs',logRouter);
app.route('/v2/rule', RulerRout)




export default {
  fetch:app.fetch,
  port:Bun.env.port || 9000
}
