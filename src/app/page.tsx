"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle, ArrowUpRight, Bell, BookOpenCheck, ChevronDown, CircleHelp,
  Clock3, FileText, Filter, FolderOpen, LayoutDashboard, LifeBuoy, Menu,
  MoreHorizontal, RefreshCw, Search, Settings2, ShieldCheck, Upload, Users,
} from "lucide-react";

type Status = "Em dia" | "Aguardando judiciário" | "Revisar" | "Possível pendência";
type Process = { client: string; debtor: string; number: string; court: string; movement: string; movementDetail?: string; date: string; status: Status; statusDetail?: string; owner: string; newMovement?: boolean; rj?: boolean; recentMovements?: {date: string, description: string}[]; recentCommunications?: {date: string, description: string}[] };
type ProviderHealth = { provider: string; status: "operational" | "not_configured" | "unavailable"; message?: string };

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true }, { label: "Processos", icon: FolderOpen },
  { label: "Pendências", icon: AlertCircle }, { label: "Novidades", icon: Bell },
  { label: "Relatórios", icon: FileText }, { label: "Importar", icon: Upload },
];
const statusStyles: Record<Status, string> = { "Em dia": "status-green", "Aguardando judiciário": "status-blue", Revisar: "status-yellow", "Possível pendência": "status-red" };

