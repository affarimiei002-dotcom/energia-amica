export default async function handler(req: any, res: any) {
      try {
                if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

          const cronSecret = process.env.CRON_SECRET;
                const rawHeader = req.headers['x-cron-secret'] || req.headers['X-CRON-SECRET'];
                const reqSecret = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
                if (!cronSecret) return res.status(500).json({ error: 'Missing CRON_SECRET' });
                if (reqSecret !== cronSecret) return res.status(401).json({ error: 'Unauthorized' });

          const baseUrl = process.env.VITE_SUPABASE_URL;
                const apikey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
                if (!baseUrl || !apikey) {
                              return res.status(500).json({ error: 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY' });
                }

          const r = await fetch(`${baseUrl}/functions/v1/evaluate-alerts`, {
                        method: 'POST',
                        headers: { 'content-type': 'application/json', 'apikey': apikey },
                        body: JSON.stringify({})
          });
                const text = await r.text();
                res.status(r.status).send(text);
      } catch (e: any) {
                res.status(500).json({ error: e?.message ?? String(e) });
      }
}
