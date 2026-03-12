export async function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${import.meta.env.VITE_API_URL}${path}`, { credentials: 'include', ...init })
}
