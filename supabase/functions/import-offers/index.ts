import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPEN_DATA_PAGE = "https://www.ilportaleofferte.it/portaleOfferte/it/open-data.page";
const BASE_URL = "https://www.ilportaleofferte.it";

/**
 * Fetch the Open Data page and extract the latest PLACET CSV URLs for E and G.
 * Links: /portaleOfferte/resources/opendata/csv/offerte/.../PO_Offerte_E_PLACET_YYYYMMDD.csv
 */
async function discoverCsvUrls(): Promise<{ electricityUrl: string; gasUrl: string }> {
      const resp = await fetch(OPEN_DATA_PAGE);
      if (!resp.ok) throw new Error(`Cannot fetch open-data page: ${resp.status}`);
      const html = await resp.text();

  const hrefRegex = /href="([^"]+opendata\/csv\/offerte[^"]+\.csv)"/g;
      const electricityLinks: string[] = [];
      const gasLinks: string[] = [];

  let m: RegExpExecArray | null;
      while ((m = hrefRegex.exec(html)) !== null) {
              const href = m[1];
              if (href.includes('PO_Offerte_E_PLACET')) {
                        electricityLinks.push(href);
              } else if (href.includes('PO_Offerte_G_PLACET')) {
                        gasLinks.push(href);
              }
      }

  if (electricityLinks.length === 0) throw new Error("No electricity PLACET CSV found on open-data page");
      if (gasLinks.length === 0) throw new Error("No gas PLACET CSV found on open-data page");

  const pickLatest = (links: string[]) =>
          links.sort((a, b) => b.localeCompare(a))[0];

  return {
          electricityUrl: BASE_URL + pickLatest(electricityLinks),
          gasUrl: BASE_URL + pickLatest(gasLinks),
  };
}

/** Parse a CSV line with comma separator, handling quoted fields. */
function parseCsvLine(line: string): string[] {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                        inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
              } else {
                        current += char;
              }
      }
      result.push(current.trim());
      return result;
}

/** Strip UTF-8 BOM if present. */
function stripBom(text: string): string {
      return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Map tipo_offerta → 'FIXED' | 'VARIABLE' (uppercase, matching offers_price_type_check).
 */
function parsePriceType(raw: string | undefined): string | null {
      if (!raw) return null;
      const v = raw.toLowerCase();
      if (v.includes('fisso') || v === 'fixed' || v === 'f') return 'FIXED';
      if (v.includes('variabil') || v === 'variable' || v === 'v') return 'VARIABLE';
      return null;
}

/** Parse Italian date dd/MM/yyyy to ISO yyyy-MM-dd, or null. */
function parseDate(raw: string | undefined): string | null {
      if (!raw) return null;
      const d = raw.trim();
      const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      if (d.match(/^\d{4}-\d{2}-\d{2}$/)) return d;
      return null;
}

/** Parse numeric string (comma or dot decimal) to float, or null. */
function parseNum(raw: string | undefined): number | null {
      if (!raw || raw.trim() === '') return null;
      const n = parseFloat(raw.replace(',', '.'));
      return isNaN(n) ? null : n;
}

async function importDataset(
      supabaseAdmin: ReturnType<typeof createClient>,
      url: string,
      commodity: 'ELECTRICITY' | 'GAS',
    ): Promise<{ count: number; errors: string[] }> {
      const errors: string[] = [];
      let count = 0;

  const response = await fetch(url);
      if (!response.ok) {
              errors.push(`HTTP ${response.status} fetching ${url}`);
              return { count, errors };
      }

  const rawText = stripBom(await response.text());
      const lines = rawText.split('\n').map((l: string) => l.trimEnd()).filter((l: string) => l.length > 0);

  if (lines.length < 2) {
          errors.push(`No data rows in ${commodity} CSV (${url})`);
          return { count, errors };
  }

  const headers = parseCsvLine(lines[0]).map((h: string) => h.toLowerCase().replace(/\s+/g, '_'));

  const idx = (names: string[]) => {
          for (const n of names) {
                    const i = headers.indexOf(n);
                    if (i >= 0) return i;
          }
          for (const n of names) {
                    const i = headers.findIndex((h: string) => h.includes(n));
                    if (i >= 0) return i;
          }
          return -1;
  };

  const iSupplier  = idx(['denominazione']);
      const iName      = idx(['nome_offerta']);
      const iCode      = idx(['cod_offerta']);
      const iPriceType = idx(['tipo_offerta']);
      const iFixPart   = idx(['p_fix_f', 'p_fix_v']);
      const iUnitPrice = commodity === 'ELECTRICITY'
        ? idx(['p_vol_mono', 'p_vol_f1', 'p_vol_f2'])
              : idx(['p_vol']);
      const iUrlOffer  = idx(['url_offerta']);
      const iValidFrom = idx(['data_inizio']);
      const iValidTo   = idx(['data_fine']);

  const batchSize = 200;
      const offers: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
          try {
                    const fields = parseCsvLine(lines[i]);
                    if (fields.length < 3) continue;

            const supplierName = iSupplier >= 0 ? fields[iSupplier] || 'Sconosciuto' : 'Sconosciuto';
                    const offerName    = iName >= 0     ? fields[iName]     || `Offerta ${i}` : `Offerta ${i}`;
                    const sourceId     = iCode >= 0     ? fields[iCode]     || `${commodity}-${i}` : `${commodity}-${i}`;

            if (!sourceId) continue;

            const priceType = parsePriceType(iPriceType >= 0 ? fields[iPriceType] : undefined);
                    const unitPrice = parseNum(iUnitPrice >= 0 ? fields[iUnitPrice] : undefined);
                    const fixedFee  = parseNum(iFixPart >= 0 ? fields[iFixPart] : undefined);
                    const urlOffer  = iUrlOffer >= 0 ? (fields[iUrlOffer] || null) : null;
                    const validFrom = parseDate(iValidFrom >= 0 ? fields[iValidFrom] : undefined);
                    const validTo   = parseDate(iValidTo >= 0 ? fields[iValidTo] : undefined);

            offers.push({
                        source: 'PORTALE_OFFERTE',
                        market: 'PLACET',
                        source_offer_id: sourceId,
                        commodity,
                        supplier_name: supplierName,
                        offer_name: offerName,
                        price_type: priceType,
                        unit_price_est: unitPrice,
                        fixed_fee_monthly_est: fixedFee != null ? fixedFee / 12 : null,
                        url_offer: urlOffer,
                        valid_from: validFrom,
                        valid_to: validTo,
                        raw: Object.fromEntries(headers.map((h: string, j: number) => [h, fields[j] ?? null])),
                        imported_at: new Date().toISOString(),
            });
                    count++;
          } catch (e: unknown) {
                    errors.push(`Row ${i}: ${(e as Error).message}`);
          }
  }

  for (let i = 0; i < offers.length; i += batchSize) {
          const batch = offers.slice(i, i + batchSize);
          const { error } = await supabaseAdmin
            .from('offers')
            .upsert(batch, { onConflict: 'source,source_offer_id' });
          if (error) {
                    errors.push(`Batch upsert (${commodity} rows ${i}-${i + batchSize}): ${error.message}`);
          }
  }

  return { count, errors };
}

