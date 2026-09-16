import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/useAuth";
import { AccountProvider, useAccount } from "@/hooks/useAccount";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import { RestrictedAccount } from "@/components/RestrictedAccount";
import { AppLayout } from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteSeo } from "@/components/RouteSeo";

// Lazy loaded pages
const Landing = lazy(() => import("./pages/Landing"));
const Cadastro = lazy(() => import("./pages/Cadastro"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CRM = lazy(() => import("./pages/CRM"));
const Propostas = lazy(() => import("./pages/Propostas"));
const NovaPropostaPage = lazy(() => import("./pages/NovaPropostaPage"));
const EditarPropostaPage = lazy(() => import("./pages/EditarPropostaPage"));
const NovaManutencaoPage = lazy(() => import("./pages/NovaManutencaoPage"));
const Contratos = lazy(() => import("./pages/Contratos"));
const AssinarContrato = lazy(() => import("./pages/AssinarContrato"));
const Etapas = lazy(() => import("./pages/Etapas"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Integracoes = lazy(() => import("./pages/Integracoes"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const PersonalizacaoProposta = lazy(() => import("./pages/PersonalizacaoProposta"));
const ModeloContrato = lazy(() => import("./pages/ModeloContrato"));
const ContaPlano = lazy(() => import("./pages/ContaPlano"));

const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminEmpresas = lazy(() => import("./pages/admin/AdminEmpresas"));
const AdminAssinaturas = lazy(() => import("./pages/admin/AdminAssinaturas"));
const AdminPlanos = lazy(() => import("./pages/admin/AdminPlanos"));
const AdminFinanceiro = lazy(() => import("./pages/admin/AdminFinanceiro"));
const AdminUso = lazy(() => import("./pages/admin/AdminUso"));
const AdminAuditoria = lazy(() => import("./pages/admin/AdminAuditoria"));

const WhatsApp = lazy(() => import("./pages/WhatsApp"));
const WhatsAppAdmin = lazy(() => import("./pages/WhatsAppAdmin"));
const Login = lazy(() => import("./pages/Login"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AcompanhamentoPublico = lazy(() => import("./pages/AcompanhamentoPublico"));
const PropostaPublica = lazy(() => import("./pages/PropostaPublica"));
const PropostaPrint = lazy(() => import("./pages/PropostaPrint"));

const AceiteProposta = lazy(() => import("./pages/AceiteProposta"));
const PortalCliente = lazy(() => import("./pages/PortalCliente"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-32" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl mt-4" />
    </div>
  );
}

/** Conta restrita por inadimplência: só libera a área de assinatura. */
function RestrictionGate({ children, allowRestricted }: { children: React.ReactNode; allowRestricted?: boolean }) {
  const { restricted } = useAccount();
  if (restricted && !allowRestricted) return <RestrictedAccount />;
  return <>{children}</>;
}

function ProtectedPage({
  children,
  pageKey,
  allowRestricted,
}: { children: React.ReactNode; pageKey?: string; allowRestricted?: boolean }) {
  return (
    <ProtectedRoute pageKey={pageKey}>
      <RestrictionGate allowRestricted={allowRestricted}>
        <AppLayout>{children}</AppLayout>
      </RestrictionGate>
    </ProtectedRoute>
  );
}

function AdminPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <SuperAdminRoute>
        <AppLayout>{children}</AppLayout>
      </SuperAdminRoute>
    </ProtectedRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            <AccountProvider>
              <RouteSeo />
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                  {/* Público */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/cadastro" element={<Cadastro />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* Aplicação */}
                  <Route path="/dashboard" element={<ProtectedPage pageKey="dashboard"><Dashboard /></ProtectedPage>} />
                  <Route path="/crm" element={<ProtectedPage pageKey="crm"><CRM /></ProtectedPage>} />
                  <Route path="/propostas" element={<ProtectedPage pageKey="propostas"><Propostas /></ProtectedPage>} />
                  <Route path="/propostas/nova" element={<ProtectedPage pageKey="propostas"><NovaPropostaPage /></ProtectedPage>} />
                  <Route path="/propostas/manutencao" element={<ProtectedPage pageKey="propostas"><NovaManutencaoPage /></ProtectedPage>} />
                  <Route path="/propostas/manutencao/:id" element={<ProtectedPage pageKey="propostas"><NovaManutencaoPage /></ProtectedPage>} />
                  <Route path="/propostas/:id" element={<ProtectedPage pageKey="propostas"><EditarPropostaPage /></ProtectedPage>} />
                  <Route path="/contratos" element={<ProtectedPage pageKey="contratos"><Contratos /></ProtectedPage>} />
                  <Route path="/etapas" element={<ProtectedPage pageKey="etapas"><Etapas /></ProtectedPage>} />
                  <Route path="/financeiro" element={<ProtectedPage pageKey="financeiro"><Financeiro /></ProtectedPage>} />
                  <Route path="/whatsapp" element={<ProtectedPage pageKey="whatsapp"><WhatsApp /></ProtectedPage>} />
                  <Route path="/integracoes" element={<ProtectedPage pageKey="integracoes"><Integracoes /></ProtectedPage>} />
                  <Route path="/personalizacao-proposta" element={<ProtectedPage pageKey="configuracoes"><PersonalizacaoProposta /></ProtectedPage>} />
                  <Route path="/modelo-contrato" element={<ProtectedPage pageKey="contratos"><ModeloContrato /></ProtectedPage>} />
                  <Route path="/configuracoes" element={<ProtectedPage pageKey="configuracoes"><Configuracoes /></ProtectedPage>} />
                  <Route path="/whatsapp-admin" element={<ProtectedPage pageKey="configuracoes"><WhatsAppAdmin /></ProtectedPage>} />
                  <Route path="/conta/plano" element={<ProtectedPage allowRestricted><ContaPlano /></ProtectedPage>} />

                  {/* Super Admin da plataforma */}
                  <Route path="/admin" element={<AdminPage><AdminOverview /></AdminPage>} />
                  <Route path="/admin/empresas" element={<AdminPage><AdminEmpresas /></AdminPage>} />
                  <Route path="/admin/assinaturas" element={<AdminPage><AdminAssinaturas /></AdminPage>} />
                  <Route path="/admin/planos" element={<AdminPage><AdminPlanos /></AdminPage>} />
                  <Route path="/admin/financeiro" element={<AdminPage><AdminFinanceiro /></AdminPage>} />
                  <Route path="/admin/uso" element={<AdminPage><AdminUso /></AdminPage>} />
                  <Route path="/admin/auditoria" element={<AdminPage><AdminAuditoria /></AdminPage>} />

                  {/* Links públicos de cliente */}
                  <Route path="/acompanhamento/:token" element={<AcompanhamentoPublico />} />
                  <Route path="/assinar/:token" element={<AssinarContrato />} />
                  <Route path="/proposta/:token" element={<PropostaPublica />} />
                  <Route path="/proposta/:token/print" element={<PropostaPrint />} />
                  <Route path="/aceite/:token" element={<AceiteProposta />} />
                  <Route path="/cliente" element={<PortalCliente />} />
                  <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </AccountProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
