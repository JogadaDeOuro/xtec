import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, AlertTriangle, Loader2, Sun } from 'lucide-react';

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
  concluido: 'text-green-600',
  em_andamento: 'text-blue-500',
  pendente: 'text-gray-400',
  atrasado: 'text-red-500',
};

const stageBg: Record<StageStatus, string> = {
  concluido: 'bg-green-50 border-green-200',
  em_andamento: 'bg-blue-50 border-blue-200',
  pendente: 'bg-gray-50 border-gray-200',
  atrasado: 'bg-red-50 border-red-200',
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

      const { data, error } = await supabase.rpc('get_public_tracking', { _token: token });

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white">
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
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Sun className="h-6 w-6 text-yellow-500" />
            <span className="font-bold text-lg text-green-800">Inforsol</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Acompanhamento da Obra</h1>
          <p className="text-sm text-gray-500 mt-1">{clientName}</p>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progresso geral</span>
              <Badge variant="outline">{progress}/{stages.length} etapas</Badge>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
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
                    stage.status === 'concluido' ? 'bg-green-100 border-green-500' :
                    stage.status === 'em_andamento' ? 'bg-blue-100 border-blue-500' :
                    stage.status === 'atrasado' ? 'bg-red-100 border-red-500' :
                    'bg-gray-100 border-gray-300'
                  )}>
                    <Icon className={cn('h-4 w-4', stageColors[stage.status])} />
                  </div>
                  {!isLast && (
                    <div className={cn(
                      'w-0.5 flex-1 min-h-[24px]',
                      stage.status === 'concluido' ? 'bg-green-300' : 'bg-gray-200'
                    )} />
                  )}
                </div>

                {/* Content */}
                <div className={cn('flex-1 pb-4', !isLast && 'mb-0')}>
                  <div className={cn('rounded-lg border p-3', stageBg[stage.status])}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">{stage.name}</p>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {stageLabels[stage.status]}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
                      {stage.data_prevista && <span>Previsto: {stage.data_prevista}</span>}
                      {stage.data_real && <span>Realizado: {stage.data_real}</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Atualizado em tempo real • Inforsol Energia Solar
        </p>
      </div>
    </div>
  );
}
