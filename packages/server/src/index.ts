import { Hono } from 'hono'
import { cfAccess, type Env } from './middleware/cf-access'

const app = new Hono<Env>()

app.use('*', cfAccess)

app.get('/', (c) => c.json({ ok: true }))

app.get('/me', (c) => c.json(c.get('user')))

export default app
