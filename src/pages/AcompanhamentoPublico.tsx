import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { invokePublicPortal } from '@/lib/public-portal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { SolarFlowLogo } from '@/components/brand/SolarFlowLogo';

type StageStatus = 'pendente' | 'em_andamento' | 'concluido' | 'atrasado';

interface StageItem {
  id: string;
  name: string;
  position: number;
  data_prevista: string | null;
  data_real: string | null;
  status: StageStatus;
}

const stageIcons: Record<StageStatus, typeof CheckCircle2> = {
  concluido: CheckCircle2,
  em_andamento: Clock,
  pendente: Circle,
  atrasado: AlertTriangle,
};

const stageLabels: Record<StageStatus, string> = {
  concluido: 'Concluído',
  em_andamento: 'Em andamento',
  pendente: 'Pendente',
  atrasado: 'Atrasado',
};

const stageColors: Record<StageStatus, string> = {
  concluido: 'text-success',
  em_andamento: 'text-info',
  pendente: 'text-muted-foreground',
  atrasado: 'text-destructive',
};

const stageBg: Record<StageStatus, string> = {
  concluido: 'bg-success/10 border-success/20',
  em_andamento: 'bg-info/10 border-info/20',
  pendente: 'bg-muted/50 border-border',
  atrasado: 'bg-destructive/10 border-destructive/20',
};

export default function AcompanhamentoPublico() {
  const { token } = useParams<{ token: string }>();
  const [stages, setStages] = useState<StageItem[]>([]);
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      if (!token) { setNotFound(true); setLoading(false); return; }

      const { data, error } = await invokePublicPortal<{ client_name?: string; items?: StageItem[] }>('get-tracking', { token });

      const result = data as { client_name?: string; items?: StageItem[] } | null;
      if (error || !result) { setNotFound(true); setLoading(false); return; }

      setClientName(result.client_name || 'Projeto');
      setStages((result.items as StageItem[]) || []);
      setLoading(false);

    }
    load();
  }, [token]);

  const progress = stages.filter(s => s.status === 'concluido').length;

  if (loading) {
    return (
       <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
       <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-semibold">Link não encontrado</p>
            <p className="text-sm text-muted-foreground mt-2">O link de acompanhamento é inválido ou expirou.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
     <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
             <SolarFlowLogo className="h-9 w-auto max-w-[190px] dark:hidden" tone="light" />
             <SolarFlowLogo className="hidden h-9 w-auto max-w-[190px] dark:block" tone="dark" />
          </div>
           <h1 className="text-xl font-bold text-foreground">Acompanhamento da Obra</h1>
           <p className="text-sm text-muted-foreground mt-1">{clientName}</p>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
               <span className="text-sm font-medium text-foreground">Progresso geral</span>
              <Badge variant="outline">{progress}/{stages.length} etapas</Badge>
            </div>
             <div className="h-3 rounded-full bg-muted overflow-hidden">
              <motion.div
                 className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${stages.length ? (progress / stages.length) * 100 : 0}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <div className="space-y-0">
          {stages.map((stage, i) => {
            const Icon = stageIcons[stage.status];
            const isLast = i === stages.length - 1;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex gap-4"
              >
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0',
                     stage.status === 'concluido' ? 'bg-success/10 border-success' :
                     stage.status === 'em_andamento' ? 'bg-info/10 border-info' :
                     stage.status === 'atrasado' ? 'bg-destructive/10 border-destructive' :
                     'bg-muted border-border'
                  )}>
                    <Icon className={cn('h-4 w-4', stageColors[stage.status])} />
                  </div>
                  {!isLast && (
                    <div className={cn(
                      'w-0.5 flex-1 min-h-[24px]',
                       stage.status === 'concluido' ? 'bg-success/40' : 'bg-border'
                    )} />
                  )}
                </div>

                {/* Content */}
                <div className={cn('flex-1 pb-4', !isLast && 'mb-0')}>
                  <div className={cn('rounded-lg border p-3', stageBg[stage.status])}>
                    <div className="flex items-center justify-between gap-2">
                     <p className="text-sm font-medium text-foreground">{stage.name}</p>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {stageLabels[stage.status]}
                      </Badge>
                    </div>
                     <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                      {stage.data_prevista && <span>Previsto: {stage.data_prevista}</span>}
                      {stage.data_real && <span>Realizado: {stage.data_real}</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

         <p className="text-center text-xs text-muted-foreground mt-8">
           Atualizado em tempo real • tecnologia SolarFlow
        </p>
      </div>
    </div>
  );
}
