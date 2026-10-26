# Operação, segredos e manutenção

## Infraestrutura exclusiva

- Repositório: `igorcastro1010/radar-frete-antt`.
- Projeto Vercel: `radar-frete-antt`, equipe `igorcastro1010-8396s-projects`, plano Hobby.
- Região das funções e Blob: `gru1`.
- Store privado: `radar-frete-antt`, `store_u7p6mKs18R6UlgBO`.
- Autorização de armazenamento na Vercel via OIDC, sem reaproveitar credenciais de outros projetos.
- `CRON_SECRET` novo e exclusivo, configurado como segredo na Vercel e em GitHub Actions. Não aparece no frontend nem no Git.

Variáveis: consulte `.env.example`. `APP_ORIGIN` controla a origem permitida para a ação pública manual. `SCHEDULER_MODE=github-actions` informa que a agenda está configurada; somente o registro de execução agendada comprova uma consulta automática.

## Implantar ou atualizar

1. `npm ci`, lint, tipos, testes e build.
2. Faça commit e push à branch `main` do repositório novo.
3. Com a CLI autenticada na equipe correta, vincule o projeto e conecte seu store privado.
4. Configure os segredos exclusivos. `scripts/provision.ps1` é um helper de configuração inicial local, não um passo de CI; não o execute novamente sem planejar a rotação do segredo em ambos os lados.
5. Publique uma implantação de produção sem atribuir domínio, verifique-a e promova a mesma implantação.
6. Confira `/api/state`, o painel e a última execução do workflow.

O workflow de monitoramento usa `POST /api/sync` com Bearer. Sem segredo, retorna 401. A ação manual `POST /api/check` exige origem igual à configurada, intervalo global mínimo de 55 minutos e o mesmo controle de concorrência. Uma nova coleta nunca é acionada só por abrir a página.

## Frequência e orçamento

- Agenda: `17 * * * *` no GitHub Actions. Uma execução por hora solicitada, sem garantia de pontualidade ou entrega.
- O GitHub pode desativar agendas em repositórios públicos sem atividade por 60 dias. Verifique periodicamente a aba Actions e o indicador de atraso no painel.
- Cooldown compartilhado pode pular uma janela quando uma consulta manual acabou de ocorrer. Após um sucesso, atrasos superiores a 90 minutos ficam destacados.
- Blob Hobby: 2.000 operações avançadas, 10.000 operações simples, 1 GB de armazenamento e 10 GB de transferência incluídos, conforme consulta de 26/10/2026. O uso da conta pode ser compartilhado; não há promessa de capacidade ilimitada.
- Estado: duas escritas por sincronização (lease + conclusão). Versões/evidências só geram novos uploads quando inéditas. O cache da API reduz leituras. O orçamento não garante acomodar tráfego arbitrário, e cotas podem exigir redução de frequência ou nova infraestrutura autorizada.

[Cron Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing) · [Blob e cotas](https://vercel.com/docs/vercel-blob/usage-and-pricing) · [Agendamento GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

## Modelo de persistência

`radar/state-v1.json`: manifesto das versões, quarentena, validações, execuções, tempos operacionais e lease. Escrita com `ifMatch`/ETag. O lease dura quatro minutos; o coletor tem orçamento total de 170 segundos, timeout de 12 segundos por tentativa e duas tentativas com espera progressiva. Concorrência no workflow e fencing no armazenamento impedem sobreposição mesmo entre visitantes e agenda.

`radar/versions/<id>.json`: versão normativa imutável.

`radar/evidence/<sha256>.html`: evidência imutável, incluindo o HTML original dos atos e das publicações em análise. O manifesto referencia o hash; o arquivo preserva o texto mesmo se a fonte mudar.

`radar/validations/<id>.json`: evidência complementar da validação inicial executada na implantação; novas validações também ficam no manifesto em `validations` e na versão quando disponíveis antes de sua promoção.

O ETag de leitura privada pode chegar com prefixo `W/` por compressão. O repositório conserva a mesma revisão opaca em sua representação forte ao enviar a condição, conferida contra o ETag de origem. Há teste específico para esse comportamento observado na integração real.

Não há filesystem temporário como banco. `localStorage` guarda somente o identificador da última versão vista naquele navegador; não contém dados normativos ou credenciais.

## Investigar falhas

1. Confira data, tipo de execução e fonte que falhou no Histórico e no painel.
2. Em Actions → Monitoramento ANTT, veja se houve execução, atraso, cooldown, falha HTTP ou agenda desativada. Disparo por `workflow_dispatch` é manual e não preenche “última execução automática”.
3. Em Vercel, procure o evento JSON `sync`, seu ID, `status`, `trigger`, `added` e `pending`. Erros completos ficam no log servidor, sem segredos.
4. Verifique se o Blob ainda está disponível e dentro da cota. Se a leitura falhar, a UI mantém a última resposta já exibida e mostra erro; um visitante novo não recebe valores fabricados.
5. Fonte indisponível não vira “sem alterações”. A coleta completa só atualiza `lastSuccess` quando todas as fontes consultadas naquela execução passam.
6. Em falha de arquivamento, nenhuma versão é promovida. Se o próprio estado não puder ser salvo, o lease expira; os logs de infraestrutura continuam necessários.

## Atualizar extratores e revisar quarentena

1. Abra o ato oficial, confirme identidade, data do DOU, vigência e metodologia, e recupere o HTML preservado no Blob usando credenciais do store.
2. Salve uma fixture real em `docs/research` com origem/data documentadas; não publique segredos ou cookies de sessão.
3. Escreva primeiro um teste que reproduza a mudança; confirme a falha.
4. Ajuste a extração. Uma mudança legítima de categorias/eixos exige atualizar `verified-schema.json` após revisar o conjunto completo. Mudança de regras exige novo identificador de metodologia, novos cálculos/testes e revisão de `verified-method.json`.
5. Valide exemplos novamente no formulário oficial antes de habilitar simulação.
6. Faça commit, execute as verificações e publique. Não edite os coeficientes de arquivos históricos. Resolver uma quarentena requer manutenção técnica restrita, não uma área administrativa pública.

O sistema é conservador: quarentenas permanecem visíveis até uma revisão técnica documentada. Não há endpoint público para limpá-las ou promover valores manualmente.
