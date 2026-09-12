# Resumo flutuante móvel da proposta

## Objetivo
Adicionar, nas telas de criar e editar propostas de usina, um controle flutuante móvel e arrastável que abre o resumo financeiro atualizado em tempo real.

## Implementação
- Criar um componente compartilhado para o resumo flutuante, evitando diferenças entre criação e edição.
- Exibir o controle somente em telas móveis, mantendo o resumo lateral atual no desktop e oagia resumo completo no final da tela.
- Permitir arrastar o controle pela tela, com limites seguros para não sair da área visível.
- Ao tocar, abrir um painel inferior com: valor final, desconto, valor do sistema, economia mensal e payback.
- Manter no resumo atual todos os botões existentes: salvar, visualizar, enviar e demais ações disponíveis em cada tela.
- Usar os cálculos já existentes, sem alterar preços, descontos, economia ou payback.

## Validação
- Testar criação e edição em 393×852.
- Confirmar arraste, abertura, fechamento e atualização instantânea dos valores.
- Confirmar que o controle não cobre campos essenciais nem interfere nos diálogos de visualização/PDF.
- Conferir que o desktop permanece inalterado.

## Detalhes técnicos
- React + Motion para o arraste.
- Painel inferior baseado nos componentes visuais existentes.
- Posicionamento com margem segura das bordas e da barra inferior do celular.
