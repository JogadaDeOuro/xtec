import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { customerUrl } from '@/lib/public-url';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Circle, Clock, AlertTriangle, Copy, Link2, CalendarIcon,
  UserPlus, Loader2, ChevronDown
} from 'lucide-react';

type StageStatus = 'pendente' | 'em_andamento' | 'concluido' | 'atrasado';

interface StageItem {
  id: string;
  project_stage_id: string;
  name: string;
  position: number;
  data_prevista: string | null;
  data_real: string | null;
  responsavel: string;
  observacoes: string;
  status: StageStatus;
}

interface ProjectStage {
  id: string;
  client_id: string;
  tracking_token: string;
  client_name?: string;
}

interface ClientOption {
  id: string;
  name: string;
  status: string;
}

const DEFAULT_STAGES = [
  'Aprovação do Projeto',
  'Vistoria Técnica',
  'Compra de Materiais',
  'Entrega de Materiais',
  'Instalação Estrutural',
  'Instalação Elétrica',
  'Comissionamento',
  'Vistoria da Concessionária',
  'Ativação do Sistema',
];

const stageIcons: Record<StageStatus, typeof CheckCircle2> = {
  concluido: CheckCircle2,
  em_andamento: Clock,
  pendente: Circle,
  atrasado: AlertTriangle,
};

const stageColors: Record<StageStatus, string> = {
  concluido: 'text-success',
  em_andamento: 'text-info',
  pendente: 'text-muted-foreground',
  atrasado: 'text-destructive',
};

const stageBgColors: Record<StageStatus, string> = {
  concluido: 'bg-success/10 border-success/30',
  em_andamento: 'bg-info/10 border-info/30',
  pendente: 'bg-muted border-border',
  atrasado: 'bg-destructive/10 border-destructive/30',
};

const statusOptions: { value: StageStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'atrasado', label: 'Atrasado' },
];