serve(async (req) => {
      if (req.method === 'OPTIONS') {
              return new Response(null, { headers: corsHeaders });
      }

        const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL')!,
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
              );

        const { data: run, error: runErr } = await supabaseAdmin
        .from('import_runs')
        .insert({ status: 'running', source: 'PORTALE_OFFERTE' })
        .select()
        .single();

        if (runErr) {
                return new Response(JSON.stringify({ success: false, error: `Cannot create import_run: ${runErr.message}` }), {
                          status: 500,
                          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
        }

        const allErrors: string[] = [];
      let totalCount = 0;
      let electricityUrl = '';
      let gasUrl = '';

        try {
                const urls = await discoverCsvUrls();
                electricityUrl = urls.electricityUrl;
                gasUrl = urls.gasUrl;

        const elecResult = await importDataset(supabaseAdmin, electricityUrl, 'ELECTRICITY');
                totalCount += elecResult.count;
                allErrors.push(...elecResult.errors);

        const gasResult = await importDataset(supabaseAdmin, gasUrl, 'GAS');
                totalCount += gasResult.count;
                allErrors.push(...gasResult.errors);

        await supabaseAdmin.from('import_runs').update({
                  finished_at: new Date().toISOString(),
                  status: allErrors.length > 0 && totalCount === 0 ? 'failure' : 'success',
                  count: totalCount,
                  errors: allErrors.length > 0 ? { errors: allErrors } : null,
        }).eq('id', run.id);

        return new Response(JSON.stringify({
                  success: true,
                  imported: totalCount,
                  electricity_url: electricityUrl,
                  gas_url: gasUrl,
                  errors: allErrors,
        }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

        } catch (e: unknown) {
    const msg = (e as Error).message;
                await supabaseAdmin.from('import_runs').update({
                          finished_at: new Date().toISOString(),
                          status: 'failure',
                          errors: { errors: [msg] },
                }).eq('id', run.id);

        return new Response(JSON.stringify({ success: false, error: msg }), {
                  status: 500,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        }
});
