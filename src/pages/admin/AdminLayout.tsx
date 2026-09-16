import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/admin', label: 'Visão geral', end: true },
  { to: '/admin/empresas', label: 'Empresas' },
  { to: '/admin/assinaturas', label: 'Assinaturas' },
  { to: '/admin/planos', label: 'Planos' },
  { to: '/admin/financeiro', label: 'Financeiro' },
  { to: '/admin/uso', label: 'Uso' },
  { to: '/admin/auditoria', label: 'Auditoria' },
];

export function AdminShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const location = useLocation();
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description ?? 'Painel administrativo da plataforma SolarFlow'}</p>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto">
        <nav className="flex min-w-max gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
          {tabs.map((t) => {
            const active = t.end ? location.pathname === t.to : location.pathname.startsWith(t.to);
            return (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={cn(
                  'rounded-lg px-3.5 py-1.5 text-sm transition-colors whitespace-nowrap',
                  active ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