export default function Home() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [activeFilter, setActiveFilter] = useState<"Todos" | Status | "Com publicações (DJEN)">("Todos");
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [providerStatuses, setProviderStatuses] = useState<Record<string, ProviderHealth>>({});
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [notice, setNotice] = useState("");
  
  useEffect(() => {
    fetch("/api/processos").then((response) => response.ok ? response.json() : []).then((items: Process[]) => { if (items.length) setProcesses(items); }).catch(() => undefined);
    fetch("/api/integracoes").then((response) => response.json()).then((data: { providers?: ProviderHealth[] }) => {
      setProviderStatuses(Object.fromEntries((data.providers ?? []).map((provider) => [provider.provider, provider])));
    }).catch(() => setSyncMessage("Não foi possível consultar o status das integrações."));
  }, []);

  const pendingCount = processes.filter((item) => item.status === "Possível pendência").length;
  const reviewCount = processes.filter((item) => item.status === "Revisar").length;
  const attentionProcesses = processes.filter((item) => item.status === "Possível pendência" || item.status === "Revisar").slice(0, 3);
  const publicationsCount = processes.filter(item => item.recentCommunications && item.recentCommunications.length > 0).length;

  const filtered = processes.filter((item) => {
    const query = search.toLowerCase();
    const matchesFilter = activeFilter === "Todos" 
      ? true 
      : activeFilter === "Com publicações (DJEN)" 
        ? item.recentCommunications && item.recentCommunications.length > 0
        : item.status === activeFilter;
    return matchesFilter && [item.client, item.debtor, item.number].some((value) => value.toLowerCase().includes(query));
  });

  const sync = async () => {
    setSyncing(true);
    setSyncMessage("Consultando DataJud, DJEN e fontes configuradas...");
    try {
      const response = await fetch("/api/sincronizar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ processNumbers: processes.map((item) => item.number) }) });
      const data = await response.json() as { results?: Array<{ provider: string; movements: unknown[]; communications: unknown[]; errors: string[] }>; error?: string };
      if (!response.ok) throw new Error(data.error ?? "A sincronização falhou.");
      const results = data.results ?? [];
      const newMovements = results.reduce((total, result) => total + result.movements.length, 0);
      const newCommunications = results.reduce((total, result) => total + result.communications.length, 0);
      const errors = results.reduce((total, result) => total + result.errors.length, 0);
      setLastSync(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      setSyncMessage(`${newMovements} movimentações e ${newCommunications} comunicações encontradas${errors ? ` · ${errors} falhas isoladas` : ""}.`);
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Não foi possível sincronizar.");
    } finally { setSyncing(false); }
  };
  
  const syncOne = async (process: Process) => {
    setSelectedProcess(null);
    setSyncing(true);
    setSyncMessage(`Consultando ${process.number}...`);
    try {
      const response = await fetch("/api/sincronizar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ processNumbers: [process.number] }) });
      const data = await response.json() as { persisted?: { savedMovements: number; savedCommunications: number }; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Falha na consulta.");
      setLastSync(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      setSyncMessage(`${data.persisted?.savedMovements ?? 0} movimentações e ${data.persisted?.savedCommunications ?? 0} comunicações persistidas.`);
    } catch (error) { setSyncMessage(error instanceof Error ? error.message : "Não foi possível consultar o processo."); }
    finally { setSyncing(false); }
  };
  
  const showNotice = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(""), 2800); };
  const datajudStatus = providerStatuses.DATAJUD?.status ?? "not_configured";
  const djenStatus = providerStatuses.DJEN?.status ?? "not_configured";

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img className="brand-logo" src="/compo-expert-logo.svg" alt="COMPO EXPERT · radar jurídico" /></div>
      <div className="workspace-switcher"><span className="avatar avatar-coral">CC</span><div><b>Carolina & Co.</b><small>Workspace principal</small></div><ChevronDown size={15} /></div>
      <nav className="nav-list" aria-label="Navegação principal">
        <p className="nav-label">Operação</p>
        {navItems.map(({ label, icon: Icon, active, count }) => <button className={`nav-item ${active ? "active" : ""}`} key={label} onClick={() => { if (label === "Importar") window.location.href = "/importar"; else if (label === "Relatórios") window.location.href = "/relatorios"; else if (label === "Pendências") setActiveFilter("Possível pendência"); else if (label === "Processos") { setActiveFilter("Todos"); document.querySelector(".process-section")?.scrollIntoView({ behavior: "smooth" }); } else if (label === "Novidades") showNotice("Novidades: consulte o botão Atualizar processos para buscar alterações."); else showNotice(`${label}: módulo disponível na próxima etapa.`); }}><Icon size={18} /><span>{label}</span>{count && <em>{count}</em>}</button>)}
        <p className="nav-label nav-label-spaced">Administração</p>
        <button className="nav-item" onClick={() => showNotice("Usuários: permissões e responsáveis serão configurados aqui.")}><Users size={18} /><span>Usuários</span></button>
        <button className="nav-item" onClick={() => document.querySelector(".app-footer")?.scrollIntoView({ behavior: "smooth" })}><Settings2 size={18} /><span>Integrações</span><span className="live-dot" /></button>
      </nav>
      <div className="sidebar-footer"><div className="support-icon"><LifeBuoy size={17} /></div><div><b>Central de ajuda</b><small>Fale com o suporte</small></div><ArrowUpRight size={15} /></div><div className="profile"><span className="avatar avatar-ink">MS</span><div><b>Mariana Silva</b><small>Administradora</small></div><MoreHorizontal size={17} /></div>
    </aside>
    <section className="content-area">
      <header className="topbar"><button className="mobile-menu" aria-label="Abrir menu" onClick={() => showNotice("Use a navegação lateral para acessar as áreas do radar.")}><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>Dashboard</strong></div><div className="topbar-actions"><div className="top-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar processo, cliente..." /></div><button className="icon-button" aria-label="Ajuda" onClick={() => showNotice("O radar consulta fontes oficiais e sempre requer validação humana.")}><CircleHelp size={18} /></button><button className="icon-button notification" aria-label="Notificações" onClick={() => setActiveFilter("Possível pendência")}><Bell size={18} /><i /></button><button className="top-avatar" aria-label="Perfil" onClick={() => showNotice("Perfil ativo: Mariana Silva · Administradora")}>MS</button></div></header>
      <div className="page-content">
        <section className="page-heading"><div><p className="eyebrow">TERÇA-FEIRA, 08 DE SETEMBRO DE 2026</p><h1>Bom dia, Mariana <span>✦</span></h1><p className="heading-copy">Aqui está o panorama dos processos que merecem sua atenção hoje.</p>{syncMessage && <p className={`sync-message ${syncing ? "is-loading" : ""}`}><span />{syncMessage}{lastSync && !syncing && <small>Atualizado às {lastSync}</small>}</p>}</div><button className={`sync-button ${syncing ? "syncing" : ""}`} onClick={sync} disabled={syncing}><RefreshCw size={17} />{syncing ? "Sincronizando..." : "Atualizar processos"}</button></section>
        <section className="summary-grid" aria-label="Resumo dos processos">
          <Summary icon={<ShieldCheck size={19} />} tone="navy" value={String(processes.length)} label="Processos monitorados" detail="dados persistidos no banco" />
          <Summary icon={<BookOpenCheck size={19} />} tone="green" value={String(processes.filter((item) => item.status === "Em dia").length)} label="Em dia" trend="banco" progress="73%" />
          <Summary icon={<Clock3 size={19} />} tone="blue" value={String(processes.filter((item) => item.status === "Aguardando judiciário").length)} label="Aguardando judiciário" trend="banco" progress="44%" />
          <Summary icon={<AlertCircle size={19} />} tone="yellow" value={String(reviewCount)} label="Precisam de revisão" trend="banco" progress="32%" />
          <Summary icon={<AlertCircle size={19} />} tone="red" value={String(pendingCount)} label="Possíveis pendências" trend="banco" progress="18%" />
        </section>
        
        <section className="attention-section">
          <div className="section-heading">
            <div><p className="eyebrow">PRIORIZAÇÃO AUTOMÁTICA</p><h2>Atenção necessária <span className="heading-count">{pendingCount + reviewCount}</span></h2></div>
            <button className="text-button" onClick={() => setActiveFilter("Possível pendência")}>Ver todas <ArrowUpRight size={15} /></button>
          </div>
          <div className="attention-grid">
            {attentionProcesses.length === 0 ? (
              <p className="empty-state" style={{gridColumn: '1 / -1'}}>Nenhuma pendência ou revisão necessária no momento.</p>
            ) : (
              attentionProcesses.map(item => (
                <Attention 
                  key={item.number} 
                  onOpen={() => setSearch(item.number)} 
                  tone={item.status === "Possível pendência" ? "red" : "yellow"} 
                  tag={item.status.toUpperCase()} 
                  title={item.movement || "Análise Necessária"} 
                  text={item.statusDetail || "Requer revisão do jurídico para classificação ou providência."} 
                  number={item.number} 
                  time={item.date || "Hoje"} 
                />
              ))
            )}
          </div>
        </section>
        
        <section className="process-section">
          <div className="section-heading">
            <div><p className="eyebrow">VISÃO OPERACIONAL</p><h2>Todos os processos <span className="heading-count neutral">{processes.length}</span></h2></div>
            <div className="table-actions">
              <button className="filter-button" onClick={() => setActiveFilter(activeFilter === "Todos" ? "Revisar" : "Todos")}><Filter size={15} /> {activeFilter === "Todos" ? "Filtrar revisão" : "Limpar filtro"}</button>
              <button className="icon-button small" aria-label="Mais opções" onClick={() => showNotice("Use os filtros de status ou a busca global para refinar a lista.")}><MoreHorizontal size={18} /></button>
            </div>
          </div>
          <div className="filter-tabs">
            {(["Todos", "Em dia", "Aguardando judiciário", "Revisar", "Possível pendência", "Com publicações (DJEN)"] as const).map((filter) => 
              <button key={filter} className={activeFilter === filter ? "selected" : ""} onClick={() => setActiveFilter(filter)}>
                {filter}
                {filter === "Possível pendência" && pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
                {filter === "Com publicações (DJEN)" && publicationsCount > 0 && <span className="tab-badge" style={{background: '#3b82f6'}}>{publicationsCount}</span>}
              </button>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Processo</th><th>Cliente / devedor</th><th>Resumo técnico</th><th>Data</th><th>Status</th><th>Responsável</th><th /></tr></thead>
              <tbody>
                {filtered.map((item, index) => 
                  <tr key={`${item.number}-${index}`} onClick={() => setSelectedProcess(item)}>
                    <td><div className="process-cell"><span className="process-icon"><FileText size={15} /></span><div><b>{item.number}</b><small>{item.court}</small></div>{item.newMovement && <span className="new-badge">NOVO</span>}</div></td>
                    <td><div className="client-cell"><b>{item.client}</b><small>{item.debtor}{item.rj && <span className="rj-badge">RJ</span>}</small></div></td>
                    <td title={item.movementDetail}><span className="movement-cell">{item.movement}</span><small className="source-cell">Fonte oficial · DataJud</small></td>
                    <td><span className="date-cell">{item.date}</span></td>
                    <td title={item.statusDetail}><span className={`status-pill ${statusStyles[item.status]}`}><i />{item.status}</span></td>
                    <td><span className={item.owner === "Sem responsável" ? "owner unassigned" : "owner"}>{item.owner === "Sem responsável" ? "Atribuir" : item.owner}</span></td>
                    <td><button className="row-more" aria-label="Ações do processo" onClick={(event) => { event.stopPropagation(); setSelectedProcess(item); }}><MoreHorizontal size={17} /></button></td>
                  </tr>
                )}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="empty-state">Nenhum processo encontrado para esta busca.</div>}
          </div>
          <div className="table-footer">
            <span>Mostrando <b>{filtered.length}</b> de {processes.length} processos</span>
            <button className="text-button" onClick={() => { setActiveFilter("Todos"); setSearch(""); }}>Limpar busca <ArrowUpRight size={15} /></button>
          </div>
        </section>
        <footer className="app-footer"><span><span className="online-dot" /> Sistema operacional</span><span>Última consulta bem-sucedida: <b>{lastSync ? `hoje, ${lastSync}` : "hoje, 07:30"}</b></span><span>DataJud <b className={`footer-status footer-${datajudStatus}`}>{datajudStatus === "operational" ? "Operacional" : datajudStatus === "unavailable" ? "Indisponível" : "Configurar"}</b></span><span>DJEN <b className={`footer-status footer-${djenStatus}`}>{djenStatus === "operational" ? "Operacional" : djenStatus === "unavailable" ? "Indisponível" : "Configurar"}</b></span></footer>
      </div>
    </section>
    {notice && <div className="toast-notice">{notice}</div>}
    {selectedProcess && <div className="modal-backdrop" onClick={() => setSelectedProcess(null)}><section className="process-modal" style={{maxHeight: '90vh', overflowY: 'auto', width: '500px'}} onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelectedProcess(null)}>×</button><p className="eyebrow">CONSULTA DO PROCESSO</p><h2>{selectedProcess.number}</h2><p className="modal-client">{selectedProcess.client} · {selectedProcess.debtor}</p><div className={`status-pill ${statusStyles[selectedProcess.status]}`}><i />{selectedProcess.status}</div><dl style={{marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem'}}><div><dt>Tribunal</dt><dd>{selectedProcess.court}</dd></div><div><dt>Última movimentação da Planilha</dt><dd>{selectedProcess.movementDetail || selectedProcess.movement}</dd></div>
      {selectedProcess.recentMovements && selectedProcess.recentMovements.length > 0 && (
        <div style={{borderTop: '1px solid #e2e8f0', paddingTop: '1rem'}}>
          <dt style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#23835d'}}><ShieldCheck size={16}/> Histórico Oficial (DataJud)</dt>
          <dd>
            <ul style={{listStyle: 'none', padding: 0, margin: '0.5rem 0', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
              {selectedProcess.recentMovements.map((m, i) => (
                <li key={i} style={{paddingLeft: '1rem', borderLeft: '2px solid #e2e8f0'}}>
                  <strong style={{display: 'block', color: '#64748b'}}>{m.date ? new Date(m.date).toLocaleDateString('pt-BR') : 'Data desconhecida'}</strong>
                  {m.description}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      )}
      {selectedProcess.recentCommunications && selectedProcess.recentCommunications.length > 0 && (
        <div style={{borderTop: '1px solid #e2e8f0', paddingTop: '1rem'}}>
          <dt style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6'}}><BookOpenCheck size={16}/> Publicações Oficiais (DJEN)</dt>
          <dd>
            <ul style={{listStyle: 'none', padding: 0, margin: '0.5rem 0', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
              {selectedProcess.recentCommunications.map((c, i) => (
                <li key={i} style={{paddingLeft: '1rem', borderLeft: '2px solid #bfdbfe'}}>
                  <strong style={{display: 'block', color: '#64748b'}}>{c.date ? new Date(c.date).toLocaleDateString('pt-BR') : 'Data desconhecida'}</strong>
                  {parseDJENText(c.description)}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      )}
      </dl><div className="modal-actions" style={{marginTop: '2rem'}}><button className="sync-button" onClick={() => syncOne(selectedProcess)}><RefreshCw size={15} />Consultar fontes oficiais</button><button className="modal-secondary" onClick={() => showNotice("Providências internas serão habilitadas na próxima etapa.")}>Registrar providência</button></div></section></div>}
  </main>;
}

function Summary({ icon, tone, value, label, detail, trend, progress }: { icon: React.ReactNode; tone: string; value: string; label: string; detail?: string; trend?: string; progress?: string }) {
  return <article className={`summary-card ${tone === "navy" ? "summary-main" : ""}`}><div className="summary-top"><span className={`summary-icon ${tone}`}>{icon}</span>{trend ? <span className={`summary-trend ${tone}-text`}>{trend}</span> : <span className="summary-period">desde a última consulta</span>}</div><strong>{value}</strong><div className="summary-label">{label}</div>{detail ? <div className="summary-detail"><span className="trend">{detail.split(" ")[0]}</span> {detail.substring(detail.indexOf(" ") + 1)}</div> : <div className="progress"><i style={{ width: progress }} /></div>}</article>;
}

function Attention({ tone, tag, title, text, number, time, onOpen }: { tone: "red" | "yellow"; tag: string; title: string; text: string; number: string; time: string; onOpen: () => void }) {
  return <article className={`attention-card attention-card-${tone}`} onClick={onOpen}><div className="attention-card-top"><span className={`attention-status-dot ${tone}-dot`} /><span className="attention-tag">{tag}</span><span className="attention-date">{time}</span></div><h3>{title}</h3><p>{text}</p><div className="attention-footer"><span className="mini-process">{number}</span><button aria-label="Abrir processo" onClick={(event) => { event.stopPropagation(); onOpen(); }}><ArrowUpRight size={16} /></button></div></article>;
}

function parseDJENText(html: string) {
  if (!html) return "";
  if (!html.includes('<') && !html.includes('&')) return html;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  } catch (e) {
    return html.replace(/<[^>]*>?/gm, '');
  }
}
