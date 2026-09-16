# Integrações de agentes (MCP)

## Objetivo
Disponibilizar dados do Inforsol Propostas & Contratos para assistentes compatíveis com MCP, com acesso protegido pelo login existente e respeitando as permissões de administrador e vendedor.

## O que será construído
- Ativar o servidor OAuth gerenciado do Lovable Cloud para autenticar os usuários nos assistentes.
- Criar um servidor MCP hospedado no backend do app, seguindo o transporte HTTP do protocolo.
- Expor inicialmente ferramentas somente de consulta para:
  - clientes;
  - propostas;
  - contratos;
  - etapas de execução.
- Aplicar os mesmos limites de acesso já usados no app: administrador consulta todos os registros; vendedor consulta apenas registros sob sua responsabilidade.
- Validar entradas, limitar volumes de resposta e retornar erros sem revelar detalhes internos.
- Testar descoberta, autenticação, listagem de ferramentas e chamadas reais autorizadas.
- Atualizar a área de integrações somente se for necessário apresentar o endereço de conexão ou o estado do serviço.

## Segurança
- A integração será **protegida com login**; não haverá modo público.
- A identidade virá do token OAuth do próprio usuário.
- As consultas usarão o contexto desse usuário e as políticas existentes do banco; nenhuma ferramenta usará acesso administrativo irrestrito.
- Esta primeira versão não criará, editará ou excluirá clientes, propostas, contratos ou etapas.
- Nenhuma chave privada será colocada no navegador ou no código-fonte.

## Ferramentas iniciais
1. `listar_clientes` — filtros por nome, telefone, status e responsável.
2. `consultar_cliente` — detalhes de um cliente acessível ao usuário.
3. `listar_propostas` — filtros por cliente, número e status.
4. `consultar_proposta` — resumo comercial e vínculo com cliente.
5. `listar_contratos` — filtros por cliente, número e status.
6. `consultar_contrato` — resumo e estado de assinatura.
7. `consultar_etapas` — andamento do projeto e itens de execução associados ao cliente.

## Limites desta entrega
- Não inclui integrações externas como Notion, Linear ou Google Drive; elas serão conectadas separadamente conforme o serviço escolhido.
- Não inclui ferramentas que alterem dados. Ações de escrita poderão ser adicionadas depois, com aprovação explícita e auditoria própria.

## Validação final
- Confirmar que uma chamada sem login é recusada.
- Confirmar que um usuário autenticado lista as ferramentas.
- Confirmar que vendedor não recebe registros de outro responsável.
- Confirmar que administrador mantém a visão permitida pelo sistema.
- Confirmar o endereço MCP exibido para conexão no ChatGPT, Claude ou Lovable.
