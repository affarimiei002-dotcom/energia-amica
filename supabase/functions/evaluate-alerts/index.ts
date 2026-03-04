import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const isMockEmail = !RESEND_API_KEY;

  const results: any[] = [];

  try {
    // Get all users with contracts and notification prefs
    const { data: contracts } = await supabaseAdmin.from('current_contract').select('*');
    const { data: supplies } = await supabaseAdmin.from('user_supply').select('*');
    const { data: prefs } = await supabaseAdmin.from('notification_prefs').select('*');
    const { data: bandDefaults } = await supabaseAdmin.from('consumption_band_defaults').select('*');
    const { data: offers } = await supabaseAdmin.from('offers').select('*').not('unit_price_est', 'is', null);

    if (!contracts || !prefs) {
      return new Response(JSON.stringify({ success: true, results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Helper: get annual consumption
    const getConsumption = (userId: string, commodity: string): number | null => {
      const supply = supplies?.find((s: any) => s.user_id === userId && s.commodity === commodity);
      if (!supply) return null;
      if (commodity === 'electricity' && supply.annual_kwh) return supply.annual_kwh;
      if (commodity === 'gas' && supply.annual_smc) return supply.annual_smc;
      if (supply.consumption_band) {
        const bd = bandDefaults?.find((b: any) => b.commodity === commodity && b.band === supply.consumption_band);
        return bd?.annual_value || null;
      }
      return null;
    };

    for (const contract of contracts) {
      const userPrefs = prefs.find((p: any) => p.user_id === contract.user_id);
      if (!userPrefs) continue;

      // Get user email
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(contract.user_id);
      const userEmail = userData?.user?.email;
      if (!userEmail) continue;

      // 1. EXPIRY_REMINDER check
      if (userPrefs.enable_expiry_reminders) {
        const daysLeft = Math.ceil((new Date(contract.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const offsets = userPrefs.expiry_offsets_days || [30, 7, 1];

        for (const offset of offsets) {
          if (daysLeft === offset) {
            // Check if already sent for this offset
            const { data: existing } = await supabaseAdmin.from('alerts')
              .select('id')
              .eq('user_id', contract.user_id)
              .eq('alert_type', 'EXPIRY_REMINDER')
              .eq('commodity', contract.commodity)
              .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
              .limit(1);

            if (!existing?.length) {
              const commodityLabel = contract.commodity === 'electricity' ? 'Luce' : 'Gas';
              const message = `Il tuo contratto ${commodityLabel} con ${contract.supplier_name || 'il tuo fornitore'} scade tra ${daysLeft} giorni.`;

              await sendAlert(supabaseAdmin, {
                user_id: contract.user_id,
                alert_type: 'EXPIRY_REMINDER',
                commodity: contract.commodity,
                message,
                email: userEmail,
                isMockEmail,
                RESEND_API_KEY,
              });
              results.push({ type: 'EXPIRY_REMINDER', user_id: contract.user_id, commodity: contract.commodity, daysLeft });
            }
          }
        }
      }

      // 2. BETTER_OFFER check (only if user has unit_price)
      if (contract.unit_price) {
        const consumption = getConsumption(contract.user_id, contract.commodity);
        if (!consumption) continue;

        const currentCost = (consumption * contract.unit_price) + (contract.fixed_fee_monthly * 12);

        // Check cooldown
        const cooldownDays = userPrefs.max_better_offer_frequency_days || 7;
        const { data: recentAlert } = await supabaseAdmin.from('alerts')
          .select('id')
          .eq('user_id', contract.user_id)
          .eq('alert_type', 'BETTER_OFFER')
          .eq('commodity', contract.commodity)
          .gte('sent_at', new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (recentAlert?.length) continue;

        // Find best offer for this commodity
        const commodityOffers = offers?.filter((o: any) => o.commodity === contract.commodity && o.unit_price_est) || [];
        let bestOffer: any = null;
        let bestSavings = 0;

        for (const offer of commodityOffers) {
          const offerCost = (consumption * offer.unit_price_est) + ((offer.fixed_fee_monthly_est || 0) * 12);
          const savings = currentCost - offerCost;
          if (savings > bestSavings) {
            bestSavings = savings;
            bestOffer = offer;
          }
        }

        const minSavings = userPrefs.min_savings_annual || 80;
        if (bestOffer && bestSavings >= minSavings) {
          const commodityLabel = contract.commodity === 'electricity' ? 'Luce' : 'Gas';
          const message = `Abbiamo trovato un'offerta ${commodityLabel} migliore: ${bestOffer.supplier_name} - ${bestOffer.offer_name}. Risparmio stimato: ${bestSavings.toFixed(0)}€/anno.`;

          await sendAlert(supabaseAdmin, {
            user_id: contract.user_id,
            alert_type: 'BETTER_OFFER',
            commodity: contract.commodity,
            offer_id: bestOffer.id,
            savings_annual_est: bestSavings,
            message,
            email: userEmail,
            isMockEmail,
            RESEND_API_KEY,
          });
          results.push({ type: 'BETTER_OFFER', user_id: contract.user_id, commodity: contract.commodity, savings: bestSavings });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendAlert(supabaseAdmin: any, params: {
  user_id: string;
  alert_type: string;
  commodity: string;
  offer_id?: string;
  savings_annual_est?: number;
  message: string;
  email: string;
  isMockEmail: boolean;
  RESEND_API_KEY?: string;
}) {
  // Write alert to DB
  await supabaseAdmin.from('alerts').insert({
    user_id: params.user_id,
    alert_type: params.alert_type,
    commodity: params.commodity,
    offer_id: params.offer_id || null,
    savings_annual_est: params.savings_annual_est || null,
    message: params.message,
    sent_via: 'EMAIL',
  });

  // Send email
  if (params.isMockEmail) {
    console.log(`[MOCK EMAIL] To: ${params.email} | Subject: RisparmioLuce Alert | Body: ${params.message}`);
  } else {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'RisparmioLuce <noreply@risparmioluce.it>',
          to: [params.email],
          subject: params.alert_type === 'BETTER_OFFER' ? 'Nuova offerta migliore trovata!' : 'Promemoria scadenza contratto',
          text: params.message,
        }),
      });
    } catch (e) {
      console.error(`Email send error: ${e.message}`);
    }
  }
}
