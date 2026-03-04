import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { t } from '@/i18n';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert as AlertType } from '@/lib/types';
import { Bell, TrendingDown, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const AlertsPage = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('alerts').select('*').eq('user_id', user.id).order('sent_at', { ascending: false }).then(({ data }) => {
      setAlerts((data as AlertType[]) || []);
      setLoading(false);
    });
  }, [user]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('alerts.title')}</h1>
        {loading ? (
          <p className="text-muted-foreground">{t('common.loading')}</p>
        ) : alerts.length === 0 ? (
          <Card className="energy-card"><CardContent className="py-8 text-center text-muted-foreground">{t('alerts.noAlerts')}</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <Card key={alert.id} className="energy-card">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {alert.alert_type === 'BETTER_OFFER' ? <TrendingDown className="h-5 w-5 text-primary mt-0.5" /> : <Calendar className="h-5 w-5 text-energy-amber mt-0.5" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={alert.alert_type === 'BETTER_OFFER' ? 'default' : 'secondary'}>
                          {alert.alert_type === 'BETTER_OFFER' ? t('alerts.betterOffer') : t('alerts.expiryReminder')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{format(new Date(alert.sent_at), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                      <p className="text-sm">{alert.message}</p>
                      {alert.savings_annual_est && <p className="text-sm text-primary font-medium mt-1">{t('alerts.savings')}: {alert.savings_annual_est.toFixed(0)}€/anno</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AlertsPage;
