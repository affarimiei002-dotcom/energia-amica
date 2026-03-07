export default async function handler(req: any, res: any) {
        try {
                  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

          const baseUrl = process.env.VITE_SUPABASE_URL;
                  const apikey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
                  if (!baseUrl || !apikey) {
                              return res.status(500).json({ error: 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY' });
                  }

          // --- Auth mode 1: CRON secret ---
          const rawCronHeader = req.headers['x-cron-secret'] || req.headers['X-CRON-SECRET'];
                  const reqSecret = Array.isArray(rawCronHeader) ? rawCronHeader[0] : rawCronHeader;

          if (reqSecret) {
                      const cronSecret = process.env.CRON_SECRET;
                      if (!cronSecret) return res.status(500).json({ error: 'Missing CRON_SECRET' });
                      if (reqSecret !== cronSecret) return res.status(401).json({ error: 'Unauthorized' });
                      // CRON auth passed – fall through to execution
          } else {
                      // --- Auth mode 2: Admin Bearer token ---
                    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
                      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
                        ? authHeader.slice(7)
                                    : null;

                    if (!token) return res.status(401).json({ error: 'Unauthorized' });

                    // Verify token with Supabase Auth
                    const userRes = await fetch(`${baseUrl}/auth/v1/user`, {
                                  headers: { 'apikey': apikey, 'Authorization': `Bearer ${token}` },
                    });
                      if (!userRes.ok) return res.status(401).json({ error: 'Unauthorized' });
                      const userData = await userRes.json();
                      const email: string = (userData?.email ?? '').toLowerCase().trim();

                    const adminEmails = (process.env.VITE_ADMIN_EMAILS ?? '')
                        .split(',')
                        .map((e: string) => e.trim().toLowerCase())
                        .filter(Boolean);

                    if (!adminEmails.includes(email)) return res.status(401).json({ error: 'Unauthorized' });
                      // Admin auth passed – fall through to execution
          }

          const r = await fetch(`${baseUrl}/functions/v1/evaluate-alerts`, {
                      method: 'POST',
                      headers: { 'content-type': 'application/json', 'apikey': apikey },
                      body: JSON.stringify({}),
          });
                  const text = await r.text();
                  res.status(r.status).send(text);
        } catch (e: any) {
                  res.status(500).json({ error: e?.message ?? String(e) });
        }
}
