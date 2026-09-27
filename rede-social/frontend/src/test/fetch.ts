/** Resposta JSON para usar em mocks de `fetch` (ex.: `vi.fn().mockResolvedValue(jsonResponse(...))`). */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
