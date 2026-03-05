import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { t } from '@/i18n';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ImportRun } from '@/lib/types';
import { Play, CheckCircle, XCircle, Loader2, Bell } from 'lucide-react';
import { format } from 'date-fns';

const AdminPage = () => {
    const { isAdmin } = useAuth();
    const { toast } = useToast();
    const [importRuns, setImportRuns] = useState<ImportRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [evaluating, setEvaluating] = useState(false);

    useEffect(() => {
          loadRuns();
    }, []);

    const loadRuns = async () => {
          const { data } = await supabase.from('import_runs').select('*').order('started_at', { ascending: false }).limit(20);
          setImportRuns((data as ImportRun[]) || []);
          setLoading(false);
    };

    const runImport = async () => {
          setImporting(true);
          try {
                  const { data, error } = await supabase.functions.invoke('import-offers');
                  if (error) throw error;
                  toast({ title: t('admin.importSuccess') });
                  await loadRuns();
          } catch (err: any) {
                  toast({ title: t('admin.importError'), description: err.message, variant: 'destructive' });
          } finally {
                  setImporting(false);
          }
    };

    const runEvaluateAlerts = async () => {
          setEvaluating(true);
          try {
                  const { data, error } = await supabase.functions.invoke('evaluate-alerts');
                  if (error) throw error;
                  toast({ title: 'Avvisi generati con successo' });
          } catch (err: any) {
                  toast({ title: 'Errore generazione avvisi', description: err.message, variant: 'destructive' });
          } finally {
                  setEvaluating(false);
          }
    };

    if (!isAdmin) return <AppLayout><p className="text-destructive">Accesso non autorizzato</p></AppLayout>;
  
    return (
          <AppLayout>
                <div className="space-y-6">
                        <div className="flex items-center justify-between">
                                  <h1 className="text-2xl font-bold">{t('admin.title')}</h1>
                  <div className="flex gap-2">
                              <Button onClick={runImport} disabled={importing}>
                                {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                                {importing ? t('admin.importRunning') : t('admin.runImport')}
                              </Button>
                              <Button onClick={runEvaluateAlerts} disabled={evaluating} variant="outline">
                                {evaluating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
{evaluating ? 'Generazione in corso...' : 'Genera avvisi ora'}
                              </Button>
                  </div>
                        </div>
                
                        <Card className="energy-card">
                                  <CardHeader><CardTitle>{t('admin.importRuns')}</CardTitle></CardHeader>
                                  <CardContent>
                                    {loading ? <p className="text-muted-foreground">{t('common.loading')}</p> : importRuns.length === 0 ? (
                                                <p className="text-muted-foreground">Nessuna importazione eseguita</p>
                                              ) : (
                                                <div className="space-y-3">
                                                  {importRuns.map(run => (
                              <div key={run.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                                  <div className="flex items-center gap-3">
                                                    {run.status === 'success' ? <CheckCircle className="h-5 w-5 text-primary" /> : run.status === 'running' ? <Loader2 className="h-5 w-5 animate-spin text-energy-amber" /> : <XCircle className="h-5 w-5 text-destructive" />}
                                                                        <div>
                                                                                                <p className="text-sm font-medium">{run.source}</p>
                                                                                                <p className="text-xs text-muted-foreground">{t('admin.startedAt')}: {format(new Date(run.started_at), 'dd/MM/yyyy HH:mm')}</p>
                                                                        </div>
                                                  </div>
                                                  <Badge variant={run.status === 'success' ? 'default' : 'destructive'}>{run.status === 'success' ? t('admin.success') : t('admin.failure')}</Badge>
                              </div>
                            ))}
                                                </div>
                                              )}
                                  </CardContent>
                        </Card>
                </div>
          </AppLayout>
        );
};

export default AdminPage;</AppLayout>
