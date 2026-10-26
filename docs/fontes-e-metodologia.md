# Fontes, validação e metodologia

Pesquisa feita em 26/10/2026. Todos os horários do produto usam America/Fortaleza.

## Endereços efetivamente verificados

- [Política Nacional de Pisos Mínimos de Frete](https://www.gov.br/antt/pt-br/assuntos/cargas/politica-nacional-de-pisos-minimos-de-frete).
- [Etapas de implementação e atos](https://www.gov.br/antt/pt-br/assuntos/cargas/politica-nacional-de-pisos-minimos-de-frete/etapas-de-implementacao).
- [Ementário ANTTlegis](https://anttlegis.antt.gov.br/action/ActionDatalegis.php?acao=abrirResenhaAnoAto&cod_menu=7817&cod_modulo=161).
- [Resolução nº 5.867/2020 consolidada](https://anttlegis.antt.gov.br/action/UrlPublicasAction.php?acao=abrirAtoPublico&num_ato=00005867&sgl_tipo=RES&sgl_orgao=DG/ANTT/MI&vlr_ano=2020&seq_ato=000&cod_modulo=623&cod_menu=9230).
- [Resolução ANTT nº 6.084/2026 e anexo](https://anttlegis.antt.gov.br/action/UrlPublicasAction.php?acao=abrirAtoPublico&num_ato=00006084&sgl_tipo=RES&sgl_orgao=DG/ANTT/MT&vlr_ano=2026&seq_ato=000&cod_modulo=623&cod_menu=9230).
- [Portaria SUROC nº 22/2026 e anexo](https://anttlegis.antt.gov.br/action/UrlPublicasAction.php?acao=abrirAtoPublico&num_ato=00000022&sgl_tipo=POR&sgl_orgao=SUROC/ANTT/MT&vlr_ano=2026&seq_ato=000&cod_modulo=623&cod_menu=9230).
- [Calculadora oficial](https://calculadorafrete.antt.gov.br/).
- [DOU de 29/09/2026, edição extra A, página 1](https://pesquisa.in.gov.br/imprensa/jsp/visualiza/index.jsp?data=29%2F09%2F2026&jornal=600&pagina=1&totalArquivos=3): referência encontrada em notícia oficial da ANTT; acesso automatizado retornou 502, portanto não há coletor direto integrado.

Os endereços ANTTlegis são páginas públicas observadas nos links oficiais, não APIs supostas. O portal gov.br carrega conteúdo de abas por subpáginas; coletar apenas a página principal não revela os atos. O extrator consulta a subpágina de etapas e o ementário.

## Critérios de confiança

1. Identificador normativo e referência de publicação no DOU obrigatórios.
2. Cláusula de vigência reconhecida; datas ambíguas entram em análise.
3. Cabeçalhos A/B/C/D e eixos 2/3/4/5/6/7/9 validados.
4. Conjunto de categorias e aplicabilidade igual ao anexo revisado em `verified-schema.json`.
5. CCD/CC devem formar pares, com decimais válidos e valores positivos. Células vazias não viram zero.
6. HTML, conteúdo normativo normalizado e coeficientes têm hashes distintos.
7. A cópia idêntica da Tabela D no HTML atual do ANTTlegis é deduplicada. Cópias divergentes bloqueiam a extração.
8. Texto de um ato já registrado que mudou, retificações, novas resoluções fora do escopo conhecido ou metodologia divergente ficam em análise.
9. A vigência futura é persistida, mas a seleção vigente só ocorre à meia-noite UTC−3 da data declarada.

O schema propositalmente conservador bloqueia uma categoria adicionada/removida no coletor até revisão humana no código. O módulo de comparação já trata adições, remoções e incompatibilidade de metodologia sem gerar percentuais indevidos.

Datas verificadas: Resolução 6.084/2026, DOU 17/07/2026, vigência na publicação; Portaria 22/2026, DOU 29/09/2026, vigência no dia seguinte, 30/09/2026. A data da assinatura da Portaria (28/09) não é confundida com publicação ou vigência.

## Cálculo implementado

Art. 5º da Resolução 5.867 consolidada, com redação da Resolução 6.076/2026:

`Piso = distância de ida × CCD + CC`

Tabelas A/B/C/D são selecionadas conforme composição completa ou apenas unidade de tração e enquadramento em alto desempenho. O simulador exige confirmação do enquadramento. Eixos fora das opções apresentadas devem ser conferidos na ferramenta oficial: este produto não tenta substituir a regra de aproximação de eixos não listados.

Retorno vazio obrigatório para contêineres e frotas específicas/dedicadas/fidelizadas por exigências sanitárias/certificação, conforme arts. 3º §4º e 5º §6º:

`Retorno = 0,92 × distância de retorno contratada × CCD`

Os componentes não são arredondados antes de formar o total; arredondamento decimal ao centavo no resultado. A soma dos componentes exibidos arredondados pode diferir em R$ 0,01 do total, como na ferramenta oficial.

Exemplos reais verificados: Carga Geral, 6 eixos, quatro tabelas; ida de 100 km sem retorno e ida/retorno de 731 km. Tabela A: 100 km = R$ 1.425,40; 731 km com retorno = R$ 11.247,03. O registro em `research/calculator-validation.json` identifica data, versão, hash de coeficientes e oito validações.

O formulário oficial usa uma sessão e um token antifalsificação próprios, obtidos do GET inicial. O sistema envia as mesmas opções do formulário público; não acessa APIs internas inventadas. Uma divergência ou indisponibilidade deixa a simulação desabilitada para aquela versão. A validação posterior é um registro separado e não altera o arquivo histórico imutável.

Valores fora do piso: lucro, pedágios, tributos, taxas, administração, movimentações complementares e demais itens não abrangidos pelo anexo. O pedágio deve ser acrescido conforme as regras oficiais. Em cargas distintas, aplica-se a carga de maior valor no documento fiscal conforme a norma.
