# Evidências de implantação

Este documento é atualizado ao terminar a publicação. Configuração de infraestrutura ou agenda, isoladamente, não equivale a operação observada.

## Evidências já obtidas no desenvolvimento

- Conta GitHub autenticada: `igorcastro1010`, conferida pelo conector e pelo Git Credential Manager.
- Repositórios públicos recentes inspecionados: `fortalaka-racha`, `controle-de-placas-carregamento`, `vestlink`, com scripts, READMEs e commits.
- Plano Vercel Hobby conferido no conector autenticado.
- Store privado criado pela CLI autenticada após o conector retornar 403; conexão via OIDC testada.
- Primeira coleta real em 26/10/2026 às 11:42 de Fortaleza preservou duas versões. Sua validação de calculadora falhou por diferença de arredondamento e foi registrada como parcial.
- Após teste de regressão e correção, oito comparações oficiais passaram às 11:44. Validação foi registrada separadamente, preservando os arquivos históricos.
- Consulta completa de liberação executada às 11:56 de Fortaleza, com cinco fontes/extrações bem-sucedidas, nenhuma nova versão e nenhuma quarentena.

## Publicação e execução automática

- Produção publicada em [radar-frete-antt.vercel.app](https://radar-frete-antt.vercel.app).
- Implantação `dpl_H5NfkQjtBhQiv7TPJc8eQy6q2sB4`, status READY, Next.js 16.4.3, região das funções `gru1`, commit de aplicação `c18830c384e602c8269d3693d60fe1cf5073b203`.
- A mesma implantação foi testada antes da promoção e o domínio canônico foi conferido pelo conector Vercel, vinculado ao projeto novo.
- [CI da aplicação aprovado](https://github.com/igorcastro1010/radar-frete-antt/actions/runs/40346914506): lint, tipos, 23 testes e build.
- Oito testes Playwright passaram contra o endereço canônico: filtros, comparação, download CSV, simulador, quatro telas em 360/390/430/1440 px, teclado, movimento reduzido e preservação dos dados exibidos quando a API falha. Nenhum overflow horizontal ou erro de execução do navegador nos cenários normais.
- `/api/state` confirmou conexão com o Blob privado: duas versões, 272 combinações na versão atual, oito validações oficiais do simulador.
- `POST /api/sync` sem autenticação: 401. `POST /api/check` com origem externa: 403. Origem correta dentro do intervalo: 429. Chamada autenticada com segredo exclusivo: reconhecida e limitada pelo cooldown.
- Varredura de logs de produção entre 11h44 e 12h14 de Fortaleza: zero registros de erro retornados.
- Workflow horário `Monitoramento ANTT` confirmado como `active` na branch padrão `main`. Até a consulta de 12h26 de Fortaleza, não havia execução de evento `schedule` observada para a janela de 12h17. O painel mantém `lastAutomatic` vazio.
- Um [disparo manual de diagnóstico](https://github.com/igorcastro1010/radar-frete-antt/actions/runs/40348518714), criado às 12h21, permanecia em `queued`, sem jobs iniciados, às 12h26. Isso não é execução automática comprovada. O status público de Actions estava operacional; não foi inferida uma indisponibilidade global.
- **Pendência externa:** observar a primeira execução agendada completa. A configuração e as credenciais foram verificadas; a execução do agendador não foi declarada concluída sem evidência.

Consulte também o painel e os workflows para o estado mais recente, pois este relatório é um registro pontual.

## Auditoria de dependências

A versão inicial usada como referência dos projetos existentes (Next.js 16.3.8) apresentou avisos de segurança na auditoria. A implantação preliminar foi removida sem promoção. O projeto foi atualizado para Next.js 16.4.3, eslint-config-next correspondente e Zod transitivo 4.6.7 por override de versão da mesma major. `npm audit --omit=dev` e a instalação completa retornaram zero vulnerabilidades. Lint, tipos, 23 testes e build passaram novamente na versão corrigida antes da publicação final.