export default function Etapas() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [projectStage, setProjectStage] = useState<ProjectStage | null>(null);
  const [stageItems, setStageItems] = useState<StageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Fetch clients with active contracts
  useEffect(() => {
    async function fetchClients() {
      const { data } = await supabase
        .from('clients')
        .select('id, name, status')
        .in('status', ['fechado', 'instalacao', 'finalizado'])
        .order('name');
      if (data) setClients(data);
    }
    fetchClients();
  }, []);

  const loadProjectStage = useCallback(async (clientId: string) => {
    setLoading(true);
    const { data: ps } = await supabase
      .from('project_stages')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();

    if (ps) {
      setProjectStage(ps as ProjectStage);
      const { data: items } = await supabase
        .from('stage_items')
        .select('*')
        .eq('project_stage_id', ps.id)
        .order('position');
      setStageItems((items as StageItem[]) || []);
    } else {
      setProjectStage(null);
      setStageItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedClientId) loadProjectStage(selectedClientId);
  }, [selectedClientId, loadProjectStage]);

  const createProjectStage = async () => {
    if (!user || !selectedClientId) return;
    setCreating(true);
    const { data: ps, error } = await supabase
      .from('project_stages')
      .insert({ client_id: selectedClientId, user_id: user.id })
      .select()
      .single();

    if (error || !ps) {
      toast.error('Erro ao criar etapas do projeto');
      setCreating(false);
      return;
    }

    // Insert default stage items
    const items = DEFAULT_STAGES.map((name, i) => ({
      project_stage_id: ps.id,
      name,
      position: i,
      status: 'pendente' as const,
    }));

    await supabase.from('stage_items').insert(items);
    await loadProjectStage(selectedClientId);
    setCreating(false);
    toast.success('Etapas criadas com sucesso!');
  };

  const updateStageItem = async (itemId: string, updates: Partial<StageItem>) => {
    const { error } = await supabase.from('stage_items').update(updates).eq('id', itemId);
    if (error) {
      toast.error('Erro ao atualizar etapa');
      return;
    }
    setStageItems(prev => prev.map(s => s.id === itemId ? { ...s, ...updates } : s));
    toast.success('Etapa atualizada');
  };

  const copyTrackingLink = () => {
    if (!projectStage) return;
    const url = customerUrl(`/acompanhamento/${projectStage.tracking_token}`);
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const progress = stageItems.filter(s => s.status === 'concluido').length;
  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Gestão de Etapas & Prazos</h1>
        <p className="text-sm text-muted-foreground">Selecione um cliente com contrato ativo para gerenciar as etapas da obra</p>
      </div>

      {/* Client Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="text-sm font-medium mb-2 block">Cliente</label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente com contrato ativo..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        {c.name}
                        <Badge variant="outline" className="text-[10px] ml-1">{c.status}</Badge>
                      </span>
                    </SelectItem>
                  ))}
                  {clients.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente com contrato ativo</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {projectStage && (
              <Button variant="outline" size="sm" onClick={copyTrackingLink} className="shrink-0">
                <Link2 className="h-4 w-4 mr-2" />
                Copiar link do cliente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* No project yet */}
      {selectedClientId && !loading && !projectStage && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <UserPlus className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              Este cliente ainda não possui etapas de projeto cadastradas.
            </p>
            <Button onClick={createProjectStage} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Iniciar Etapas do Projeto
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stage items */}
      {projectStage && !loading && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{selectedClient?.name}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {progress}/{stageItems.length} etapas concluídas
                </Badge>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${stageItems.length ? (progress / stageItems.length) * 100 : 0}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              {/* Tracking link display */}
              <div className="flex items-center gap-2 mt-3 p-2 rounded-md bg-muted/50">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {customerUrl(`/acompanhamento/${projectStage.tracking_token}`)}
                </span>
                <Button variant="ghost" size="sm" className="h-6 px-2 ml-auto shrink-0" onClick={copyTrackingLink}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <AnimatePresence>
                  {stageItems.map((stage, i) => {
                    const Icon = stageIcons[stage.status as StageStatus];
                    return (
                      <motion.div
                        key={stage.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn(
                          'flex flex-col gap-3 rounded-lg border p-3 transition-all',
                          stageBgColors[stage.status as StageStatus]
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', stageColors[stage.status as StageStatus])} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{stage.name}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                              {stage.data_prevista && <span>Previsto: {stage.data_prevista}</span>}
                              {stage.data_real && <span>Real: {stage.data_real}</span>}
                              {stage.responsavel && <span>Resp: {stage.responsavel}</span>}
                            </div>
                            {stage.observacoes && (
                              <p className="text-xs text-muted-foreground mt-1 italic">{stage.observacoes}</p>
                            )}
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-wrap gap-2 items-center pl-8">
                          <Select
                            value={stage.status}
                            onValueChange={(v) => updateStageItem(stage.id, {
                              status: v as StageStatus,
                              ...(v === 'concluido' ? { data_real: format(new Date(), 'yyyy-MM-dd') } : {})
                            })}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map(o => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 text-xs">
                                <CalendarIcon className="h-3 w-3 mr-1" />
                                {stage.data_prevista || 'Prazo'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={stage.data_prevista ? new Date(stage.data_prevista + 'T00:00:00') : undefined}
                                onSelect={(d) => d && updateStageItem(stage.id, { data_prevista: format(d, 'yyyy-MM-dd') })}
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>

                          <Input
                            placeholder="Responsável"
                            value={stage.responsavel}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStageItems(prev => prev.map(s => s.id === stage.id ? { ...s, responsavel: val } : s));
                            }}
                            onBlur={(e) => updateStageItem(stage.id, { responsavel: e.target.value })}
                            className="h-8 text-xs w-[140px]"
                          />

                          <Input
                            placeholder="Observações"
                            value={stage.observacoes}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStageItems(prev => prev.map(s => s.id === stage.id ? { ...s, observacoes: val } : s));
                            }}
                            onBlur={(e) => updateStageItem(stage.id, { observacoes: e.target.value })}
                            className="h-8 text-xs flex-1 min-w-[120px]"
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
