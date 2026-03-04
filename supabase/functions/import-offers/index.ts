import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ARERA Portale Offerte Open Data URLs
const ELECTRICITY_CSV_URL = "https://www.ilportaleofferte.it/portaleOfferte/opendata/csv/offerte_energia_elettrica.csv";
const GAS_CSV_URL = "https://www.ilportaleofferte.it/portaleOfferte/opendata/csv/offerte_gas.csv";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function importDataset(supabaseAdmin: any, url: string, commodity: string): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      errors.push(`Failed to fetch ${commodity} data: ${response.status} ${response.statusText}`);
      return { count, errors };
    }

    const text = await response.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      errors.push(`No data rows in ${commodity} CSV`);
      return { count, errors };
    }

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
    
    // Find relevant column indices
    const idIdx = headers.findIndex(h => h.includes('codice_offerta') || h.includes('id_offerta') || h === 'id');
    const supplierIdx = headers.findIndex(h => h.includes('operatore') || h.includes('fornitore') || h.includes('venditore'));
    const nameIdx = headers.findIndex(h => h.includes('nome_offerta') || h.includes('denominazione'));
    const priceTypeIdx = headers.findIndex(h => h.includes('tipo_prezzo') || h.includes('prezzo_fisso'));
    const priceIdx = headers.findIndex(h => h.includes('prezzo') || h.includes('costo_unitario') || h.includes('spesa_materia'));
    const feeIdx = headers.findIndex(h => h.includes('quota_fissa') || h.includes('costo_fisso'));
    const urlIdx = headers.findIndex(h => h.includes('link') || h.includes('url'));
    const validFromIdx = headers.findIndex(h => h.includes('data_inizio') || h.includes('data_decorrenza'));
    const validToIdx = headers.findIndex(h => h.includes('data_fine') || h.includes('data_scadenza'));

    const batchSize = 100;
    const offers: any[] = [];

    for (let i = 1; i < Math.min(lines.length, 500); i++) { // Limit to 500 for MVP
      try {
        const fields = parseCSVLine(lines[i]);
        if (fields.length < 3) continue;

        const sourceOfferId = idIdx >= 0 ? fields[idIdx] : `${commodity}-${i}`;
        const supplierName = supplierIdx >= 0 ? fields[supplierIdx] : 'Sconosciuto';
        const offerName = nameIdx >= 0 ? fields[nameIdx] : `Offerta ${i}`;
        
        if (!sourceOfferId || !supplierName) continue;

        let priceType: string | null = null;
        if (priceTypeIdx >= 0) {
          const pt = fields[priceTypeIdx]?.toLowerCase();
          if (pt?.includes('fisso') || pt === 'f') priceType = 'fixed';
          else if (pt?.includes('variabil') || pt === 'v') priceType = 'variable';
        }

        let unitPrice: number | null = null;
        if (priceIdx >= 0) {
          const p = parseFloat(fields[priceIdx]?.replace(',', '.'));
          if (!isNaN(p) && p > 0 && p < 10) unitPrice = p;
        }

        let fixedFee: number | null = null;
        if (feeIdx >= 0) {
          const f = parseFloat(fields[feeIdx]?.replace(',', '.'));
          if (!isNaN(f)) fixedFee = f;
        }

        const urlOffer = urlIdx >= 0 ? fields[urlIdx] || null : null;

        let validFrom: string | null = null;
        if (validFromIdx >= 0 && fields[validFromIdx]) {
          const d = fields[validFromIdx].trim();
          if (d.match(/\d{2}\/\d{2}\/\d{4}/)) {
            const [dd, mm, yyyy] = d.split('/');
            validFrom = `${yyyy}-${mm}-${dd}`;
          } else if (d.match(/\d{4}-\d{2}-\d{2}/)) {
            validFrom = d;
          }
        }

        let validTo: string | null = null;
        if (validToIdx >= 0 && fields[validToIdx]) {
          const d = fields[validToIdx].trim();
          if (d.match(/\d{2}\/\d{2}\/\d{4}/)) {
            const [dd, mm, yyyy] = d.split('/');
            validTo = `${yyyy}-${mm}-${dd}`;
          } else if (d.match(/\d{4}-\d{2}-\d{2}/)) {
            validTo = d;
          }
        }

        offers.push({
          source: 'PORTALE_OFFERTE',
          source_offer_id: sourceOfferId,
          commodity,
          supplier_name: supplierName,
          offer_name: offerName,
          price_type: priceType,
          unit_price_est: unitPrice,
          fixed_fee_monthly_est: fixedFee,
          url_offer: urlOffer,
          valid_from: validFrom,
          valid_to: validTo,
          raw: Object.fromEntries(headers.map((h, idx) => [h, fields[idx] || null])),
          imported_at: new Date().toISOString(),
        });

        count++;
      } catch (e) {
        errors.push(`Row ${i}: ${e.message}`);
      }
    }

    // Batch upsert
    for (let i = 0; i < offers.length; i += batchSize) {
      const batch = offers.slice(i, i + batchSize);
      const { error } = await supabaseAdmin.from('offers').upsert(batch, { onConflict: 'source,source_offer_id' });
      if (error) {
        errors.push(`Batch upsert error: ${error.message}`);
      }
    }
  } catch (e) {
    errors.push(`${commodity} import error: ${e.message}`);
  }

  return { count, errors };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Create import run record
  const { data: run } = await supabaseAdmin.from('import_runs').insert({
    status: 'running',
    source: 'PORTALE_OFFERTE',
  }).select().single();

  const allErrors: string[] = [];
  let totalCount = 0;

  try {
    // Import electricity offers
    const elecResult = await importDataset(supabaseAdmin, ELECTRICITY_CSV_URL, 'electricity');
    totalCount += elecResult.count;
    allErrors.push(...elecResult.errors);

    // Import gas offers
    const gasResult = await importDataset(supabaseAdmin, GAS_CSV_URL, 'gas');
    totalCount += gasResult.count;
    allErrors.push(...gasResult.errors);

    // Update import run
    await supabaseAdmin.from('import_runs').update({
      finished_at: new Date().toISOString(),
      status: allErrors.length > 0 && totalCount === 0 ? 'failure' : 'success',
      errors: allErrors.length > 0 ? { errors: allErrors } : null,
    }).eq('id', run.id);

    return new Response(JSON.stringify({
      success: true,
      imported: totalCount,
      errors: allErrors,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    await supabaseAdmin.from('import_runs').update({
      finished_at: new Date().toISOString(),
      status: 'failure',
      errors: { errors: [e.message] },
    }).eq('id', run.id);

    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
