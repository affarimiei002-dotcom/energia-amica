import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Zap, LayoutDashboard, Tag, Bell, Settings, Shield, LogOut } from 'lucide-react';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <NavLink to="/dashboard" className="flex items-center gap-2 font-display font-bold text-lg">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              {t('app.name')}
            </NavLink>
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/dashboard" className={linkClass}><LayoutDashboard className="h-4 w-4" /> {t('nav.dashboard')}</NavLink>
              <NavLink to="/offers" className={linkClass}><Tag className="h-4 w-4" /> {t('nav.offers')}</NavLink>
              <NavLink to="/alerts" className={linkClass}><Bell className="h-4 w-4" /> {t('nav.alerts')}</NavLink>
              <NavLink to="/settings" className={linkClass}><Settings className="h-4 w-4" /> {t('nav.settings')}</NavLink>
              {isAdmin && <NavLink to="/admin" className={linkClass}><Shield className="h-4 w-4" /> {t('nav.admin')}</NavLink>}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">{t('nav.logout')}</span>
            </Button>
          </div>
        </div>
      </header>
      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 flex justify-around py-2 px-1">
        <NavLink to="/dashboard" className={({ isActive }) => `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
          <LayoutDashboard className="h-5 w-5" />
          <span>{t('nav.dashboard')}</span>
        </NavLink>
        <NavLink to="/offers" className={({ isActive }) => `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
          <Tag className="h-5 w-5" />
          <span>{t('nav.offers')}</span>
        </NavLink>
        <NavLink to="/alerts" className={({ isActive }) => `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
          <Bell className="h-5 w-5" />
          <span>{t('nav.alerts')}</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
          <Settings className="h-5 w-5" />
          <span>{t('nav.settings')}</span>
        </NavLink>
      </nav>
      <main className="container py-6 pb-20 md:pb-6">{children}</main>
    </div>
  );
};

export default AppLayout;
