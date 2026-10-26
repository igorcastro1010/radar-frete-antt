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

Pendente de anexar a evidência final da implantação, CI e agendamento. Consulte também o painel e os workflows para o estado mais recente, pois este relatório é um registro pontual.

## Auditoria de dependências

A versão inicial usada como referência dos projetos existentes (Next.js 16.3.8) apresentou avisos de segurança na auditoria. A implantação preliminar foi removida sem promoção. O projeto foi atualizado para Next.js 16.4.3, eslint-config-next correspondente e Zod transitivo 4.6.7 por override de versão da mesma major. `npm audit --omit=dev` e a instalação completa retornaram zero vulnerabilidades. Lint, tipos, 23 testes e build passaram novamente na versão corrigida antes da publicação final.
