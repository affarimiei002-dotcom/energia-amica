import type { VercelRequest, VercelResponse } from '@vercel/node';

const hits = new Map<string, { count: number; ts: number }>();

const WINDOW_MS = 60_000;

const MAX_PER_WINDOW = 20;

function getClientIp(req: VercelRequest) {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return res.status(500).json({ error: 'Missing TURNSTILE_SECRET_KEY' });

  const ip = getClientIp(req);
  const now = Date.now();
  const prev = hits.get(ip);
  const slot = (!prev || now - prev.ts > WINDOW_MS) ? { count: 0, ts: now } : prev;
  slot.count += 1;
  hits.set(ip, slot);

  if (slot.count > MAX_PER_WINDOW) return res.status(429).json({ error: 'Too many requests' });

  const { token } = (req.body || {}) as { token?: string };
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('response', token);
  form.set('remoteip', ip);

  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  const data = await r.json();
  if (!data?.success) return res.status(400).json({ success: false, data });

  return res.status(200).json({ success: true });
}
