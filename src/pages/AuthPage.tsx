import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { t } from '@/i18n';
import { Zap } from 'lucide-react';

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';
const TURNSTILE_CONTAINER_ID = 'turnstile-container';
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;

/** Render Turnstile widget with retry (max 10 attempts, 300ms apart).
 *  Skips render if the textarea token is already present (widget already rendered). */
function renderTurnstile(attempt = 0) {
  // Guard: already rendered (token present or iframe already injected)
  const hasToken = !!document.querySelector('textarea[name="cf-turnstile-response"]');
  const hasIframe = !!document.querySelector('#turnstile-container iframe');
  if (hasToken || hasIframe) return;

  const container = document.getElementById(TURNSTILE_CONTAINER_ID);
  if (!container) return;

  const ts = (window as any).turnstile;
  if (ts && typeof ts.render === 'function') {
    container.innerHTML = '';
    ts.render('#' + TURNSTILE_CONTAINER_ID, { sitekey: SITE_KEY });
  } else if (attempt < 10) {
    setTimeout(() => renderTurnstile(attempt + 1), 300);
  }
}

const AuthPage = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [activeTab, setActiveTab] = useState('login');

  // Load script once
  useEffect(() => {
    if (!document.getElementById(TURNSTILE_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  // Render widget every time signup tab becomes active
  useEffect(() => {
    if (activeTab === 'signup') {
      renderTurnstile();
    }
  }, [activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
      toast({ title: t('auth.loginSuccess') });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = (document.querySelector('textarea[name="cf-turnstile-response"]') as HTMLTextAreaElement | null)?.value;
      if (!token) {
        toast({ title: t('common.error'), description: 'Completa il controllo anti-bot prima di procedere.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      const verifyRes = await fetch('/api/verify-turnstile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!verifyRes.ok) {
        toast({ title: t('common.error'), description: 'Verifica anti-bot fallita. Riprova.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      await signUp(signupEmail, signupPassword);
      toast({ title: t('auth.signupSuccess') });
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(forgotEmail);
      toast({ title: 'Email inviata', description: 'Controlla la tua casella email.' });
      setShowForgot(false);
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (showForgot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle>{t('auth.forgotPassword')}</CardTitle>
            <CardDescription>Inserisci la tua email per reimpostare la password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <Label htmlFor="forgot-email">{t('auth.email')}</Label>
                <Input id="forgot-email" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('common.loading') : t('auth.resetPassword')}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForgot(false)}>
                {t('common.cancel')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">{t('app.name')}</CardTitle>
          <CardDescription>{t('app.tagline')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
              <TabsTrigger value="signup">{t('auth.signup')}</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="login-email">{t('auth.email')}</Label>
                  <Input id="login-email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="login-password">{t('auth.password')}</Label>
                  <Input id="login-password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('common.loading') : t('auth.login')}
                </Button>
                <button type="button" className="text-sm text-muted-foreground hover:underline w-full text-center" onClick={() => setShowForgot(true)}>
                  {t('auth.forgotPassword')}
                </button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="signup-email">{t('auth.email')}</Label>
                  <Input id="signup-email" type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="signup-password">{t('auth.password')}</Label>
                  <Input id="signup-password" type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required minLength={6} />
                </div>
                <div id={TURNSTILE_CONTAINER_ID} className="cf-turnstile" data-sitekey={SITE_KEY}></div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('common.loading') : t('auth.signup')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
