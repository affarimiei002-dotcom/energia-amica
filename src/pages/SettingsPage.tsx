import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { t } from '@/i18n';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifPrefs, setNotifPrefs] = useState<any>(null);
  const [consents, setConsents] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('notification_prefs').select('*').eq('user_id', user.id).single(),
      supabase.from('consents').select('*').eq('user_id', user.id).single(),
    ]).then(([notif, consent]) => {
      setNotifPrefs(notif.data);
      setConsents(consent.data);
      setLoading(false);
    });
  }, [user]);

  const saveNotifPrefs = async () => {
    if (!notifPrefs || !user) return;
    const { error } = await supabase.from('notification_prefs').upsert({ ...notifPrefs, user_id: user.id }, { onConflict: 'user_id' });
    if (error) toast({ title: t('common.error'), variant: 'destructive' });
    else toast({ title: t('settings.saved') });
  };

  const saveConsents = async () => {
    if (!consents || !user) return;
    const { error } = await supabase.from('consents').upsert({ ...consents, user_id: user.id }, { onConflict: 'user_id' });
    if (error) toast({ title: t('common.error'), variant: 'destructive' });
    else toast({ title: t('settings.saved') });
  };

  const deleteAccount = async () => {
    if (!user) return;
    // Delete all user data
    await Promise.all([
      supabase.from('user_supply').delete().eq('user_id', user.id),
      supabase.from('current_contract').delete().eq('user_id', user.id),
      supabase.from('notification_prefs').delete().eq('user_id', user.id),
      supabase.from('alerts').delete().eq('user_id', user.id),
      supabase.from('consents').delete().eq('user_id', user.id),
    ]);
    await signOut();
    toast({ title: t('settings.deleteSuccess') });
    navigate('/');
  };

  if (loading) return <AppLayout><p className="text-muted-foreground">{t('common.loading')}</p></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

        {/* Notification prefs */}
        <Card className="energy-card">
          <CardHeader><CardTitle>{t('settings.notifications')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {notifPrefs && (
              <>
                <div>
                  <Label>{t('onboarding.minSavings')}</Label>
                  <Input type="number" value={notifPrefs.min_savings_annual} onChange={e => setNotifPrefs({ ...notifPrefs, min_savings_annual: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>{t('onboarding.maxFrequency')}</Label>
                  <Input type="number" value={notifPrefs.max_better_offer_frequency_days} onChange={e => setNotifPrefs({ ...notifPrefs, max_better_offer_frequency_days: parseInt(e.target.value) || 7 })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t('onboarding.expiryReminders')}</Label>
                  <Switch checked={notifPrefs.enable_expiry_reminders} onCheckedChange={v => setNotifPrefs({ ...notifPrefs, enable_expiry_reminders: v })} />
                </div>
                <Button onClick={saveNotifPrefs}>{t('common.save')}</Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Consents */}
        <Card className="energy-card">
          <CardHeader><CardTitle>{t('settings.privacy')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {consents && (
              <>
                <div className="flex items-center justify-between">
                  <Label>{t('settings.affiliateConsent')}</Label>
                  <Switch checked={consents.affiliate_lead_consent} onCheckedChange={v => setConsents({ ...consents, affiliate_lead_consent: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t('settings.analyticsConsent')}</Label>
                  <Switch checked={consents.analytics_consent} onCheckedChange={v => setConsents({ ...consents, analytics_consent: v })} />
                </div>
                <Button onClick={saveConsents}>{t('common.save')}</Button>
              </>
            )}
            <Separator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><Trash2 className="h-4 w-4 mr-2" />{t('settings.deleteAccount')}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('settings.deleteAccount')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('settings.deleteConfirm')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAccount}>{t('common.confirm')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Edit profile link */}
        <Button variant="outline" onClick={() => navigate('/onboarding')}>Modifica profilo energia</Button>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
