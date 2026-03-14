export type User = { id: string; email: string; created_at: number }

export async function onboard(email: string, db: D1Database): Promise<User> {
  const id = crypto.randomUUID()
  const created_at = Date.now()
  await db.prepare('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)')
    .bind(id, email, created_at)
    .run()
  return { id, email, created_at }
}
