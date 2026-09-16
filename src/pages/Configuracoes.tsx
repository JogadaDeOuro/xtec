import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, FileText, Calculator, Users, Save, UserPlus, Loader2, Shield, ShieldCheck, Trash2, Pencil, CheckCircle, XCircle, Upload } from 'lucide-react';
import { useAuth, ALL_PAGES, type PageKey } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchProposalSettings, saveProposalSettings, uploadBrandingFile } from '@/lib/proposal-settings';
import { DEFAULT_PROPOSAL_CONFIG, type CompanyConfig, type ProposalDocConfig } from '@/lib/proposal-config';
import { formatCpfCnpj } from '@/lib/utils';

const PAGE_LABELS: Record<PageKey, string> = {
  dashboard: 'Dashboard',
  crm: 'CRM / Clientes',
  propostas: 'Propostas',
  contratos: 'Contratos',
  etapas: 'Etapas / Prazos',
  financeiro: 'Financeiro',
  whatsapp: 'WhatsApp',
};

interface UserWithRole {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  email?: string;
  roles: string[];
  permissions: string[];
}

export default function Configuracoes() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('vendedor');
  const [invitePermissions, setInvitePermissions] = useState<string[]>([...ALL_PAGES]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('vendedor');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [company, setCompany] = useState<CompanyConfig>(DEFAULT_PROPOSAL_CONFIG.company);
  const [proposalConfig, setProposalConfig] = useState<ProposalDocConfig>(DEFAULT_PROPOSAL_CONFIG);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingProposal, setSavingProposal] = useState(false);
  const [savingCalculations, setSavingCalculations] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const companyLogoRef = useRef<HTMLInputElement>(null);
  const proposalLogoRef = useRef<HTMLInputElement>(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: roles } = await supabase.from('user_roles').select('*');
    const { data: perms } = await supabase.from('user_page_permissions').select('*');

    if (profiles) {
      const usersWithRoles: UserWithRole[] = profiles.map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        phone: p.phone,
        roles: roles?.filter((r: any) => r.user_id === p.id).map((r: any) => r.role) ?? [],
        permissions: perms?.filter((pm: any) => pm.user_id === p.id).map((pm: any) => pm.page_key) ?? [],
      }));
      setUsers(usersWithRoles);
    }
    setLoadingUsers(false);
  };

  useEffect(() => {
    fetchUsers();
    fetchProposalSettings()
      .then(config => {
        setProposalConfig(config);
        setCompany(config.company);
      })
      .catch(() => toast.error('Não foi possível carregar os dados da empresa'))
      .finally(() => setLoadingCompany(false));
  }, []);

  const updateCompany = (field: keyof CompanyConfig, value: string) => {
    setCompany(current => ({ ...current, [field]: value }));
  };

  const handleSaveCompany = async () => {
    if (!isAdmin) {
      toast.error('Somente administradores podem salvar os dados da empresa');
      return;
    }
    const cnpjDigits = company.cnpj.replace(/\D/g, '');
    if (cnpjDigits.length > 0 && cnpjDigits.length !== 14) {
      toast.error('Informe um CNPJ completo');
      return;
    }
    setSavingCompany(true);
    try {
      const current = await fetchProposalSettings();
      const updated = { ...current, company };
      await saveProposalSettings(updated);
      const saved = await fetchProposalSettings();
      setProposalConfig(saved);
      setCompany(saved.company);
      toast.success('Dados da empresa salvos');
    } catch {
      toast.error('Não foi possível salvar os dados da empresa');
    } finally {
      setSavingCompany(false);
    }
  };

  const patchConfig = <K extends keyof ProposalDocConfig>(key: K, value: Partial<ProposalDocConfig[K]>) => {
    setProposalConfig(current => ({
      ...current,
      [key]: { ...(current[key] as object), ...value } as ProposalDocConfig[K],
    }));
  };

  const persistConfig = async (kind: 'proposal' | 'calculations') => {
    if (!isAdmin) {
      toast.error('Somente administradores podem salvar estas configurações');
      return;
    }
    const setSaving = kind === 'proposal' ? setSavingProposal : setSavingCalculations;
    setSaving(true);
    try {
      await saveProposalSettings({ ...proposalConfig, company });
      const saved = await fetchProposalSettings();
      setProposalConfig(saved);
      setCompany(saved.company);
      toast.success(kind === 'proposal' ? 'Personalização salva' : 'Parâmetros de cálculo salvos');
    } catch {
      toast.error('Não foi possível salvar as configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File | undefined, target: 'company' | 'proposal') => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2 MB');
      return;
    }
    setUploadingLogo(true);
    try {
      const url = await uploadBrandingFile(file, 'branding', 'logo');
      const current = await fetchProposalSettings();
      const updated = { ...current, company, branding: { ...current.branding, logoPrincipal: url } };
      await saveProposalSettings(updated);
      setProposalConfig(updated);
      toast.success(target === 'company' ? 'Logo da empresa enviada e salva' : 'Logo da proposta enviada e salva');
    } catch {
      toast.error('Não foi possível enviar a logo');
    } finally {
      setUploadingLogo(false);
      if (companyLogoRef.current) companyLogoRef.current.value = '';
      if (proposalLogoRef.current) proposalLogoRef.current.value = '';
    }
  };

  const savePermissions = async (userId: string, pages: string[]) => {
    const { error: deleteError } = await supabase.from('user_page_permissions').delete().eq('user_id', userId);
    if (deleteError) throw deleteError;
    if (pages.length > 0) {
      const rows = pages.map(page_key => ({ user_id: userId, page_key }));
      const { error: insertError } = await supabase.from('user_page_permissions').insert(rows as any);
      if (insertError) throw insertError;
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const { data, error } = await supabase.auth.signUp({
      email: inviteEmail,
      password: tempPassword,
      options: { data: { full_name: inviteName } },
    });
    if (error) {
      toast.error(error.message);
      setInviteLoading(false);
      return;
    }
    if (data.user) {
      if (inviteRole) {
        await supabase.from('user_roles').insert({ user_id: data.user.id, role: inviteRole as any });
      }
      // Save page permissions (only for non-admin)
      if (inviteRole !== 'admin') {
        await savePermissions(data.user.id, invitePermissions);
      }
    }
    toast.success('Usuário convidado!');
    setInviteOpen(false);
    setInviteEmail('');
    setInviteName('');
    setInvitePermissions([...ALL_PAGES]);
    setInviteLoading(false);
    fetchUsers();
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === user?.id && user.email === 'stfxfp@gmail.com' && newRole !== 'admin') {
      throw new Error('O administrador principal não pode perder o acesso de administrador');
    }
    const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', userId);
    if (deleteError) throw deleteError;
    const { error: insertError } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole as any });
    if (insertError) throw insertError;
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.id || (user.email === 'stfxfp@gmail.com' && userId === user.id)) {
      toast.error('Você não pode remover o próprio acesso');
      return;
    }
    try {
      await savePermissions(userId, []);
      const { error: roleError } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (roleError) throw roleError;
      const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
      if (profileError) throw profileError;
      toast.success('Usuário removido');
      await fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover o usuário');
    }
  };

  const handleAcceptUser = async (userId: string) => {
    try {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: 'vendedor' as any });
      if (error) throw error;
      await savePermissions(userId, [...ALL_PAGES]);
      toast.success('Usuário aprovado como Vendedor');
      await fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível aprovar o usuário');
    }
  };

  const handleRejectUser = async (userId: string) => {
    await supabase.from('profiles').delete().eq('id', userId);
    toast.success('Solicitação recusada');
    fetchUsers();
  };

  const handleEditUser = async () => {
    if (!editUser) return;
    try {
      if (editName && editName !== editUser.full_name) {
        const { error } = await supabase.from('profiles').update({ full_name: editName }).eq('id', editUser.id);
        if (error) throw error;
      }
      if (editRole !== (editUser.roles[0] || 'vendedor')) await handleRoleChange(editUser.id, editRole);
      if (editRole !== 'admin') await savePermissions(editUser.id, editPermissions);
      toast.success('Usuário atualizado');
      setEditUser(null);
      await fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o usuário');
    }
  };

  const openEditDialog = (u: UserWithRole) => {
    setEditUser(u);
    setEditName(u.full_name || '');
    setEditRole(u.roles[0] || 'vendedor');
    setEditPermissions(u.permissions);
  };

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const togglePermission = (pages: string[], setPages: (p: string[]) => void, page: string) => {
    if (pages.includes(page)) {
      setPages(pages.filter(p => p !== page));
    } else {
      setPages([...pages, page]);
    }
  };

  const pendingUsers = users.filter(u => u.roles.length === 0);
  const activeUsers = users.filter(u => u.roles.length > 0);

  const PermissionCheckboxes = ({ permissions, setPermissions, disabled }: { permissions: string[]; setPermissions: (p: string[]) => void; disabled?: boolean }) => (
    <div>
      <Label className="text-xs font-semibold">Páginas Permitidas</Label>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {ALL_PAGES.map(page => (
          <label key={page} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={permissions.includes(page)}
              onCheckedChange={() => togglePermission(permissions, setPermissions, page)}
              disabled={disabled}
            />
            {PAGE_LABELS[page]}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      <Tabs defaultValue="empresa" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="empresa" className="text-xs gap-1"><Building2 className="h-3 w-3" /> Empresa</TabsTrigger>
          <TabsTrigger value="proposta" className="text-xs gap-1"><FileText className="h-3 w-3" /> Proposta</TabsTrigger>
          <TabsTrigger value="calculos" className="text-xs gap-1"><Calculator className="h-3 w-3" /> Cálculos</TabsTrigger>
          <TabsTrigger value="usuarios" className="text-xs gap-1"><Users className="h-3 w-3" /> Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados da Empresa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-xs">Razão Social</Label><Input value={company.razaoSocial} onChange={e => updateCompany('razaoSocial', e.target.value)} disabled={loadingCompany} className="mt-1" /></div>
                <div><Label className="text-xs">CNPJ</Label><Input type="text" inputMode="numeric" value={company.cnpj} onChange={e => updateCompany('cnpj', formatCpfCnpj(e.target.value))} disabled={loadingCompany} maxLength={18} className="mt-1" placeholder="00.000.000/0000-00" /></div>
                <div><Label className="text-xs">Telefone</Label><Input value={company.telefone} onChange={e => updateCompany('telefone', e.target.value)} disabled={loadingCompany} className="mt-1" /></div>
                <div><Label className="text-xs">E-mail</Label><Input type="email" value={company.email} onChange={e => updateCompany('email', e.target.value)} disabled={loadingCompany} className="mt-1" /></div>
                <div className="sm:col-span-2"><Label className="text-xs">Endereço</Label><Input value={company.endereco} onChange={e => updateCompany('endereco', e.target.value)} disabled={loadingCompany} className="mt-1" /></div>
              </div>
              <Separator />
              <div>
                <Label className="text-xs">Logo da Empresa</Label>
                <div className="mt-2 border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  {proposalConfig.branding.logoPrincipal && <img src={proposalConfig.branding.logoPrincipal} alt="Logo da empresa" className="mx-auto mb-3 h-16 max-w-full object-contain" />}
                  <Button type="button" variant="outline" size="sm" onClick={() => companyLogoRef.current?.click()} disabled={uploadingLogo} className="gap-2">
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Escolher logo
                  </Button>
                  <p className="text-xs mt-1">PNG, JPG ou SVG (máx. 2MB)</p>
                  <input ref={companyLogoRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={e => handleLogoUpload(e.target.files?.[0], 'company')} />
                </div>
              </div>
              <Button className="gap-2" onClick={handleSaveCompany} disabled={loadingCompany || savingCompany || !isAdmin}>
                {savingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposta">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Personalização da Proposta (PDF)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Logo da Proposta</Label>
                  <div className="mt-2 border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
                    {proposalConfig.branding.logoPrincipal && <img src={proposalConfig.branding.logoPrincipal} alt="Logo da proposta" className="mx-auto mb-3 h-16 max-w-full object-contain" />}
                    <Button type="button" variant="outline" size="sm" onClick={() => proposalLogoRef.current?.click()} disabled={uploadingLogo} className="gap-2">
                      {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Escolher logo
                    </Button>
                    <p className="text-xs mt-1">PNG ou JPG (máx. 2MB)</p>
                    <input ref={proposalLogoRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={e => handleLogoUpload(e.target.files?.[0], 'proposal')} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Título / Cabeçalho da Proposta</Label>
                  <Input className="mt-1" value={proposalConfig.cover.titulo} onChange={e => patchConfig('cover', { titulo: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Texto de Apresentação da Empresa</Label>
                  <Textarea className="mt-1 min-h-[100px]" value={proposalConfig.texts.apresentacao} onChange={e => patchConfig('texts', { apresentacao: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Observações Técnicas Padrão</Label>
                  <Textarea className="mt-1 min-h-[80px]" value={proposalConfig.texts.observacoes} onChange={e => patchConfig('texts', { observacoes: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Itens Inclusos no Sistema</Label>
                  <Textarea className="mt-1 min-h-[80px]" value={proposalConfig.texts.escopoPadrao} onChange={e => patchConfig('texts', { escopoPadrao: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Garantias</Label>
                  <Textarea className="mt-1 min-h-[80px]" value={proposalConfig.texts.garantias} onChange={e => patchConfig('texts', { garantias: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Rodapé / Assinatura</Label>
                  <Textarea className="mt-1 min-h-[60px]" value={proposalConfig.texts.rodape} onChange={e => patchConfig('texts', { rodape: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Validade da Proposta (dias)</Label>
                  <Input type="text" inputMode="numeric" className="mt-1 w-32" value={String(proposalConfig.assumptions.validadeDias)} onChange={e => patchConfig('assumptions', { validadeDias: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
                </div>
                <Button className="gap-2" onClick={() => persistConfig('proposal')} disabled={savingProposal || loadingCompany || !isAdmin}>
                  {savingProposal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar Personalização
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calculos">
          <Card>
            <CardHeader><CardTitle className="text-base">Parâmetros de Cálculo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-xs">Reajuste anual da energia (%)</Label><Input type="text" inputMode="decimal" value={String(proposalConfig.assumptions.reajusteTarifarioPct)} onChange={e => patchConfig('assumptions', { reajusteTarifarioPct: Number(e.target.value.replace(',', '.')) || 0 })} className="mt-1" /></div>
                <div><Label className="text-xs">Produção por kWp (kWh/mês)</Label><Input type="text" inputMode="decimal" value={String(proposalConfig.assumptions.produtividadeKwhKwpMes)} onChange={e => patchConfig('assumptions', { produtividadeKwhKwpMes: Number(e.target.value.replace(',', '.')) || 0 })} className="mt-1" /></div>
                <div><Label className="text-xs">Tarifa média (R$/kWh)</Label><Input type="text" inputMode="decimal" value={String(proposalConfig.assumptions.tarifaKwh)} onChange={e => patchConfig('assumptions', { tarifaKwh: Number(e.target.value.replace(',', '.')) || 0 })} className="mt-1" /></div>
                <div><Label className="text-xs">Degradação anual dos módulos (%)</Label><Input type="text" inputMode="decimal" value={String(proposalConfig.assumptions.degradacaoAnualPct)} onChange={e => patchConfig('assumptions', { degradacaoAnualPct: Number(e.target.value.replace(',', '.')) || 0 })} className="mt-1" /></div>
                <div><Label className="text-xs">Preço base On-Grid (R$/kWp)</Label><Input type="text" inputMode="decimal" value={String(proposalConfig.pricing.onGridInicial)} onChange={e => patchConfig('pricing', { onGridInicial: Number(e.target.value.replace(',', '.')) || 0 })} className="mt-1" /></div>
                <div><Label className="text-xs">Preço base Off-Grid (R$/kWp)</Label><Input type="text" inputMode="decimal" value={String(proposalConfig.pricing.offGridInicial)} onChange={e => patchConfig('pricing', { offGridInicial: Number(e.target.value.replace(',', '.')) || 0 })} className="mt-1" /></div>
                <div><Label className="text-xs">Preço base Híbrido (R$/kWp)</Label><Input type="text" inputMode="decimal" value={String(proposalConfig.pricing.hibridoInicial)} onChange={e => patchConfig('pricing', { hibridoInicial: Number(e.target.value.replace(',', '.')) || 0 })} className="mt-1" /></div>
              </div>
              <Button className="gap-2" onClick={() => persistConfig('calculations')} disabled={savingCalculations || loadingCompany || !isAdmin}>
                {savingCalculations ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios">
          <div className="space-y-4">
            {/* Pending users */}
            {isAdmin && pendingUsers.length > 0 && (
              <Card className="border-warning/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">{pendingUsers.length}</Badge>
                    Solicitações Pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-warning/20 bg-warning/5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-warning/10 text-warning text-xs font-bold">{getInitials(u.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{u.full_name || 'Sem nome'}</p>
                          <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning">Pendente</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="gap-1 text-xs text-success border-success/30 hover:bg-success/10" onClick={() => handleAcceptUser(u.id)}>
                          <CheckCircle className="h-3.5 w-3.5" /> Aceitar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                              <XCircle className="h-3.5 w-3.5" /> Recusar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Recusar solicitação?</AlertDialogTitle>
                              <AlertDialogDescription>O perfil de "{u.full_name}" será removido permanentemente.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRejectUser(u.id)} className="bg-destructive text-destructive-foreground">Recusar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Active users */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Usuários Ativos</CardTitle>
                  {isAdmin && (
                    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-1.5 text-xs"><UserPlus className="h-3.5 w-3.5" /> Convidar</Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Convidar Usuário</DialogTitle></DialogHeader>
                        <form onSubmit={handleInvite} className="space-y-4">
                          <div><Label className="text-xs">Nome completo</Label><Input className="mt-1" value={inviteName} onChange={e => setInviteName(e.target.value)} required /></div>
                          <div><Label className="text-xs">E-mail</Label><Input type="email" className="mt-1" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required /></div>
                          <div>
                            <Label className="text-xs">Papel</Label>
                            <Select value={inviteRole} onValueChange={v => { setInviteRole(v); if (v === 'admin') setInvitePermissions([...ALL_PAGES]); }}>
                              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="vendedor">Vendedor</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {inviteRole !== 'admin' && (
                            <>
                              <Separator />
                              <PermissionCheckboxes permissions={invitePermissions} setPermissions={setInvitePermissions} />
                            </>
                          )}
                          <Button type="submit" className="w-full" disabled={inviteLoading}>
                            {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Enviar Convite
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingUsers ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : activeUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário ativo</p>
                ) : (
                  activeUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{getInitials(u.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{u.full_name || 'Sem nome'}</p>
                            {u.id === user?.id && <Badge variant="outline" className="text-[10px] h-4">Você</Badge>}
                          </div>
                          <div className="flex gap-1 mt-0.5 flex-wrap">
                            {u.permissions.length > 0 && !u.roles.includes('admin') ? (
                              u.permissions.map(p => (
                                <Badge key={p} variant="outline" className="text-[8px] h-4 px-1">{PAGE_LABELS[p as PageKey] || p}</Badge>
                              ))
                            ) : u.roles.includes('admin') ? (
                              <span className="text-[10px] text-muted-foreground">Acesso total</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Sem permissões</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {u.roles.includes('admin') ? (
                          <Badge className="gap-1 text-[10px]"><ShieldCheck className="h-3 w-3" /> Admin</Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 text-[10px]"><Shield className="h-3 w-3" /> Vendedor</Badge>
                        )}
                        {isAdmin && u.id !== user?.id && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(u)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                                  <AlertDialogDescription>"{u.full_name}" será removido permanentemente do sistema.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteUser(u.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Edit user dialog */}
          <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input className="mt-1" value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Papel</Label>
                  <Select value={editRole} onValueChange={v => { setEditRole(v); if (v === 'admin') setEditPermissions([...ALL_PAGES]); }}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editRole !== 'admin' && (
                  <>
                    <Separator />
                    <PermissionCheckboxes permissions={editPermissions} setPermissions={setEditPermissions} />
                  </>
                )}
                <Button className="w-full" onClick={handleEditUser}>Salvar Alterações</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
