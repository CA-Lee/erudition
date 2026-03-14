import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { MiddlewareHandler } from 'hono'
import { onboard, type User } from '../onboarding'


export const cfAccess: MiddlewareHandler<{ Bindings: Env; Variables: { user: User } }> = async (c, next) => {
  const jwt = c.req.header('Cf-Access-Jwt-Assertion')
  if (!jwt) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const jwks = createRemoteJWKSet(new URL(`${c.env.CF_TEAM_DOMAIN}/cdn-cgi/access/certs`))
    const { payload } = await jwtVerify(jwt, jwks)
    const email = payload.email as string

    const existing = await c.env.DB
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first<User>()

    c.set('user', existing ?? await onboard(email, c.env.DB))
    await next()
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }
}
