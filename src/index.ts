import { Hono } from 'hono'
import './config/db'
import './config/redis'
import logRouter from './routes/LogRoute'
const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello From Server!')
})

app.route('/v1', logRouter);


export default {
  fetch:app.fetch,
  port:4000
}
