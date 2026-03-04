import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { t } from '@/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/components/AppLayout';
import AdSpace from '@/components/AdSpace';
import { Zap, Flame, Calendar, TrendingDown, Bell, AlertCircle } from 'lucide-react';
import { CurrentContract, Offer, Alert as AlertType } from '@/lib/types';
import { differenceInDays, format } from 'date-fns';

const DashboardPage = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<CurrentContract[]>([]);
  const [topOffers, setTopOffers] = useState<Offer[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertType[]>([]);
  const [userSupply, setUserSupply] = useState<any[]>([]);
  const [bandDefaults, setBandDefaults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [contractsRes, supplyRes, bandsRes, alertsRes, offersRes] = await Promise.all([
        supabase.from('current_contract').select('*').eq('user_id', user.id),
        supabase.from('user_supply').select('*').eq('user_id', user.id),
        supabase.from('consumption_band_defaults').select('*'),
        supabase.from('alerts').select('*').eq('user_id', user.id).order('sent_at', { ascending: false }).limit(5),
        supabase.from('offers').select('*').not('unit_price_est', 'is', null).order('unit_price_est', { ascending: true }).limit(20),
      ]);
      setContracts((contractsRes.data as CurrentContract[]) || []);
      setUserSupply(supplyRes.data || []);
      setBandDefaults(bandsRes.data || []);
      setRecentAlerts((alertsRes.data as AlertType[]) || []);

      // Compute top 3 per commodity based on user consumption
      const offers = (offersRes.data || []) as Offer[];
      setTopOffers(offers.slice(0, 6));
      setLoading(false);
    };
    load();
  }, [user]);

  const getAnnualConsumption = (commodity: string) => {
    const supply = userSupply.find(s => s.commodity === commodity);
    if (!supply) return null;
    if (commodity === 'electricity' && supply.annual_kwh) return supply.annual_kwh;
    if (commodity === 'gas' && supply.annual_smc) return supply.annual_smc;
    if (supply.consumption_band) {
      const bd = bandDefaults.find((b: any) => b.commodity === commodity && b.band === supply.consumption_band);
      return bd?.annual_value || null;
    }
    return null;
  };

  const estimateAnnualCost = (contract: CurrentContract) => {
    if (!contract.unit_price) return null;
    const consumption = getAnnualConsumption(contract.commodity);
    if (!consumption) return null;
    return (consumption * contract.unit_price) + (contract.fixed_fee_monthly * 12);
  };

  const estimateOfferCost = (offer: Offer) => {
    if (!offer.unit_price_est) return null;
    const consumption = getAnnualConsumption(offer.commodity);
    if (!consumption) return null;
    return (consumption * offer.unit_price_est) + ((offer.fixed_fee_monthly_est || 0) * 12);
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center py-20 text-muted-foreground">{t('common.loading')}</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('dashboard.welcome')}</h1>

        {/* Contract cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {contracts.map(contract => {
            const daysLeft = differenceInDays(new Date(contract.expiry_date), new Date());
            const annualCost = estimateAnnualCost(contract);
            return (
              <Card key={contract.id} className="energy-card">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {contract.commodity === 'electricity' ? <Zap className="h-5 w-5 text-energy-amber" /> : <Flame className="h-5 w-5 text-energy-blue" />}
                    {t('dashboard.contractSummary')} - {contract.commodity === 'electricity' ? t('onboarding.electricity') : t('onboarding.gas')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {contract.supplier_name && <p className="text-sm"><span className="text-muted-foreground">Fornitore:</span> {contract.supplier_name}</p>}
                  {contract.offer_name && <p className="text-sm"><span className="text-muted-foreground">Offerta:</span> {contract.offer_name}</p>}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {daysLeft > 0 ? (
                        <>{t('dashboard.expiresIn')} <span className={`font-bold ${daysLeft <= 30 ? 'text-destructive' : ''}`}>{daysLeft} {t('dashboard.days')}</span></>
                      ) : (
                        <span className="font-bold text-destructive">{t('dashboard.expired')}</span>
                      )}
                    </span>
                  </div>
                  {annualCost ? (
                    <p className="text-sm">{t('dashboard.currentCost')}: <span className="energy-stat text-lg">{annualCost.toFixed(0)}€{t('dashboard.perYear')}</span></p>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('dashboard.missingPrice')}</p>
                  )}
                  <Badge variant={contract.price_type === 'fixed' ? 'default' : 'secondary'}>{contract.price_type === 'fixed' ? t('onboarding.fixed') : t('onboarding.variable')}</Badge>
                </CardContent>
              </Card>
            );
          })}
          {contracts.length === 0 && (
            <Card className="energy-card col-span-full"><CardContent className="py-8 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              Nessun contratto configurato. <a href="/onboarding" className="text-primary underline">Completa la configurazione</a>
            </CardContent></Card>
          )}
        </div>

        {/* Top offers */}
        <Card className="energy-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-primary" /> {t('dashboard.topOffers')}</CardTitle></CardHeader>
          <CardContent>
            {topOffers.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('dashboard.noOffers')}</p>
            ) : (
              <div className="space-y-3">
                {topOffers.slice(0, 6).map(offer => {
                  const offerCost = estimateOfferCost(offer);
                  const contract = contracts.find(c => c.commodity === offer.commodity);
                  const currentCost = contract ? estimateAnnualCost(contract) : null;
                  const savings = currentCost && offerCost ? currentCost - offerCost : null;
                  return (
                    <div key={offer.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        {offer.commodity === 'electricity' ? <Zap className="h-4 w-4 text-energy-amber" /> : <Flame className="h-4 w-4 text-energy-blue" />}
                        <div>
                          <p className="font-medium text-sm">{offer.supplier_name}</p>
                          <p className="text-xs text-muted-foreground">{offer.offer_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {offerCost ? (
                          <>
                            <p className="font-bold text-sm">{offerCost.toFixed(0)}€{t('dashboard.perYear')}</p>
                            {savings && savings > 0 && <p className="text-xs text-primary font-medium">-{savings.toFixed(0)}€{t('dashboard.perYear')}</p>}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t('dashboard.incompleteData')}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent alerts */}
        <Card className="energy-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> {t('dashboard.recentAlerts')}</CardTitle></CardHeader>
          <CardContent>
            {recentAlerts.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('dashboard.noAlerts')}</p>
            ) : (
              <div className="space-y-2">
                {recentAlerts.map(alert => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Bell className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(alert.sent_at), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <AdSpace />
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
