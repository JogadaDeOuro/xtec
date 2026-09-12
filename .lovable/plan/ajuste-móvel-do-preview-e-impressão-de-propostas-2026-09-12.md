# Ajuste móvel do preview e impressão de propostas

## Objetivo
Preservar o documento A4 e sua identidade visual, melhorando apenas sua apresentação e seus controles em telas pequenas.

## Alterações
1. Transformar a pré-visualização da proposta em tela cheia no celular, com cabeçalho e ações organizados sem cortes.
2. Calcular automaticamente a escala da folha A4 conforme a largura disponível, mantendo proporção e centralização.
3. Manter “Tamanho real” apenas onde houver espaço; no celular, oferecer visualização ajustada como padrão e rolagem segura quando necessário.
4. Melhorar a área de carregamento do PDF para respeitar a altura do aparelho e comunicar claramente o progresso.
5. Ajustar a lista de propostas no celular para evitar textos e ações apertados.
6. Aplicar o mesmo princípio de encaixe ao preview de contratos, sem alterar o conteúdo impresso.
7. Validar em 393×852 e desktop, incluindo abertura do preview, rolagem, botões e ausência de cortes horizontais.

## Detalhes técnicos
- O conteúdo continuará com dimensões reais de 210×297 mm; somente a camada de visualização será escalada.
- A impressão e o PDF server-side continuarão usando o documento A4 sem escala visual.
- As mudanças ficarão restritas à interface e ao preview; cálculos e dados das propostas não serão alterados.
