import { checkHealth, type HealthDeps } from "../health";

export async function healthResponse(deps: HealthDeps): Promise<Response> {
  const { status, body } = await checkHealth(deps);
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
