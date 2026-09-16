import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Star, MoreHorizontal, Phone, Mail, MapPin,
  Pencil, Trash2, Loader2, UserPlus, Headphones, Send,
  Handshake, ShieldCheck, Wrench, Flag, XCircle, Archive, Zap, Users, X, Tag,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn, formatCpfCnpj } from '@/lib/utils';
import { statusColors, statusLabels, formatNumber, type ClientStatus } from '@/lib/mock-data';
import { MotionPage, staggerContainer, staggerItem } from '@/components/MotionPage';
import { PipelineStepper, type PipelineStatus } from '@/components/PipelineStepper';
import { ClientStageActions } from '@/components/ClientStageActions';

interface ClientRow {
  id: string;
  user_id: string | null;
  name: string;
  document: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  project_location: string | null;
  concessionaria: string | null;
  consumo_medio: number | null;
  client_type: string;
  status: string;
  vendedor: string | null;
  origem: string | null;
  tags: string[] | null;
  notes: string | null;
  favorite: boolean | null;
  created_at: string;
  updated_at: string;
}

interface VendedorOption {
  id: string;
  full_name: string | null;
}

interface TagOption {
  id: string;
  name: string;
  color: string;
}

const emptyForm = {
  name: '', document: '', phone: '', whatsapp: '', email: '',
  cep: '', address: '', bairro: '', city: '', state: '', project_location: '',
  concessionaria: '', consumo_medio: '', client_type: 'residencial',
  status: 'novo', vendedor: '', origem: '', notes: '',
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
};

const CONCESSIONARIAS = [
  'Neoenergia', 'Equatorial Energia', 'Energisa', 'CPFL Energia',
  'Enel Brasil', 'Cemig Distribuição', 'Copel Distribuição',
  'Light Energia', 'EDP Brasil', 'Celesc Distribuição',
];

