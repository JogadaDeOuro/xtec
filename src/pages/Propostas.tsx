import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, FileText, Send, Copy, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  proposalStatusLabels, proposalStatusColors, formatCurrency, type ProposalStatus,
} from '@/lib/mock-data';
import { fetchProposals, deleteProposal, type ProposalRecord } from '@/lib/proposals';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const ITEMS_PER_PAGE = 10;

export default function Propostas() {
  const [search, setSearch] = useState('');
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const load = useCallback(async () => {
    try {
      setProposals(await fetchProposals());
    } catch (e) {
      toast.error('Erro ao carregar propostas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await deleteProposal(id);
      setProposals(prev => prev.filter(p => p.id !== id));
      toast.success('Proposta excluída');
    } catch (e) {
      toast.error('Erro ao excluir proposta');
    }
  };

  // Sort by newest first
  const sorted = [...proposals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const filtered = sorted.filter(p => {
    const matchSearch = p.clientName.toLowerCase().includes(search.toLowerCase()) || p.numero.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Propostas</h1>
          <p className="text-sm text-muted-foreground">{proposals.length} propostas</p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/propostas/nova')}>
          <Plus className="h-4 w-4" /> Nova Proposta
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar proposta..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['rascunho', 'enviada', 'aceita', 'recusada'] as const).map(s => {
          const count = proposals.filter(p => p.status === s).length;
          const isActive = statusFilter === s;
          return (
            <Card
              key={s}
              className={cn(
                'animate-fade-in cursor-pointer transition-all hover:shadow-md',
                isActive && 'ring-2 ring-primary'
              )}
              onClick={() => {
                setStatusFilter(prev => prev === s ? 'all' : s);
                setVisibleCount(ITEMS_PER_PAGE);
              }}
            >
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold font-display">{count}</p>
                <p className="text-xs text-muted-foreground">{proposalStatusLabels[s]}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {statusFilter !== 'all' && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            {proposalStatusLabels[statusFilter]}
            <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-destructive">✕</button>
          </Badge>
          <span className="text-xs text-muted-foreground">{filtered.length} resultado(s)</span>
        </div>
      )}

      <div className="space-y-3">
        {loading && (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        )}
        {!loading && visible.map((p) => (
          <Card key={p.id} className="hover:shadow-md transition-shadow animate-fade-in cursor-pointer"
            onClick={() => navigate(`/propostas/${p.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{p.clientName}</p>
                      <Badge className={cn('text-[10px]', proposalStatusColors[p.status])}>
                        {proposalStatusLabels[p.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.numero} · {p.systemType.toUpperCase()} · {p.potenciaKwp} kWp · {p.createdAt}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatCurrency(p.valorSistema)}</p>
                    <p className="text-xs text-muted-foreground">Economia: {formatCurrency(p.economiaMensal)}/mês</p>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Copy className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir a proposta {p.numero} de {p.clientName}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(p.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma proposta encontrada</p>
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button variant="outline" onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}>
              Carregar mais ({filtered.length - visibleCount} restantes)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
