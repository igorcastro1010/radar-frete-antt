"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, useRef } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Bell,
  Check,
  CircleHelp,
  Clock3,
  ExternalLink,
  FileText,
  History,
  LayoutDashboard,
  ListFilter,
  Radar as RadarIcon,
  RefreshCw,
  ShieldCheck,
  Table2,
  Calculator,
  TriangleAlert,
  X,
} from "lucide-react";
import type { PublicSnapshot } from "@/lib/public-state";
import {
  currentVersion,
  compareVersions,
  filterRows,
  formatDate,
  money,
  number,
  toCsv,
  actName,
} from "@/lib/domain";
import { TABLE_LABELS, type Table, type Version } from "@/lib/model";
import { calculate } from "@/lib/calculation";
import { DOU_URL, INDEX_URL, METHOD_URL } from "@/lib/sources";

const navigation = [
  { href: "/", id: "visao-geral", label: "Visão geral", icon: LayoutDashboard },
  { href: "/tabela", id: "tabela", label: "Tabela", icon: Table2 },
  { href: "/historico", id: "historico", label: "Histórico", icon: History },
  { href: "/simulador", id: "simulador", label: "Simulador", icon: Calculator },
];
const kindLabel = {
  baseline: "Versão inicial verificada",
  increase: "Aumento confirmado",
  decrease: "Redução confirmada",
  mixed: "Alterações por categoria",
  publication: "Publicação sem alteração de coeficientes",
  methodology: "Mudança de metodologia",
  rectification: "Retificação",
};
function OfficialLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className="official-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ExternalLink size={13} aria-hidden="true" />
    </a>
  );
}

