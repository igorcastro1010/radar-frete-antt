# Skills e procedência

Instalação e uso em 26/10/2026. Nenhuma skill foi escolhida apenas por semelhança de nome.

## Find Skills

- Autor e origem: [vercel-labs/skills](https://github.com/vercel-labs/skills), diretório `skills/find-skills`.
- Instalada no usuário: `~/.codex/skills/find-skills`.
- O `SKILL.md` foi lido. O leaderboard skills.sh foi consultado; executado `npx skills find "web design" --owner vercel-labs`.
- Resultado relevante: `vercel-labs/agent-skills@web-design-guidelines`, cerca de 784,7 mil instalações no momento da consulta. Procedência conferida no repositório oficial da Vercel antes de instalar.

Instalação compatível com Codex, usando o instalador de skills do próprio Codex:

```powershell
python ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py --repo vercel-labs/skills --path skills/find-skills
python ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py --repo vercel-labs/agent-skills --path skills/web-design-guidelines
```

## UI/UX Pro Max

- Autor e origem: [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill).
- Repositório do autor verificado; revisão consultada: `28b3b8dee8c976df4fa3e94aed4e092ad43fcb03`.
- Instalador indicado pelo README atual do autor: `ui-ux-pro-max-cli`, comando `uipro`. O pacote antigo `uipro-cli` é identificado pelo autor como desatualizado.
- Instalada neste projeto em `.agents/skills/ui-ux-pro-max`, compatível com Codex. Arquivos locais da skill são ignorados pelo Git e não entram no deploy. Após a instalação, o novo catálogo de skills é reconhecido em turnos seguintes; nesta execução o `SKILL.md` foi lido diretamente.

```powershell
npx ui-ux-pro-max-cli init --ai codex
python .agents/skills/ui-ux-pro-max/scripts/search.py "logistics monitoring dashboard" --design-system -p "Radar Frete ANTT" --density 8 -f markdown
python .agents/skills/ui-ux-pro-max/scripts/search.py "data table light minimal" --domain style -n 2
```

A busca inicial retornou Glassmorphism, incompatível com a orientação explícita do usuário. A consulta refinada retornou **Minimalism & Swiss Style**, apropriada a ferramentas profissionais: fundo claro, sem gradientes, divisórias e dados tabulares. Adotados verde petróleo, grafite, tipografia IBM Plex Sans, cores semânticas, foco visível e navegação simples. O checklist final foi lido na cópia do repositório do autor, pois o instalador não trouxe `references/pro-rules.md` ao diretório gerado.

## Outras skills aplicadas

- **Web Design Guidelines**, `vercel-labs/agent-skills`: regras atuais obtidas da [fonte mantida pela Vercel](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md), revisão das telas, acessibilidade e formulários.
- **Superpowers**: using-superpowers, brainstorming, writing-plans, executing-plans, test-driven-development, systematic-debugging, requesting-code-review e verification-before-completion. O usuário forneceu especificação detalhada e pediu execução até publicação; decisões foram documentadas sem exigir outra rodada de aprovações.
- **Vercel Deployments & CI/CD** e **React Best Practices**, disponibilizadas pelo plugin Vercel neste ambiente.

Uma revisão independente encontrou dois pontos importantes (validação integral do anexo e evidência da quarentena); ambos receberam testes de regressão e correção. As skills instaladas estão prontas para sessões posteriores, conforme o mecanismo de descoberta do Codex.
