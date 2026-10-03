import "server-only";
import type { ZodType } from "zod";

/**
 * Request-boundary helpers shared by every route (PLAN section 3.4).
 * Errors are deliberately generic: they never echo the body, a field value
 * or a validation detail back to the caller.
 */

export function jsonError(
  status: number,
  code: string,
  message: string,
  headers: Record<string, string> = {},
): Response {
  return Response.json({ error: code, message }, { status, headers });
}

const badRequest = () => jsonError(400, "invalid_request", "The request was not valid.");
const tooLarge = () => jsonError(413, "payload_too_large", "The request was too large.");

/** Reads at most `maxBytes` of the body, or returns null as soon as the cap is exceeded. */
async function readCapped(req: Request, maxBytes: number): Promise<string | null> {
  if (req.body === null) return "";
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}

/**
 * Parses and validates a JSON request body.
 * Returns the parsed value, or a ready-to-send 400 or 413 `Response`.
 * The size cap is enforced twice: on `content-length` up front, and while
 * reading, so a caller cannot dodge it by lying about or omitting the header.
 */
export async function parseJson<T>(
  req: Request,
  schema: ZodType<T>,
  maxBytes: number,
): Promise<T | Response> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return badRequest();
  }
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return tooLarge();

  const text = await readCapped(req, maxBytes);
  if (text === null) return tooLarge();

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return badRequest();
  }
  const parsed = schema.safeParse(json);
  return parsed.success ? parsed.data : badRequest();
}