const ESTADOS_BR = [
  { uf: 'AC', nome: 'Acre' }, { uf: 'AL', nome: 'Alagoas' }, { uf: 'AP', nome: 'Amapá' },
  { uf: 'AM', nome: 'Amazonas' }, { uf: 'BA', nome: 'Bahia' }, { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' }, { uf: 'ES', nome: 'Espírito Santo' },
  { uf: 'GO', nome: 'Goiás' }, { uf: 'MA', nome: 'Maranhão' }, { uf: 'MT', nome: 'Mato Grosso' },
  { uf: 'MS', nome: 'Mato Grosso do Sul' }, { uf: 'MG', nome: 'Minas Gerais' },
  { uf: 'PA', nome: 'Pará' }, { uf: 'PB', nome: 'Paraíba' }, { uf: 'PR', nome: 'Paraná' },
  { uf: 'PE', nome: 'Pernambuco' }, { uf: 'PI', nome: 'Piauí' },
  { uf: 'RJ', nome: 'Rio de Janeiro' }, { uf: 'RN', nome: 'Rio Grande do Norte' },
  { uf: 'RS', nome: 'Rio Grande do Sul' }, { uf: 'RO', nome: 'Rondônia' },
  { uf: 'RR', nome: 'Roraima' }, { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SP', nome: 'São Paulo' }, { uf: 'SE', nome: 'Sergipe' }, { uf: 'TO', nome: 'Tocantins' },
];

const pipelineIcons: Record<string, React.ElementType> = {
  novo: UserPlus, em_atendimento: Headphones, proposta_enviada: Send,
  negociacao: Handshake, fechado: ShieldCheck, instalacao: Wrench,
  finalizado: Flag, perdido: XCircle, arquivado: Archive,
};

const clientTypeGradients: Record<string, string> = {
  residencial: 'from-primary/20 to-info/20',
  comercial: 'from-warning/20 to-chart-3/20',
  industrial: 'from-chart-5/20 to-primary/20',
  rural: 'from-success/20 to-chart-2/20',
};

export default function CRM() {
  const { user, isAdmin } = useAuth();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Vendedores and tags from DB
  const [vendedores, setVendedores] = useState<VendedorOption[]>([]);
  const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [addingTag, setAddingTag] = useState(false);

  // Cities from IBGE
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [citiesCache, setCitiesCache] = useState<Record<string, string[]>>({});
  const [loadingCep, setLoadingCep] = useState(false);

  // Fetch cities when state changes
  useEffect(() => {
    if (!form.state) {
      setCities([]);
      return;
    }
    if (citiesCache[form.state]) {
      setCities(citiesCache[form.state]);
      return;
    }
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.state}/municipios?orderBy=nome`);
        const data = await res.json();
        const names = data.map((m: any) => m.nome as string);
        setCities(names);
        setCitiesCache(prev => ({ ...prev, [form.state]: names }));
      } catch {
        setCities([]);
      }
      setLoadingCities(false);
    };
    fetchCities();
  }, [form.state, citiesCache]);

  const handleCepChange = async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    // Format as 00000-000
    let formatted = digits;
    if (digits.length > 5) formatted = digits.slice(0, 5) + '-' + digits.slice(5, 8);
    setForm(prev => ({ ...prev, cep: formatted }));

    if (digits.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(prev => ({
            ...prev,
            address: data.logradouro || prev.address,
            bairro: data.bairro || prev.bairro,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
        }
      } catch { /* ignore */ }
      setLoadingCep(false);
    }
  };

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Erro ao carregar clientes');
    } else {
      setClients((data as ClientRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  const fetchVendedores = useCallback(async () => {
    // Responsáveis = vendedores e administradores (o admin também pode assumir clientes)
    const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('role', ['vendedor', 'admin']);
    if (roles && roles.length > 0) {
      const userIds = Array.from(new Set(roles.map((r: any) => r.user_id)));
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      if (profiles) {
        const list = (profiles as VendedorOption[])
          .filter(p => (p.full_name ?? '').trim().length > 0)
          .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
        setVendedores(list);
      }
    } else {
      setVendedores([]);
    }
  }, []);


  const fetchTags = useCallback(async () => {
    const { data } = await supabase.from('tags').select('*').order('name');
    if (data) setAvailableTags(data as TagOption[]);
  }, []);

  useEffect(() => {
    fetchClients();
    fetchVendedores();
    fetchTags();
  }, [fetchClients, fetchVendedores, fetchTags]);

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.document ?? '').includes(search);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openNew = () => { setEditingId(null); setForm(emptyForm); setFormTags([]); setFormOpen(true); };

  const openEdit = (c: ClientRow) => {
    setEditingId(c.id);
    setForm({
      name: c.name, document: c.document ?? '', phone: c.phone ?? '',
      whatsapp: c.whatsapp ?? '', email: c.email ?? '', cep: '', address: c.address ?? '',
      bairro: '', city: c.city ?? '', state: c.state ?? '', project_location: c.project_location ?? '',
      concessionaria: c.concessionaria ?? '', consumo_medio: c.consumo_medio ? String(c.consumo_medio) : '',
      client_type: c.client_type, status: c.status, vendedor: c.vendedor ?? '',
      origem: c.origem ?? '', notes: c.notes ?? '',
    });
    setFormTags(c.tags ?? []);
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      document: form.document || null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      project_location: form.project_location || null,
      concessionaria: form.concessionaria || null,
      consumo_medio: parseInt(form.consumo_medio) || 0,
      client_type: form.client_type,
      status: form.status,
      vendedor: form.vendedor || null,
      origem: form.origem || null,
      tags: formTags,
      notes: form.notes || '',
    };
    if (editingId) {
      const { error } = await supabase.from('clients').update(payload).eq('id', editingId);
      if (error) toast.error(error.message); else toast.success('Cliente atualizado!');
    } else {
      const { error } = await supabase.from('clients').insert({ ...payload, user_id: user?.id ?? null });
      if (error) toast.error(error.message); else toast.success('Cliente cadastrado!');
    }
    setSaving(false);
    setFormOpen(false);
    fetchClients();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Cliente removido'); fetchClients(); }
  };

  const toggleFavorite = async (c: ClientRow) => {
    await supabase.from('clients').update({ favorite: !c.favorite }).eq('id', c.id);
    fetchClients();
  };

  const handleChangeStatus = async (clientId: string, newStatus: PipelineStatus) => {
    const { error } = await supabase.from('clients').update({ status: newStatus }).eq('id', clientId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Status alterado para ${statusLabels[newStatus]}`);
      fetchClients();
      if (selectedClient?.id === clientId) {
        setSelectedClient(prev => prev ? { ...prev, status: newStatus } : null);
      }
    }
  };

  const openDetail = (c: ClientRow) => { setSelectedClient(c); setDetailOpen(true); };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    setAddingTag(true);
    const { data, error } = await supabase.from('tags').insert({ name: newTagName.trim() } as any).select().single();
    if (error) {
      toast.error(error.message);
    } else if (data) {
      setAvailableTags(prev => [...prev, data as TagOption].sort((a, b) => a.name.localeCompare(b.name)));
      setFormTags(prev => [...prev, (data as TagOption).name]);
      toast.success('Tag criada!');
    }
    setNewTagName('');
    setAddingTag(false);
  };

  const toggleTag = (tagName: string) => {
    setFormTags(prev =>
      prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    );
  };

  const statusCounts = (Object.keys(statusLabels) as ClientStatus[]).reduce((acc, key) => {
    acc[key] = clients.filter(c => c.status === key).length;
    return acc;
  }, {} as Record<ClientStatus, number>);

  return (
    <MotionPage className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.div
            className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center"
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Users className="h-5 w-5 text-primary" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold font-display">CRM / Clientes</h1>
            <p className="text-sm text-muted-foreground">{clients.length} clientes cadastrados</p>
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button className="gap-2" onClick={openNew}>
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, e-mail, CPF/CNPJ..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Pipeline Counters */}
      <motion.div
        className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {(Object.entries(statusLabels) as [ClientStatus, string][]).map(([key, label]) => {
          const Icon = pipelineIcons[key] || Zap;
          const isActive = statusFilter === key;
          return (
            <motion.button
              key={key}
              variants={staggerItem}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
              className={cn(
                'rounded-xl p-3 text-center transition-all border glass',
                isActive ? 'border-primary bg-primary/10 shadow-md ring-1 ring-primary/20' : 'border-border hover:border-primary/30'
              )}
            >
              <motion.div
                className="mx-auto mb-1"
                whileHover={{ rotate: 15 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <Icon className={cn('h-4 w-4 mx-auto', isActive ? 'text-primary' : 'text-muted-foreground')} />
              </motion.div>
              <motion.p
                className="text-lg font-bold font-display"
                key={statusCounts[key]}
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {statusCounts[key] || 0}
              </motion.p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide leading-tight">{label}</p>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Client Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          className="text-center py-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4"
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Users className="h-8 w-8 text-muted-foreground" />
          </motion.div>
          <p className="text-muted-foreground font-medium">
            {clients.length === 0 ? 'Nenhum cliente cadastrado ainda' : 'Nenhum resultado encontrado'}
          </p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {clients.length === 0 ? 'Clique em "Novo Cliente" para começar' : 'Tente alterar os filtros'}
          </p>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map(client => {
              const Icon = pipelineIcons[client.status] || Zap;
              return (
                <motion.div
                  key={client.id}
                  variants={staggerItem}
                  layout
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className="glass cursor-pointer overflow-hidden group hover:shadow-lg hover:border-primary/20 transition-all"
                    onClick={() => openDetail(client)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-sm font-bold text-foreground',
                            clientTypeGradients[client.client_type] || 'from-primary/20 to-info/20'
                          )}>
                            {client.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.document}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <motion.button
                            onClick={() => toggleFavorite(client)}
                            className="p-1"
                            whileHover={{ scale: 1.3 }}
                            whileTap={{ scale: 0.8, rotate: 20 }}
                          >
                            <Star className={cn('h-4 w-4 transition-colors', client.favorite ? 'fill-warning text-warning' : 'text-muted-foreground/30 hover:text-warning/60')} />
                          </motion.button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(client)}><Pencil className="h-3.5 w-3.5 mr-2" /> Editar</DropdownMenuItem>
                              {isAdmin && (
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(client.id)}>
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground mb-3">
                        {client.whatsapp && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{client.whatsapp}</div>}
                        {client.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{client.email}</div>}
                        {client.city && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{client.city}{client.state ? ` / ${client.state}` : ''}</div>}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex gap-1.5 flex-wrap">
                          <Badge className={cn('text-[10px] gap-1', statusColors[client.status as ClientStatus] ?? 'bg-muted text-muted-foreground')}>
                            <Icon className="h-3 w-3" />
                            {statusLabels[client.status as ClientStatus] ?? client.status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{client.client_type}</Badge>
                        </div>
                        {(client.consumo_medio ?? 0) > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Zap className="h-3 w-3" />{formatNumber(client.consumo_medio!)} kWh
                          </span>
                        )}
                      </div>

                      {(client.tags?.length ?? 0) > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {client.tags!.map(tag => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
                        </div>
                      )}

                      {/* Mini stage actions */}
                      <div className="mt-3 pt-3 border-t border-border/50" onClick={e => e.stopPropagation()}>
                        <ClientStageActions
                          currentStatus={client.status as PipelineStatus}
                          onChangeStatus={(s) => handleChangeStatus(client.id, s)}
                          compact
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* New/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label className="text-xs">Nome *</Label><Input className="mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div><Label className="text-xs">CPF/CNPJ</Label><Input className="mt-1" value={form.document} onChange={e => setForm({ ...form, document: formatCpfCnpj(e.target.value) })} maxLength={18} placeholder="000.000.000-00" /></div>
              <div><Label className="text-xs">Telefone</Label><Input className="mt-1" value={form.phone} onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })} maxLength={16} placeholder="(61) 9 9999-9999" /></div>
              <div><Label className="text-xs">WhatsApp</Label><Input className="mt-1" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: formatPhone(e.target.value) })} maxLength={16} placeholder="(61) 9 9999-9999" /></div>
              <div><Label className="text-xs">E-mail</Label><Input type="email" className="mt-1" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div>
                <Label className="text-xs">CEP</Label>
                <div className="relative">
                  <Input className="mt-1" value={form.cep} onChange={e => handleCepChange(e.target.value)} maxLength={9} placeholder="00000-000" />
                  {loadingCep && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
                </div>
              </div>
              <div className="sm:col-span-2"><Label className="text-xs">Endereço</Label><Input className="mt-1" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div>
                <Label className="text-xs">Estado</Label>
                <Select value={form.state || '__none__'} onValueChange={v => setForm({ ...form, state: v === '__none__' ? '' : v, city: '', bairro: '' })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {ESTADOS_BR.map(e => <SelectItem key={e.uf} value={e.uf}>{e.uf} - {e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Cidade</Label>
                <Select value={form.city || '__none__'} onValueChange={v => setForm({ ...form, city: v === '__none__' ? '' : v, bairro: '' })} disabled={!form.state}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={!form.state ? 'Selecione o estado' : loadingCities ? 'Carregando...' : 'Selecione'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Bairro</Label><Input className="mt-1" value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })} placeholder="Preenchido pelo CEP ou digite" disabled={!form.city} /></div>
            </div>

            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados do Projeto Solar</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label className="text-xs">Local do Projeto</Label><Input className="mt-1" value={form.project_location} onChange={e => setForm({ ...form, project_location: e.target.value })} /></div>
              <div>
                <Label className="text-xs">Concessionária</Label>
                <Select value={form.concessionaria || '__none__'} onValueChange={v => setForm({ ...form, concessionaria: v === '__none__' ? '' : v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {CONCESSIONARIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Consumo Médio (kWh/mês)</Label><Input type="text" inputMode="numeric" className="mt-1" value={form.consumo_medio} onChange={e => setForm({ ...form, consumo_medio: e.target.value.replace(/[^\d]/g, '') })} placeholder="Ex: 450" /></div>
              <div>
                <Label className="text-xs">Tipo de Cliente</Label>
                <Select value={form.client_type} onValueChange={v => setForm({ ...form, client_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residencial">Residencial</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="rural">Rural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comercial</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Vendedor Responsável</Label>
                <Select value={form.vendedor || '__none__'} onValueChange={v => setForm({ ...form, vendedor: v === '__none__' ? '' : v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um vendedor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {vendedores.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum vendedor ativo</div>
                    ) : (
                      vendedores.map(v => (
                        <SelectItem key={v.id} value={v.full_name || v.id}>{v.full_name || 'Sem nome'}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Origem do Lead</Label><Input className="mt-1" value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} placeholder="Ex: Instagram, Google, Indicação..." /></div>
              <div>
                <Label className="text-xs">Tags</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full mt-1 justify-start text-left font-normal h-auto min-h-[36px] px-3 py-2">
                      {formTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {formTags.map(t => (
                            <Badge key={t} variant="secondary" className="text-[10px] gap-1">
                              {t}
                              <X className="h-2.5 w-2.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleTag(t); }} />
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Selecione tags...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {availableTags.map(tag => (
                        <label key={tag.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                          <Checkbox checked={formTags.includes(tag.name)} onCheckedChange={() => toggleTag(tag.name)} />
                          <Tag className="h-3 w-3" style={{ color: tag.color }} />
                          {tag.name}
                        </label>
                      ))}
                      {availableTags.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">Nenhuma tag cadastrada</p>
                      )}
                    </div>
                    {isAdmin && (
                      <>
                        <Separator className="my-2" />
                        <div className="flex gap-1">
                          <Input
                            placeholder="Nova tag..."
                            className="h-8 text-xs"
                            value={newTagName}
                            onChange={e => setNewTagName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                          />
                          <Button size="sm" className="h-8 px-2 text-xs" onClick={handleAddTag} disabled={addingTag || !newTagName.trim()}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div><Label className="text-xs">Observações</Label><Textarea className="mt-1" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingId ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedClient && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <motion.div
                    className={cn(
                      'h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-sm font-bold text-foreground',
                      clientTypeGradients[selectedClient.client_type] || 'from-primary/20 to-info/20'
                    )}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    {selectedClient.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </motion.div>
                  <div>
                    <p className="text-left">{selectedClient.name}</p>
                    <p className="text-xs text-muted-foreground font-normal">{selectedClient.client_type}</p>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Pipeline Stepper */}
                <PipelineStepper currentStatus={selectedClient.status as PipelineStatus} />

                {/* Stage Actions */}
                <div className="flex justify-center">
                  <ClientStageActions
                    currentStatus={selectedClient.status as PipelineStatus}
                    onChangeStatus={(s) => handleChangeStatus(selectedClient.id, s)}
                  />
                </div>

                <Separator />

                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  <Badge className={cn('text-xs', statusColors[selectedClient.status as ClientStatus])}>
                    {statusLabels[selectedClient.status as ClientStatus]}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{selectedClient.client_type}</Badge>
                  {selectedClient.favorite && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Star className="h-3 w-3 fill-warning text-warning" /> Favorito
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Contact info */}
                <div className="space-y-3 text-sm">
                  {selectedClient.document && (
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><Users className="h-4 w-4 text-muted-foreground" /></div>
                      <div><span className="text-muted-foreground text-xs">CPF/CNPJ</span><p>{selectedClient.document}</p></div>
                    </div>
                  )}
                  {selectedClient.email && (
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><Mail className="h-4 w-4 text-muted-foreground" /></div>
                      <div><span className="text-muted-foreground text-xs">E-mail</span><p>{selectedClient.email}</p></div>
                    </div>
                  )}
                  {selectedClient.phone && (
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><Phone className="h-4 w-4 text-muted-foreground" /></div>
                      <div><span className="text-muted-foreground text-xs">Telefone</span><p>{selectedClient.phone}</p></div>
                    </div>
                  )}
                  {selectedClient.city && (
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><MapPin className="h-4 w-4 text-muted-foreground" /></div>
                      <div><span className="text-muted-foreground text-xs">Localização</span><p>{selectedClient.city} / {selectedClient.state}</p></div>
                    </div>
                  )}
                </div>

                <Separator />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5" /> Projeto Solar
                </p>
                <div className="space-y-3 text-sm">
                  {selectedClient.concessionaria && (
                    <div><span className="text-muted-foreground text-xs">Concessionária</span><p>{selectedClient.concessionaria}</p></div>
                  )}
                  <div><span className="text-muted-foreground text-xs">Consumo Médio</span><p>{formatNumber(selectedClient.consumo_medio ?? 0)} kWh/mês</p></div>
                  {selectedClient.project_location && (
                    <div><span className="text-muted-foreground text-xs">Local do Projeto</span><p>{selectedClient.project_location}</p></div>
                  )}
                </div>

                <Separator />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comercial</p>
                <div className="space-y-3 text-sm">
                  {selectedClient.vendedor && <div><span className="text-muted-foreground text-xs">Vendedor</span><p>{selectedClient.vendedor}</p></div>}
                  {selectedClient.origem && <div><span className="text-muted-foreground text-xs">Origem</span><p>{selectedClient.origem}</p></div>}
                  {selectedClient.notes && <div><span className="text-muted-foreground text-xs">Observações</span><p>{selectedClient.notes}</p></div>}
                </div>

                {(selectedClient.tags?.length ?? 0) > 0 && (
                  <>
                    <Separator />
                    <div className="flex gap-1 flex-wrap">
                      {selectedClient.tags!.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex gap-2">
                  <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button className="w-full" onClick={() => { setDetailOpen(false); openEdit(selectedClient); }}>
                      <Pencil className="h-4 w-4 mr-2" /> Editar
                    </Button>
                  </motion.div>
                  {isAdmin && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="destructive" onClick={() => { setDetailOpen(false); handleDelete(selectedClient.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </SheetContent>
      </Sheet>
    </MotionPage>
  );
}
