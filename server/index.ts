import { Hono } from 'hono'
import { cfAccess } from './middleware/cf-access'
import type { User } from './onboarding'

const app = new Hono<{ Bindings: Env; Variables: { user: User } }>().basePath('/api')

app.use('*', cfAccess)

app.get('/', (c) => c.json({ ok: true }))

app.get('/me', (c) => c.json(c.get('user')))

export default app