export function Radar({ view }: { view: string }) {
  const [data, setData] = useState<PublicSnapshot | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [checking, setChecking] = useState(false),
    [unseen, setUnseen] = useState(false),
    [now, setNow] = useState(0);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/state", {
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok)
        throw Error(
          "Não foi possível ler os dados persistidos. A última tabela disponível foi mantida.",
        );
      setData(await res.json());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar dados");
    } finally {
      setLoading(false);
      setNow(Date.now());
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(load, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60000);
    const visible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [load]);
  const current = data
    ? currentVersion(data.versions, new Date(now))
    : undefined;
  const notified = useRef("");
  useEffect(() => {
    if (!current) return;
    const task = setTimeout(() => {
      try {
        const seen = localStorage.getItem("radar-last-seen");
        if (!seen) {
          localStorage.setItem("radar-last-seen", current.id);
          return;
        }
        if (seen !== current.id) {
          setUnseen(true);
          if (
            notified.current !== current.id &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("Radar Frete ANTT", {
              body: `Tabela validada: ${actName(current)}. Consulte os coeficientes por categoria.`,
              tag: current.id,
            });
            notified.current = current.id;
          }
        }
      } catch {
        /* Browsers may disable local persistence; regulatory data is server-side. */
      }
    }, 0);
    return () => clearTimeout(task);
  }, [current]);
  async function check() {
    setChecking(true);
    setMessage("");
    try {
      const r = await fetch("/api/check", {
        method: "POST",
        signal: AbortSignal.timeout(240000),
      });
      const out = await r.json();
      if (out.snapshot) setData(out.snapshot);
      setMessage(
        out.error ||
          (out.status === "completed"
            ? out.run.status === "success"
              ? "Consulta concluída. Dados persistidos atualizados."
              : "Consulta com falha parcial. Consulte as fontes e os últimos dados válidos."
            : "Outra consulta central está em andamento."),
      );
      if (r.ok) void load();
    } catch {
      setMessage(
        "Consulta interrompida. Aguarde e confira o registro no histórico.",
      );
    } finally {
      setChecking(false);
    }
  }
  async function notify() {
    if (!("Notification" in window)) {
      setMessage(
        "Este navegador não oferece notificações. Os avisos continuam disponíveis no painel.",
      );
      return;
    }
    const permission = await Notification.requestPermission();
    setMessage(
      permission === "granted"
        ? "Notificações ativadas enquanto o site estiver aberto. Não há envio em segundo plano com o navegador fechado."
        : "Notificações não autorizadas. Os avisos permanecem no painel.",
    );
  }
  const run = data?.runs[0];
  const delayed = Boolean(
    run &&
      (run.status !== "success" ||
        !data?.lastSuccess ||
        now - Date.parse(data.lastSuccess) > 90 * 60000),
  );
  const health = error
    ? "Dados indisponíveis"
    : !data?.runs.length
      ? "Aguardando primeira coleta"
      : delayed
        ? "Verificação requer atenção"
        : !data?.lastAutomatic
          ? "Coleta validada · agenda não observada"
          : "Monitoramento em operação";
  const subtitle =
    navigation.find((n) => n.id === view)?.label || "Visão geral";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Radar Frete ANTT, início">
          <span className="brand-symbol">
            <RadarIcon size={27} aria-hidden="true" />
          </span>
          <span>
            Radar Frete<small>ANTT · MONITOR REGULATÓRIO</small>
          </span>
        </Link>
        <span className="nav-label">ACOMPANHAMENTO</span>
        <nav aria-label="Navegação principal">
          {navigation.map(({ href, id, label, icon: Icon }) => (
            <Link
              key={id}
              href={href}
              aria-current={view === id ? "page" : undefined}
              className={view === id ? "active" : ""}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
              {view === id && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <ShieldCheck size={19} aria-hidden="true" />
            <strong>Informação com origem</strong>
            <p>Coeficientes vinculados à publicação normativa oficial.</p>
          </div>
          <OfficialLink href={INDEX_URL}>Portal da ANTT</OfficialLink>
          <span className="independent">
            Ferramenta independente.
            <br />
            Sem vínculo institucional com a ANTT.
          </span>
          <span className="version-tag">
            RADAR FRETE ANTT <b>v1.0</b>
          </span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Monitor de frete <span>/</span> <strong>{subtitle}</strong>
          </div>
          <span className="topbar-note">
            <ShieldCheck size={14} aria-hidden="true" /> Dados de fontes
            oficiais
          </span>
        </header>
        <main id="conteudo" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                POLÍTICA NACIONAL DE PISOS MÍNIMOS
              </span>
              <h1>
                {view === "visao-geral"
                  ? "Pisos mínimos de frete"
                  : view === "tabela"
                    ? "Tabela e comparação"
                    : view === "historico"
                      ? "Histórico de publicações"
                      : "Simulador de impacto"}
              </h1>
              <p>
                {view === "visao-geral"
                  ? "Acompanhe a tabela, entenda as mudanças e consulte a origem dos dados."
                  : view === "tabela"
                    ? "Coeficientes oficiais, item a item. Compare versões e exporte sua consulta."
                    : view === "historico"
                      ? "Publicação, vigência e detecção: cada evento com sua evidência."
                      : "Compare o piso entre versões com a metodologia verificada da ANTT."}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="button secondary notification-button"
                onClick={notify}
              >
                <Bell size={16} aria-hidden="true" />
                Alertas
              </button>
              <button
                className="button primary"
                disabled={checking || loading}
                onClick={check}
              >
                <RefreshCw
                  size={16}
                  className={checking ? "spin" : ""}
                  aria-hidden="true"
                />
                {checking ? "Verificando…" : "Verificar agora"}
              </button>
            </div>
          </div>
          <div
            className={`health-bar ${delayed || error ? "health-warning" : ""}`}
          >
            <span className="health-label">
              <span className="status-dot" />
              {health}
            </span>
            <span>
              Consulta horária <span className="separator">·</span> Horários de
              Fortaleza (UTC−3)
            </span>
          </div>
          {message && (
            <div className="feedback" role="status">
              <span>{message}</span>
              <button
                onClick={() => setMessage("")}
                aria-label="Fechar mensagem"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {error && (
            <div className="notice danger" role="alert">
              <TriangleAlert size={19} aria-hidden="true" />
              <div>
                <strong>Não foi possível atualizar o painel</strong>
                <p>{error}</p>
                <button className="text-button" onClick={load}>
                  Tentar carregar novamente
                </button>
              </div>
            </div>
          )}
          {unseen && current && (
            <div className="notice">
              <Bell size={19} aria-hidden="true" />
              <div>
                <strong>
                  Há uma versão que você ainda não viu neste navegador
                </strong>
                <p>{actName(current)}. Confira as alterações por categoria.</p>
              </div>
              <button
                className="button secondary"
                onClick={() => {
                  try {
                    localStorage.setItem("radar-last-seen", current.id);
                  } catch {}
                  setUnseen(false);
                }}
              >
                Marcar como vista
              </button>
            </div>
          )}
          {!!data?.pending.length && (
            <div className="notice warning">
              <TriangleAlert size={20} aria-hidden="true" />
              <div>
                <strong>Nova publicação em análise</strong>
                <p>
                  {data.pending.length} registro(s) precisam de revisão. A
                  última tabela validada foi preservada.
                </p>
                <Link href="/historico">
                  Ver publicações em análise{" "}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}
          {loading && !data ? (
            <div className="loading-state" role="status">
              <RefreshCw size={22} className="spin" aria-hidden="true" />
              Carregando dados persistidos…
            </div>
          ) : !current ? (
            <div className="empty-state">
              <FileText size={32} aria-hidden="true" />
              <h2>Nenhuma tabela validada disponível</h2>
              <p>
                A primeira coleta precisa confirmar a publicação, o anexo e a
                metodologia. Nenhum valor demonstrativo é exibido.
              </p>
              <button className="button secondary" onClick={load}>
                Atualizar painel
              </button>
            </div>
          ) : (
            data && (
              <>
                {view === "visao-geral" && (
                  <Overview
                    data={data}
                    current={current}
                    delayed={delayed}
                    now={now}
                  />
                )}
                {view === "tabela" && (
                  <Coefficients versions={data.versions} current={current} />
                )}
                {view === "historico" && (
                  <Timeline data={data} current={current} />
                )}
                {view === "simulador" && (
                  <Simulator data={data} current={current} />
                )}
              </>
            )
          )}
          <footer className="page-footer">
            <span>
              Radar Frete ANTT <span className="separator">·</span>{" "}
              Monitoramento independente
            </span>
            <span>
              Base normativa verificável. Não substitui a consulta ao ato
              oficial.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function Overview({
  data,
  current,
  delayed,
  now,
}: {
  data: PublicSnapshot;
  current: Version;
  delayed: boolean;
  now: number;
}) {
  const prior = data.versions
    .filter((v) => v.effectiveAt < current.effectiveAt)
    .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))[0];
  const difference = prior ? compareVersions(prior, current) : [];
  const changed = difference.filter(
    (r) => r.ccd.delta !== 0 || r.cc.delta !== 0,
  );
  const next = new Date(now);
  next.setUTCMinutes(17, 0, 0);
  if (next.getTime() <= now) next.setUTCHours(next.getUTCHours() + 1);
  const preview = current.rows
    .filter((r) => r.table === "A" && r.axles === 6)
    .slice(0, 6);
  return (
    <>
      <section className="current-panel" aria-labelledby="current-title">
        <div className="current-main">
          <div className="panel-kicker">
            <span className="badge success">TABELA VIGENTE VALIDADA</span>
            <span className="muted">
              4 tabelas oficiais · {current.rows.length} combinações
            </span>
          </div>
          <h2 id="current-title">
            {actName(current)
              .replace("PORTARIA SUROC Nº", "Portaria SUROC nº")
              .replace("RESOLUÇÃO ANTT Nº", "Resolução ANTT nº")}
          </h2>
          <p>Coeficientes de deslocamento (CCD) e de carga e descarga (CC).</p>
          <OfficialLink href={current.sourceUrl}>
            Consultar ato e anexo oficial
          </OfficialLink>
        </div>
        <dl className="current-dates">
          <div>
            <dt>Publicação no DOU</dt>
            <dd>{formatDate(current.publishedAt)}</dd>
          </div>
          <div>
            <dt>Em vigor desde</dt>
            <dd>{formatDate(current.effectiveAt)}</dd>
          </div>
        </dl>
        <div className="current-foot">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>
            {delayed
              ? "Última versão validada preservada. Há pendências na verificação das fontes."
              : "Versão extraída do anexo normativo e validada antes de ser registrada."}
          </span>
        </div>
      </section>
      <div className="metrics-strip">
        <div>
          <span className="metric-label">
            <Activity size={15} aria-hidden="true" />
            Última alteração verificada
          </span>
          <strong>
            {prior ? kindLabel[current.kind] : "Base inicial registrada"}
          </strong>
          <span>
            {prior
              ? `${changed.length} combinações alteradas · comparação disponível`
              : "Sem versão anterior verificada"}
          </span>
        </div>
        <div>
          <span className="metric-label">
            <Check size={15} aria-hidden="true" />
            Última consulta completa
          </span>
          <strong>{formatDate(data.lastSuccess, true)}</strong>
          <span>
            {data.lastSuccess
              ? "Todas as fontes da execução responderam"
              : "Confira o resultado parcial nas fontes"}
          </span>
        </div>
        <div>
          <span className="metric-label">
            <Clock3 size={15} aria-hidden="true" />
            Próxima janela de consulta
          </span>
          <strong>
            {data.schedule.configured
              ? formatDate(next.toISOString(), true)
              : "Agendamento não configurado"}
          </strong>
          <span>
            {data.schedule.configured
              ? "Estimativa · sujeita à fila do GitHub"
              : "A coleta manual continua disponível"}
          </span>
        </div>
      </div>
      <div className="overview-grid">
        <section className="section-panel">
          <div className="section-heading">
            <div>
              <h2>Coeficientes em vigor</h2>
              <p>Tabela A · 6 eixos · seleção de categorias</p>
            </div>
            <Link className="small-link" href="/tabela">
              Abrir tabela <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <div
            className="table-scroll"
            tabIndex={0}
            aria-label="Coeficientes em vigor, tabela com rolagem"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Tipo de carga</th>
                  <th scope="col" className="numeric">
                    CCD <small>R$/km</small>
                  </th>
                  <th scope="col" className="numeric">
                    CC <small>R$</small>
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.cargo}>
                    <td>{r.cargo}</td>
                    <td className="numeric">{number(r.ccd)}</td>
                    <td className="numeric">{number(r.cc, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-note">
            <CircleHelp size={14} aria-hidden="true" />
            CCD varia com a distância; CC é o componente de carga e descarga.
          </div>
        </section>
        <section className="section-panel recent-panel">
          <div className="section-heading">
            <div>
              <h2>Publicações verificadas</h2>
              <p>Cobertura desde 17/07/2026</p>
            </div>
            <History size={18} className="muted" aria-hidden="true" />
          </div>
          <div className="mini-timeline">
            {[...data.versions]
              .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))
              .slice(0, 3)
              .map((v) => (
                <div className="mini-event" key={v.id}>
                  <span className="timeline-point" />
                  <small>{formatDate(v.publishedAt)}</small>
                  <strong>{actName(v)}</strong>
                  <span>{kindLabel[v.kind]}</span>
                  <span>Vigência: {formatDate(v.effectiveAt)}</span>
                </div>
              ))}
          </div>
          <Link className="history-link" href="/historico">
            Ver histórico completo <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      </div>
      <Sources data={data} />
      <div className="explanation">
        <CircleHelp size={18} aria-hidden="true" />
        <p>
          <strong>O que este radar acompanha?</strong> Publicações normativas e
          seus anexos. Mudanças de página ou no preço do diesel, isoladamente,
          não geram um reajuste. Categorias podem ter percentuais diferentes.
        </p>
      </div>
    </>
  );
}

function Sources({ data }: { data: PublicSnapshot }) {
  const sources = data.runs[0]?.sources || [];
  return (
    <section className="section-panel source-panel">
      <div className="section-heading">
        <div>
          <h2>Fontes e integridade da coleta</h2>
          <p>Última tentativa: {formatDate(data.lastAttempt, true)}</p>
        </div>
        <span className="badge neutral">
          {sources.filter((s) => s.ok).length}/{sources.length} verificações
          concluídas
        </span>
      </div>
      <ul className="source-list">
        {sources.map((s, i) => (
          <li key={s.url + i}>
            <span className={`source-icon ${s.ok ? "ok" : "bad"}`}>
              {s.ok ? (
                <Check size={15} aria-hidden="true" />
              ) : (
                <TriangleAlert size={15} aria-hidden="true" />
              )}
            </span>
            <div>
              <OfficialLink href={s.url}>{s.name}</OfficialLink>
              <small>{s.ok ? "Conteúdo consultado e validado" : s.error}</small>
            </div>
            <span className={`source-state ${s.ok ? "ok" : "bad"}`}>
              {s.ok ? "Verificada" : "Falha na fonte"}
            </span>
          </li>
        ))}
      </ul>
      <div className="source-disclosure">
        <OfficialLink href={DOU_URL}>
          Edição do DOU · referência da Portaria 22/2026
        </OfficialLink>
        <p>
          Leitura automatizada direta do DOU indisponível na implantação. A
          íntegra normativa é coletada no ANTTlegis, com a referência de
          publicação. Cobertura de descoberta limitada ao índice da política e
          ao ementário do ANTTlegis.
        </p>
      </div>
      <div className="source-disclosure">
        <strong>
          Agendamento {data.lastAutomatic ? "observado" : "ainda não observado"}
        </strong>
        <p>
          {data.lastAutomatic
            ? `Última execução automática registrada: ${formatDate(data.lastAutomatic, true)}.`
            : "Configuração de agenda não comprova execução automática."}{" "}
          {data.schedule.note}
        </p>
      </div>
    </section>
  );
}

function Coefficients({
  versions,
  current,
}: {
  versions: Version[];
  current: Version;
}) {
  const sorted = [...versions].sort((a, b) =>
    b.effectiveAt.localeCompare(a.effectiveAt),
  );
  const [table, setTable] = useState("A"),
    [cargo, setCargo] = useState(""),
    [axles, setAxles] = useState(""),
    [target, setTarget] = useState(current.id),
    [before, setBefore] = useState(
      sorted.find((v) => v.id !== current.id)?.id || "",
    ),
    [comparing, setComparing] = useState(false);
  const selected = versions.find((v) => v.id === target) || current,
    old = versions.find((v) => v.id === before);
  const rows = filterRows(selected.rows, table, cargo, axles),
    diff = old
      ? compareVersions(old, selected).filter(
          (r) =>
            (!table || r.table === table) &&
            (!cargo || r.cargo === cargo) &&
            (!axles || r.axles === Number(axles)),
        )
      : [];
  const cargos = [
    ...new Set(versions.flatMap((v) => v.rows.map((r) => r.cargo))),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  function exportCsv() {
    const csv =
      comparing && old
        ? toCsv([
            [
              "Tabela",
              "Carga",
              "Eixos",
              "CCD anterior",
              "CCD novo",
              "Diferença CCD",
              "Variação CCD (%)",
              "CC anterior",
              "CC novo",
              "Diferença CC",
              "Variação CC (%)",
              "Situação",
              "Versão anterior",
              "Versão nova",
              "Fonte",
            ],
            ...diff.map((r) => [
              r.table,
              r.cargo,
              r.axles,
              r.ccd.before,
              r.ccd.after,
              r.ccd.delta,
              r.ccd.percent,
              r.cc.before,
              r.cc.after,
              r.cc.delta,
              r.cc.percent,
              r.status,
              actName(old),
              actName(selected),
              selected.sourceUrl,
            ]),
          ])
        : toCsv([
            [
              "Tabela",
              "Carga",
              "Eixos",
              "CCD (R$/km)",
              "CC (R$)",
              "Ato",
              "Vigência",
              "Fonte",
            ],
            ...rows.map((r) => [
              r.table,
              r.cargo,
              r.axles,
              r.ccd,
              r.cc,
              actName(selected),
              selected.effectiveAt,
              selected.sourceUrl,
            ]),
          ]);
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `radar-frete-${selected.effectiveAt}${comparing ? "-comparacao" : ""}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <section className="section-panel">
        <div className="section-heading">
          <div>
            <h2>Consulta de coeficientes</h2>
            <p>Somente combinações existentes nos anexos oficiais.</p>
          </div>
          <button className="button secondary" onClick={exportCsv}>
            <ArrowDownToLine size={16} aria-hidden="true" />
            Exportar CSV
          </button>
        </div>
        <div className="filter-panel">
          <label>
            Modalidade / tabela
            <select value={table} onChange={(e) => setTable(e.target.value)}>
              <option value="">Todas as tabelas</option>
              {Object.entries(TABLE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo de carga
            <select value={cargo} onChange={(e) => setCargo(e.target.value)}>
              <option value="">Todos os tipos</option>
              {cargos.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Quantidade de eixos
            <select value={axles} onChange={(e) => setAxles(e.target.value)}>
              <option value="">Todos os eixos</option>
              {[2, 3, 4, 5, 6, 7, 9].map((n) => (
                <option key={n} value={n}>
                  {n} eixos
                </option>
              ))}
            </select>
          </label>
          <label>
            Versão consultada
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              {sorted.map((v) => (
                <option key={v.id} value={v.id}>
                  {actName(v)} · {formatDate(v.effectiveAt)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="compare-bar">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={comparing}
              onChange={(e) => setComparing(e.target.checked)}
            />
            Comparar com outra versão
          </label>
          {comparing && (
            <label>
              Versão anterior
              <select
                value={before}
                onChange={(e) => setBefore(e.target.value)}
              >
                <option value="">Selecione uma versão</option>
                {sorted.map((v) => (
                  <option key={v.id} value={v.id}>
                    {actName(v)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <span className="muted result-count">
            <ListFilter size={14} aria-hidden="true" />
            {comparing ? diff.length : rows.length} itens
          </span>
        </div>
        <div
          className="table-scroll full-table"
          tabIndex={0}
          aria-label="Tabela de coeficientes com rolagem horizontal"
        >
          <table>
            <caption>
              {actName(selected)} · Vigência {formatDate(selected.effectiveAt)}.{" "}
              {comparing
                ? "Comparação por coeficiente."
                : "CCD em reais por quilômetro; CC em reais."}
            </caption>
            <thead>
              <tr>
                <th scope="col">Carga / tabela</th>
                <th scope="col" className="numeric">
                  Eixos
                </th>
                {comparing ? (
                  <>
                    <th scope="col" className="numeric">
                      CCD anterior
                    </th>
                    <th scope="col" className="numeric">
                      CCD novo
                    </th>
                    <th scope="col" className="numeric">
                      Δ CCD / %
                    </th>
                    <th scope="col" className="numeric">
                      CC anterior
                    </th>
                    <th scope="col" className="numeric">
                      CC novo
                    </th>
                    <th scope="col" className="numeric">
                      Δ CC / %
                    </th>
                    <th scope="col">Situação</th>
                  </>
                ) : (
                  <>
                    <th scope="col" className="numeric">
                      CCD <small>R$/km</small>
                    </th>
                    <th scope="col" className="numeric">
                      CC <small>R$</small>
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {comparing
                ? diff.map((r) => (
                    <tr key={`${r.table}${r.cargo}${r.axles}`}>
                      <td>
                        {r.cargo}
                        <small>Tabela {r.table}</small>
                      </td>
                      <td className="numeric">{r.axles}</td>
                      <td className="numeric">
                        {r.ccd.before === null ? "—" : number(r.ccd.before)}
                      </td>
                      <td className="numeric">
                        {r.ccd.after === null ? "—" : number(r.ccd.after)}
                      </td>
                      <td className="numeric">
                        <Delta delta={r.ccd.delta} percent={r.ccd.percent} />
                      </td>
                      <td className="numeric">
                        {r.cc.before === null ? "—" : number(r.cc.before, 2)}
                      </td>
                      <td className="numeric">
                        {r.cc.after === null ? "—" : number(r.cc.after, 2)}
                      </td>
                      <td className="numeric">
                        <Delta
                          delta={r.cc.delta}
                          percent={r.cc.percent}
                          digits={2}
                        />
                      </td>
                      <td>
                        {
                          {
                            added: "Adicionada",
                            removed: "Removida",
                            incompatible: "Metodologia incompatível",
                            comparable: "Comparável",
                          }[r.status]
                        }
                      </td>
                    </tr>
                  ))
                : rows.map((r) => (
                    <tr key={`${r.table}${r.cargo}${r.axles}`}>
                      <td>
                        {r.cargo}
                        <small>Tabela {r.table}</small>
                      </td>
                      <td className="numeric">{r.axles}</td>
                      <td className="numeric">{number(r.ccd)}</td>
                      <td className="numeric">{number(r.cc, 2)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!(comparing ? diff.length : rows.length) && (
            <p className="table-empty">
              {comparing && !old
                ? "Selecione uma versão para comparar."
                : "Nenhuma combinação encontrada para estes filtros."}
            </p>
          )}
        </div>
        <div className="table-note">
          Células não aplicáveis não são convertidas em zero. Categorias
          adicionadas, removidas ou incompatíveis não recebem percentual de
          variação.
        </div>
      </section>
      <div className="explanation">
        <FileText size={18} aria-hidden="true" />
        <p>
          <OfficialLink href={selected.sourceUrl}>
            Origem dos coeficientes desta consulta
          </OfficialLink>{" "}
          Não há percentual geral de reajuste: cada item e cada componente têm
          sua própria variação.
        </p>
      </div>
    </>
  );
}
function Delta({
  delta,
  percent,
  digits = 4,
}: {
  delta: number | null;
  percent: number | null;
  digits?: number;
}) {
  return delta === null ? (
    <span className="muted">Não comparável</span>
  ) : (
    <span className={delta > 0 ? "increase" : delta < 0 ? "decrease" : "muted"}>
      {delta > 0 ? "+" : ""}
      {number(delta, digits)}
      <small>
        {percent === null
          ? "—"
          : `${percent > 0 ? "+" : ""}${number(percent, 2)}%`}
      </small>
    </span>
  );
}

function Timeline({
  data,
  current,
}: {
  data: PublicSnapshot;
  current: Version;
}) {
  return (
    <>
      <section className="section-panel history-panel">
        <div className="section-heading">
          <div>
            <h2>Linha do tempo normativa</h2>
            <p>
              Histórico efetivamente verificado a partir de 17/07/2026. Não
              representa todo o acervo da ANTT.
            </p>
          </div>
        </div>
        <ol className="timeline">
          {[...data.versions]
            .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))
            .map((v) => (
              <li key={v.id}>
                <span className="timeline-point" />
                <div className="event-date">
                  {formatDate(v.publishedAt)}
                  <small>Publicação no DOU</small>
                </div>
                <div className="event-content">
                  <div className="event-title">
                    <h3>{actName(v)}</h3>
                    <span
                      className={`badge ${v.id === current.id ? "success" : "neutral"}`}
                    >
                      {v.id === current.id
                        ? "Vigente validada"
                        : v.effectiveAt > current.effectiveAt
                          ? "Vigência futura"
                          : "Versão histórica"}
                    </span>
                  </div>
                  <p>
                    {kindLabel[v.kind]} · {v.rows.length} combinações de
                    coeficientes.
                  </p>
                  <dl className="event-meta">
                    <div>
                      <dt>Vigência</dt>
                      <dd>{formatDate(v.effectiveAt)}</dd>
                    </div>
                    <div>
                      <dt>Detectada no radar</dt>
                      <dd>{formatDate(v.detectedAt, true)}</dd>
                    </div>
                  </dl>
                  <OfficialLink href={v.sourceUrl}>
                    Publicação e anexo oficial
                  </OfficialLink>
                  <details>
                    <summary>Rastreabilidade da versão</summary>
                    <p>
                      ID: <code>{v.id}</code>
                    </p>
                    <p>
                      SHA-256 dos coeficientes:{" "}
                      <code>{v.coefficientsHash}</code>
                    </p>
                    <p>
                      SHA-256 da evidência: <code>{v.evidenceHash}</code>
                    </p>
                  </details>
                </div>
              </li>
            ))}
        </ol>
      </section>
      {!!data.pending.length && (
        <section className="section-panel">
          <div className="section-heading">
            <h2>Publicações em análise</h2>
          </div>
          <ul className="pending-list">
            {data.pending.map((p) => (
              <li key={p.id}>
                <strong>{p.title}</strong>
                <p>{p.reason}</p>
                <span>Detectada em {formatDate(p.detectedAt, true)}</span>
                <OfficialLink href={p.url}>Conferir fonte</OfficialLink>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="section-panel sync-log">
        <div className="section-heading">
          <div>
            <h2>Registro de sincronizações</h2>
            <p>
              Últimas {data.runs.length} execuções. O histórico completo fica no
              armazenamento persistente.
            </p>
          </div>
        </div>
        <div
          className="table-scroll"
          tabIndex={0}
          aria-label="Registro de sincronizações"
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Início em Fortaleza</th>
                <th scope="col">Origem</th>
                <th scope="col">Resultado</th>
                <th scope="col">Novas versões</th>
              </tr>
            </thead>
            <tbody>
              {data.runs.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.startedAt, true)}</td>
                  <td>
                    {r.trigger === "schedule"
                      ? "Agendada"
                      : r.trigger === "bootstrap"
                        ? "Carga inicial"
                        : "Manual"}
                  </td>
                  <td>
                    <span
                      className={`badge ${r.status === "success" ? "success" : "warning"}`}
                    >
                      {r.status === "success"
                        ? "Consulta completa"
                        : r.status === "partial"
                          ? "Falha parcial"
                          : "Falha de coleta"}
                    </span>
                  </td>
                  <td>{r.added}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Sources data={data} />
    </>
  );
}

function Simulator({
  data,
  current,
}: {
  data: PublicSnapshot;
  current: Version;
}) {
  const [table, setTable] = useState<Table>("A"),
    [cargo, setCargo] = useState("Carga Geral"),
    [axles, setAxles] = useState("6"),
    [distance, setDistance] = useState("100"),
    [returned, setReturned] = useState(false),
    [returnDistance, setReturnDistance] = useState("100"),
    [dedicated, setDedicated] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  const prior = data.versions
    .filter((v) => v.effectiveAt < current.effectiveAt)
    .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))[0];
  const [before, setBefore] = useState(prior?.id || "");
  const previous = data.versions.find((v) => v.id === before);
  const row = current.rows.find(
    (r) => r.table === table && r.cargo === cargo && r.axles === Number(axles),
  );
  const oldRow = previous?.rows.find(
    (r) => r.table === table && r.cargo === cargo && r.axles === Number(axles),
  );
  const requiredReturn = /conteinerizada/i.test(cargo) || dedicated;
  const mustReturn = returned || requiredReturn;
  const valid = Boolean(
    row &&
      confirmed &&
      Number(distance) >= 1 &&
      Number(distance) <= 99999 &&
      (!mustReturn ||
        (Number(returnDistance) > 0 && Number(returnDistance) <= 99999)),
  );
  const enabled = Boolean(
    current.simulationValidated && !data.methodReviewRequired,
  );
  const value =
    valid && enabled && row
      ? calculate(
          row,
          Number(distance),
          mustReturn ? Number(returnDistance) : 0,
        )
      : null;
  const oldValue =
    valid && enabled && oldRow && previous?.methodology === current.methodology
      ? calculate(
          oldRow,
          Number(distance),
          mustReturn ? Number(returnDistance) : 0,
        )
      : null;
  return (
    <>
      {!enabled && (
        <div className="notice warning">
          <TriangleAlert size={20} aria-hidden="true" />
          <div>
            <strong>Simulador temporariamente indisponível</strong>
            <p>
              {data.methodReviewRequired
                ? "A metodologia oficial mudou e precisa de revisão."
                : "A validação da versão atual contra a calculadora oficial ainda não foi concluída."}{" "}
              Nenhum cálculo não validado será apresentado.
            </p>
            <OfficialLink href="https://calculadorafrete.antt.gov.br/">
              Usar calculadora oficial
            </OfficialLink>
          </div>
        </div>
      )}
      <div className="simulator-grid">
        <section className="section-panel">
          <div className="section-heading">
            <div>
              <h2>Parâmetros da operação</h2>
              <p>
                Transporte rodoviário remunerado de carga lotação, movido a
                diesel.
              </p>
            </div>
          </div>
          <fieldset disabled={!enabled} className="simulation-form">
            <legend className="sr-only">Parâmetros do simulador</legend>
            <label>
              Modalidade / tabela
              <select
                value={table}
                onChange={(e) => setTable(e.target.value as Table)}
              >
                {Object.entries(TABLE_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tipo de carga
              <select value={cargo} onChange={(e) => setCargo(e.target.value)}>
                {[...new Set(current.rows.map((r) => r.cargo))]
                  .sort()
                  .map((c) => (
                    <option key={c}>{c}</option>
                  ))}
              </select>
            </label>
            <div className="form-pair">
              <label>
                Eixos da composição
                <select
                  value={axles}
                  onChange={(e) => setAxles(e.target.value)}
                >
                  {[2, 3, 4, 5, 6, 7, 9].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                Distância de ida (km)
                <input
                  type="number"
                  min="1"
                  max="99999"
                  step="1"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                />
              </label>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={dedicated}
                onChange={(e) => setDedicated(e.target.checked)}
              />
              Frota específica, dedicada ou fidelizada, por exigência sanitária
              ou certificação
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={mustReturn}
                disabled={requiredReturn}
                onChange={(e) => setReturned(e.target.checked)}
              />
              Incluir retorno vazio{" "}
              {requiredReturn ? "(obrigatório neste enquadramento)" : ""}
            </label>
            {mustReturn && (
              <label>
                Distância de retorno contratada (km)
                <input
                  type="number"
                  min="1"
                  max="99999"
                  value={returnDistance}
                  onChange={(e) => setReturnDistance(e.target.value)}
                />
              </label>
            )}
            <label>
              Versão para comparação
              <select
                value={before}
                onChange={(e) => setBefore(e.target.value)}
              >
                <option value="">Sem comparação</option>
                {data.versions
                  .filter((v) => v.id !== current.id)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {actName(v)}
                    </option>
                  ))}
              </select>
            </label>
            <label className="checkbox-label applicability">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              Confirmo operação de carga lotação, movida a diesel, e o
              enquadramento na modalidade selecionada. Em cargas distintas,
              considerei a de maior valor no documento fiscal.
            </label>
            {(table === "C" || table === "D") && (
              <p className="field-hint">
                Alto desempenho exige previsão em contrato, frota dedicada ou
                fidelizada, operação em 2 ou 3 turnos e tempo total de carga e
                descarga de até 3 horas, com ambas sob responsabilidade do
                contratante, conforme o art. 2º.
              </p>
            )}
            {!row && (
              <p className="field-error" role="alert">
                Esta combinação de carga e eixos não tem coeficiente no anexo.
                Escolha uma combinação aplicável.
              </p>
            )}
            {confirmed && !valid && (
              <p className="field-error" role="alert">
                Confira as distâncias e a aplicabilidade dos coeficientes antes
                de calcular.
              </p>
            )}
          </fieldset>
        </section>
        <div>
          <section className="section-panel result-panel">
            <span className="eyebrow">PISO DA OPERAÇÃO</span>
            <h2>{actName(current)}</h2>
            <div className="calculated-value" aria-live="polite">
              {value ? money(value.total) : "—"}
              <small>
                {value
                  ? "Piso calculado · valor total"
                  : "Informe os parâmetros e confirme o enquadramento"}
              </small>
            </div>
            {row && (
              <dl className="calculation-breakdown">
                <div>
                  <dt>Deslocamento · CCD</dt>
                  <dd>{number(row.ccd)} R$/km</dd>
                </div>
                <div>
                  <dt>Carga e descarga · CC</dt>
                  <dd>{money(row.cc)}</dd>
                </div>
                <div>
                  <dt>Ida · d × CCD + CC</dt>
                  <dd>{value ? money(value.outbound) : "—"}</dd>
                </div>
                <div>
                  <dt>Retorno · 0,92 × d retorno × CCD</dt>
                  <dd>{value ? money(value.returnValue) : "—"}</dd>
                </div>
              </dl>
            )}
            {oldValue && value && previous && (
              <div className="comparison-result">
                <span>Na {actName(previous)}</span>
                <strong>{money(oldValue.total)}</strong>
                <span>
                  Impacto:{" "}
                  <b
                    className={
                      value.total >= oldValue.total ? "increase" : "decrease"
                    }
                  >
                    {money(value.total - oldValue.total)} (
                    {number(
                      ((value.total - oldValue.total) / oldValue.total) * 100,
                      2,
                    )}
                    %)
                  </b>
                </span>
              </div>
            )}
            {previous && value && !oldValue && (
              <p>
                Comparação indisponível: categoria ausente ou metodologia
                incompatível.
              </p>
            )}
            <p className="field-hint">
              Total arredondado ao centavo após somar os componentes sem
              arredondamento intermediário. Componentes exibidos podem diferir
              em R$ 0,01 da soma visual.
            </p>
            {current.simulationValidated && (
              <div className="validation-mark">
                <ShieldCheck size={16} aria-hidden="true" />
                <span>
                  {current.simulationValidated.samples} exemplos conferidos com
                  a calculadora oficial em{" "}
                  {formatDate(current.simulationValidated.checkedAt, true)}.
                </span>
              </div>
            )}
          </section>
          <section className="simulation-notes">
            <h3>O que fica fora do piso</h3>
            <p>
              Lucro, pedágio, despesas administrativas, tributos, taxas,
              movimentações logísticas complementares e outros itens não
              previstos na metodologia. Pedágio deve ser acrescido conforme a
              legislação.
            </p>
            <p>
              Não se aplica a carga fracionada nem a veículos não movidos a
              diesel. Configurações de eixos fora das opções deste simulador
              devem ser conferidas na calculadora oficial.
            </p>
            <OfficialLink href={METHOD_URL}>
              Regras e aplicabilidade · arts. 2º a 5º
            </OfficialLink>
          </section>
        </div>
      </div>
    </>
  );
}
