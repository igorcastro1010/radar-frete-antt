# Radar Frete ANTT — decisões de implementação

Especificação: requisitos completos fornecidos pelo usuário em 26/10/2026. Execução completa, commits, push e publicação expressamente autorizados.

Next.js/TypeScript segue o projeto recente fortalaka-racha. Público, sem autenticação de usuários. Coleta e credenciais apenas no servidor. Vercel Hobby com armazenamento Blob privado exclusivo; versões e evidências imutáveis e estado operacional com escrita condicional por ETag. Nenhum segredo de outros projetos será reutilizado.

Agendamento preferencial: GitHub Actions a cada 15 minutos, sujeito a filas e suspensão do GitHub, sem garantia de latência. Vercel Hobby não permite cron de 15 minutos. A interface lê apenas estado persistido, informa atraso e distingue fonte indisponível de ausência de alterações.

Extração restrita a fontes oficiais verificadas. Norma e coeficientes devem validar integralmente antes de ativação. Descobertas ambíguas ficam em análise e preservam a última tabela. Primeira carga é base inicial, nunca reajuste. Vigência futura não substitui tabela atual. Metodologia/retificação exigem classificação própria. O simulador só será liberado para escopos comparados com a calculadora oficial.

Interface: fundo claro, grafite e verde petróleo, indicadores com rótulos textuais, navegação Visão geral/Tabela/Histórico/Simulador, tabelas com filtros e exportação. UI/UX Pro Max consultada; glassmorphism sugerido na primeira busca foi rejeitado por conflito explícito com a especificação. Refinar com busca de tabelas minimalistas.

Alternativas: Supabase segue padrões anteriores mas requer provisionamento/credenciais novos; Blob privado cabe na infraestrutura autenticada e oferece CAS. Cron Vercel diário não atende a frequência solicitada; Actions é alternativa gratuita sem garantia de pontualidade.
