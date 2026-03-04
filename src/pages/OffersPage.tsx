import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { t } from '@/i18n';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Offer } from '@/lib/types';
import { Zap, Flame, ExternalLink } from 'lucide-react';

const OffersPage = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [commodityFilter, setCommodityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      let query = supabase.from('offers').select('*').order('unit_price_est', { ascending: true });
      if (commodityFilter !== 'all') query = query.eq('commodity', commodityFilter);
      const { data } = await query.limit(50);
      setOffers((data as Offer[]) || []);
      setLoading(false);
    };
    load();
  }, [commodityFilter]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('offers.title')}</h1>
          <Select value={commodityFilter} onValueChange={setCommodityFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('offers.all')}</SelectItem>
              <SelectItem value="electricity">{t('onboarding.electricity')}</SelectItem>
              <SelectItem value="gas">{t('onboarding.gas')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="text-muted-foreground">{t('common.loading')}</p>
        ) : offers.length === 0 ? (
          <Card className="energy-card"><CardContent className="py-8 text-center text-muted-foreground">{t('dashboard.noOffers')}</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {offers.map(offer => (
              <Card key={offer.id} className="energy-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {offer.commodity === 'electricity' ? <Zap className="h-5 w-5 text-energy-amber" /> : <Flame className="h-5 w-5 text-energy-blue" />}
                      <div>
                        <p className="font-semibold">{offer.supplier_name}</p>
                        <p className="text-sm text-muted-foreground">{offer.offer_name}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        {offer.unit_price_est ? (
                          <p className="font-bold">{offer.unit_price_est.toFixed(4)} {offer.commodity === 'electricity' ? '€/kWh' : '€/Smc'}</p>
                        ) : (
                          <Badge variant="outline">{t('dashboard.incompleteData')}</Badge>
                        )}
                        {offer.fixed_fee_monthly_est != null && <p className="text-xs text-muted-foreground">{offer.fixed_fee_monthly_est.toFixed(2)} €/mese</p>}
                      </div>
                      {offer.price_type && <Badge variant={offer.price_type === 'fixed' ? 'default' : 'secondary'}>{offer.price_type === 'fixed' ? t('onboarding.fixed') : t('onboarding.variable')}</Badge>}
                      {offer.url_offer && (
                        <a href={offer.url_offer} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80"><ExternalLink className="h-4 w-4" /></a>
                      )}
                    </div>
                  </div>
                  {offer.valid_to && <p className="text-xs text-muted-foreground mt-2">{t('offers.validUntil')}: {new Date(offer.valid_to).toLocaleDateString('it-IT')}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default OffersPage;
