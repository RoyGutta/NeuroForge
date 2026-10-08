/**
 * Vercel function for brief interpretation. The provider key is read from
 * the server environment (ANTHROPIC_API_KEY); without it the endpoint
 * reports "not configured" and the application falls back to the
 * rule-based interpreter. See docs/INTERPRETER.md.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { serveNode } from "../src/server/node";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await serveNode(req, res, req.body);
}
