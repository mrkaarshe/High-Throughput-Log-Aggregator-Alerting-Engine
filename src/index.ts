import { Hono } from 'hono'
import './config/db'
import './config/redis'
import logRouter from './routes/LogRoute'
import RulerRout from './routes/RuleRoute'
const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello From Server!')
})

app.route('/v1', logRouter);
app.route('/v1/rule', RulerRout)


export default {
  fetch:app.fetch,
  port:9000
}
