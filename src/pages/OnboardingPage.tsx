import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { t } from '@/i18n';
import { OnboardingData, CommoditySelection, ConsumptionBand, PriceType } from '@/lib/types';
import { Zap, Flame, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

const defaultData: OnboardingData = {
  commoditySelection: 'both',
  cap: '',
  electricityConsumptionType: 'band',
  electricityBand: 'medium',
  gasConsumptionType: 'band',
  gasBand: 'medium',
  electricityContract: {
    price_type: 'variable',
    fixed_fee_monthly: 0,
    expiry_date: '',
  },
  gasContract: {
    price_type: 'variable',
    fixed_fee_monthly: 0,
    expiry_date: '',
  },
  min_savings_annual: 80,
  max_better_offer_frequency_days: 7,
  enable_expiry_reminders: true,
};

const OnboardingPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [saving, setSaving] = useState(false);

  const update = (partial: Partial<OnboardingData>) => setData(prev => ({ ...prev, ...partial }));

  const hasElectricity = data.commoditySelection === 'electricity' || data.commoditySelection === 'both';
  const hasGas = data.commoditySelection === 'gas' || data.commoditySelection === 'both';

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Save user_supply
      if (hasElectricity) {
        await supabase.from('user_supply').upsert({
          user_id: user.id,
          commodity: 'electricity',
          cap: data.cap,
          annual_kwh: data.electricityConsumptionType === 'exact' ? data.electricityKwh : null,
          consumption_band: data.electricityConsumptionType === 'band' ? data.electricityBand : null,
        }, { onConflict: 'user_id,commodity' });
      }
      if (hasGas) {
        await supabase.from('user_supply').upsert({
          user_id: user.id,
          commodity: 'gas',
          cap: data.cap,
          annual_smc: data.gasConsumptionType === 'exact' ? data.gasSmc : null,
          consumption_band: data.gasConsumptionType === 'band' ? data.gasBand : null,
        }, { onConflict: 'user_id,commodity' });
      }

      // Save current_contract
      if (hasElectricity && data.electricityContract?.expiry_date) {
        await supabase.from('current_contract').upsert({
          user_id: user.id,
          commodity: 'electricity',
          supplier_name: data.electricityContract.supplier_name || null,
          offer_name: data.electricityContract.offer_name || null,
          price_type: data.electricityContract.price_type,
          unit_price: data.electricityContract.unit_price || null,
          fixed_fee_monthly: data.electricityContract.fixed_fee_monthly || 0,
          expiry_date: data.electricityContract.expiry_date,
        }, { onConflict: 'user_id,commodity' });
      }
      if (hasGas && data.gasContract?.expiry_date) {
        await supabase.from('current_contract').upsert({
          user_id: user.id,
          commodity: 'gas',
          supplier_name: data.gasContract.supplier_name || null,
          offer_name: data.gasContract.offer_name || null,
          price_type: data.gasContract.price_type,
          unit_price: data.gasContract.unit_price || null,
          fixed_fee_monthly: data.gasContract.fixed_fee_monthly || 0,
          expiry_date: data.gasContract.expiry_date,
        }, { onConflict: 'user_id,commodity' });
      }

      // Save notification_prefs
      await supabase.from('notification_prefs').upsert({
        user_id: user.id,
        min_savings_annual: data.min_savings_annual,
        max_better_offer_frequency_days: data.max_better_offer_frequency_days,
        enable_expiry_reminders: data.enable_expiry_reminders,
      }, { onConflict: 'user_id' });

      // Save consents (defaults)
      await supabase.from('consents').upsert({
        user_id: user.id,
        affiliate_lead_consent: false,
        analytics_consent: false,
      }, { onConflict: 'user_id' });

      toast({ title: t('onboarding.completed') });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const ContractForm = ({ commodity, contract, onChange }: {
    commodity: 'electricity' | 'gas';
    contract: OnboardingData['electricityContract'];
    onChange: (c: OnboardingData['electricityContract']) => void;
  }) => (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        {commodity === 'electricity' ? <Zap className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
        {commodity === 'electricity' ? t('onboarding.electricity') : t('onboarding.gas')}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t('onboarding.supplierName')}</Label>
          <Input value={contract?.supplier_name || ''} onChange={e => onChange({ ...contract!, supplier_name: e.target.value })} />
        </div>
        <div>
          <Label>{t('onboarding.offerName')}</Label>
          <Input value={contract?.offer_name || ''} onChange={e => onChange({ ...contract!, offer_name: e.target.value })} />
        </div>
      </div>
      <div>
        <Label>{t('onboarding.priceType')}</Label>
        <RadioGroup value={contract?.price_type || 'variable'} onValueChange={v => onChange({ ...contract!, price_type: v as PriceType })} className="flex gap-4 mt-1">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="fixed" id={`${commodity}-fixed`} />
            <Label htmlFor={`${commodity}-fixed`}>{t('onboarding.fixed')}</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="variable" id={`${commodity}-variable`} />
            <Label htmlFor={`${commodity}-variable`}>{t('onboarding.variable')}</Label>
          </div>
        </RadioGroup>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t('onboarding.unitPrice')} ({commodity === 'electricity' ? t('onboarding.unitPriceElectricity') : t('onboarding.unitPriceGas')})</Label>
          <Input type="number" step="0.0001" min="0" value={contract?.unit_price || ''} onChange={e => onChange({ ...contract!, unit_price: e.target.value ? parseFloat(e.target.value) : undefined })} />
        </div>
        <div>
          <Label>{t('onboarding.fixedFeeMonthly')}</Label>
          <Input type="number" step="0.01" min="0" value={contract?.fixed_fee_monthly || 0} onChange={e => onChange({ ...contract!, fixed_fee_monthly: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>
      <div>
        <Label>{t('onboarding.expiryDate')} *</Label>
        <Input type="date" value={contract?.expiry_date || ''} onChange={e => onChange({ ...contract!, expiry_date: e.target.value })} required />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl">{t('onboarding.title')}</CardTitle>
          <CardDescription>{t('onboarding.subtitle')}</CardDescription>
          <div className="flex gap-1 mt-4">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">{t('onboarding.commodity')}</Label>
              <RadioGroup value={data.commoditySelection} onValueChange={v => update({ commoditySelection: v as CommoditySelection })} className="grid grid-cols-3 gap-4">
                {(['electricity', 'gas', 'both'] as const).map(c => (
                  <Label key={c} htmlFor={`commodity-${c}`} className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${data.commoditySelection === c ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                    <RadioGroupItem value={c} id={`commodity-${c}`} className="sr-only" />
                    {c === 'electricity' ? <Zap className="h-8 w-8 text-energy-amber" /> : c === 'gas' ? <Flame className="h-8 w-8 text-energy-blue" /> : <div className="flex"><Zap className="h-8 w-8 text-energy-amber" /><Flame className="h-8 w-8 text-energy-blue" /></div>}
                    <span className="font-medium">{c === 'electricity' ? t('onboarding.electricity') : c === 'gas' ? t('onboarding.gas') : t('onboarding.both')}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <Label>{t('onboarding.cap')} *</Label>
                <Input value={data.cap} onChange={e => update({ cap: e.target.value })} placeholder={t('onboarding.capPlaceholder')} maxLength={5} required />
              </div>
              {hasElectricity && (
                <div className="space-y-3">
                  <Label className="font-semibold flex items-center gap-2"><Zap className="h-4 w-4" /> {t('onboarding.consumption')} - {t('onboarding.electricity')}</Label>
                  <RadioGroup value={data.electricityConsumptionType} onValueChange={v => update({ electricityConsumptionType: v as 'band' | 'exact' })} className="flex gap-4">
                    <div className="flex items-center gap-2"><RadioGroupItem value="band" id="e-band" /><Label htmlFor="e-band">{t('onboarding.consumptionBand')}</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="exact" id="e-exact" /><Label htmlFor="e-exact">{t('onboarding.consumptionExact')}</Label></div>
                  </RadioGroup>
                  {data.electricityConsumptionType === 'band' ? (
                    <RadioGroup value={data.electricityBand || 'medium'} onValueChange={v => update({ electricityBand: v as ConsumptionBand })} className="flex gap-4">
                      {(['low', 'medium', 'high'] as const).map(b => (
                        <div key={b} className="flex items-center gap-2"><RadioGroupItem value={b} id={`eb-${b}`} /><Label htmlFor={`eb-${b}`}>{b === 'low' ? t('onboarding.bandLow') : b === 'medium' ? t('onboarding.bandMedium') : t('onboarding.bandHigh')}</Label></div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <Input type="number" min="0" placeholder={t('onboarding.kwhYear')} value={data.electricityKwh || ''} onChange={e => update({ electricityKwh: parseFloat(e.target.value) || undefined })} />
                  )}
                </div>
              )}
              {hasGas && (
                <div className="space-y-3">
                  <Label className="font-semibold flex items-center gap-2"><Flame className="h-4 w-4" /> {t('onboarding.consumption')} - {t('onboarding.gas')}</Label>
                  <RadioGroup value={data.gasConsumptionType} onValueChange={v => update({ gasConsumptionType: v as 'band' | 'exact' })} className="flex gap-4">
                    <div className="flex items-center gap-2"><RadioGroupItem value="band" id="g-band" /><Label htmlFor="g-band">{t('onboarding.consumptionBand')}</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="exact" id="g-exact" /><Label htmlFor="g-exact">{t('onboarding.consumptionExact')}</Label></div>
                  </RadioGroup>
                  {data.gasConsumptionType === 'band' ? (
                    <RadioGroup value={data.gasBand || 'medium'} onValueChange={v => update({ gasBand: v as ConsumptionBand })} className="flex gap-4">
                      {(['low', 'medium', 'high'] as const).map(b => (
                        <div key={b} className="flex items-center gap-2"><RadioGroupItem value={b} id={`gb-${b}`} /><Label htmlFor={`gb-${b}`}>{b === 'low' ? t('onboarding.bandLow') : b === 'medium' ? t('onboarding.bandMedium') : t('onboarding.bandHigh')}</Label></div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <Input type="number" min="0" placeholder={t('onboarding.smcYear')} value={data.gasSmc || ''} onChange={e => update({ gasSmc: parseFloat(e.target.value) || undefined })} />
                  )}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              {hasElectricity && (
                <ContractForm commodity="electricity" contract={data.electricityContract} onChange={c => update({ electricityContract: c })} />
              )}
              {hasGas && (
                <ContractForm commodity="gas" contract={data.gasContract} onChange={c => update({ gasContract: c })} />
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <Label>{t('onboarding.minSavings')}</Label>
                <Input type="number" min="0" value={data.min_savings_annual} onChange={e => update({ min_savings_annual: parseFloat(e.target.value) || 80 })} />
              </div>
              <div>
                <Label>{t('onboarding.maxFrequency')}</Label>
                <Input type="number" min="1" value={data.max_better_offer_frequency_days} onChange={e => update({ max_better_offer_frequency_days: parseInt(e.target.value) || 7 })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t('onboarding.expiryReminders')}</Label>
                <Switch checked={data.enable_expiry_reminders} onCheckedChange={v => update({ enable_expiry_reminders: v })} />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(s => s - 1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> {t('onboarding.back')}
              </Button>
            ) : <div />}
            {step < 4 ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={step === 2 && !data.cap}>
                {t('onboarding.next')} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={saving}>
                <CheckCircle className="h-4 w-4 mr-1" /> {saving ? t('common.loading') : t('onboarding.complete')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingPage;
