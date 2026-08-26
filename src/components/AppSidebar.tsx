import {
  LayoutDashboard, Users, FileText, FileSignature, Clock, BarChart3,
  Settings, Plug, Sun, Moon, LogOut, ChevronLeft, MessageSquare, Palette,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import logoInforsol from '@/assets/logo-inforsol.png';

const mainItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, pageKey: 'dashboard' },
  { title: 'CRM / Clientes', url: '/crm', icon: Users, pageKey: 'crm' },
  { title: 'Propostas', url: '/propostas', icon: FileText, pageKey: 'propostas' },
  { title: 'Contratos', url: '/contratos', icon: FileSignature, pageKey: 'contratos' },
  { title: 'Etapas / Prazos', url: '/etapas', icon: Clock, pageKey: 'etapas' },
  { title: 'Financeiro', url: '/financeiro', icon: BarChart3, pageKey: 'financeiro' },
  { title: 'WhatsApp', url: '/whatsapp', icon: MessageSquare, pageKey: 'whatsapp' },
];

const secondaryItems = [
  { title: 'WhatsApp Gestão', url: '/whatsapp-admin', icon: MessageSquare },
  { title: 'Personalização da Proposta', url: '/personalizacao-proposta', icon: Palette },
  { title: 'Integrações', url: '/integracoes', icon: Plug },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { profile, signOut, user, isAdmin, hasPageAccess } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? '??';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Filter main items by permission
  const visibleMainItems = mainItems.filter(item => hasPageAccess(item.pageKey));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logoInforsol} alt="Inforsol" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold text-sidebar-foreground">
                Inforsol
              </span>
              <span className="text-[10px] text-sidebar-foreground/60">
                Propostas & Contratos
              </span>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground"
              onClick={toggleSidebar}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-wider">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <Separator className="bg-sidebar-border" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-wider">
                Sistema
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {secondaryItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <NavLink
                          to={item.url}
                          className="hover:bg-sidebar-accent/50"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {profile?.full_name || user?.email || 'Usuário'}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.email}</p>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={toggleTheme}
            >
              {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground/60 hover:text-destructive hover:bg-sidebar-accent"
              onClick={handleLogout}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
