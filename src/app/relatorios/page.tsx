"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AlertCircle, ArrowUpRight, Bell, ChevronDown, CircleHelp,
  FileText, FolderOpen, LayoutDashboard, LifeBuoy, Menu,
  MoreHorizontal, Search, Settings2, Users, PieChart as PieChartIcon, BarChart2, ShieldCheck, BookOpenCheck, Clock3
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Upload } from "lucide-react";

type Status = "Em dia" | "Aguardando judiciário" | "Revisar" | "Possível pendência";
type Process = { client: string; debtor: string; number: string; court: string; movement: string; date: string; status: Status; owner: string; rj?: boolean };

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard }, { label: "Processos", icon: FolderOpen },
  { label: "Pendências", icon: AlertCircle }, { label: "Novidades", icon: Bell },
  { label: "Relatórios", icon: FileText, active: true }, { label: "Importar", icon: Upload },
];

const COLORS = {
  "Em dia": "#23835d", 
  "Aguardando judiciário": "#3b82f6", 
  "Revisar": "#eab308", 
  "Possível pendência": "#ef4444"
};

function truncate(str: string, length = 25) {
  if (!str) return "Não informado";
  return str.length > length ? str.substring(0, length) + "..." : str;
}

export default function RelatoriosPage() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/processos")
      .then((response) => response.ok ? response.json() : [])
      .then((items: Process[]) => {
        if (items.length) setProcesses(items);
      })
      .finally(() => setLoading(false));
  }, []);

  const showNotice = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2800);
  };

  const statusData = useMemo(() => {
    const counts = { "Em dia": 0, "Aguardando judiciário": 0, "Revisar": 0, "Possível pendência": 0 };
    processes.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [processes]);

  const clientData = useMemo(() => {
    const counts: Record<string, number> = {};
    processes.forEach(p => {
      const name = truncate(p.client, 22);
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, fullName: name }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [processes]);

  const courtData = useMemo(() => {
    const counts: Record<string, number> = {};
    processes.forEach(p => {
      const court = truncate(p.court, 22);
      counts[court] = (counts[court] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [processes]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><img className="brand-logo" src="/compo-expert-logo.svg" alt="COMPO EXPERT · radar jurídico" /></div>
        <div className="workspace-switcher">
          <span className="avatar avatar-coral">CC</span>
          <div><b>Carolina & Co.</b><small>Workspace principal</small></div>
          <ChevronDown size={15} />
        </div>
        <nav className="nav-list" aria-label="Navegação principal">
          <p className="nav-label">Operação</p>
          {navItems.map(({ label, icon: Icon, active }) => (
            <button
              className={`nav-item ${active ? "active" : ""}`}
              key={label}
              onClick={() => {
                if (label === "Importar") window.location.href = "/importar";
                else if (label === "Dashboard") window.location.href = "/";
                else if (label === "Relatórios") window.location.href = "/relatorios";
                else showNotice(`${label}: disponível na visão Dashboard.`);
              }}
            >
              <Icon size={18} /><span>{label}</span>
            </button>
          ))}
          <p className="nav-label nav-label-spaced">Administração</p>
          <button className="nav-item" onClick={() => showNotice("Usuários: módulo disponível na próxima etapa.")}>
            <Users size={18} /><span>Usuários</span>
          </button>
          <button className="nav-item" onClick={() => window.location.href = "/"}>
            <Settings2 size={18} /><span>Integrações</span><span className="live-dot" />
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="support-icon"><LifeBuoy size={17} /></div>
          <div><b>Central de ajuda</b><small>Fale com o suporte</small></div>
          <ArrowUpRight size={15} />
        </div>
        <div className="profile">
          <span className="avatar avatar-ink">MS</span>
          <div><b>Mariana Silva</b><small>Administradora</small></div>
          <MoreHorizontal size={17} />
        </div>
      </aside>

      <section className="content-area">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Abrir menu" onClick={() => showNotice("Use a navegação lateral para acessar as áreas do radar.")}>
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span><b>/</b><strong>Relatórios Analíticos</strong>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Ajuda" onClick={() => showNotice("Módulo de inteligência e dados agregados.")}>
              <CircleHelp size={18} />
            </button>
            <button className="top-avatar" aria-label="Perfil" onClick={() => showNotice("Perfil ativo: Mariana Silva · Administradora")}>MS</button>
          </div>
        </header>

        <div className="page-content" style={{ paddingBottom: '3rem' }}>
          <section className="page-heading">
            <div>
              <p className="eyebrow">MÉTRICAS E INTELIGÊNCIA</p>
              <h1>Relatórios <span>✦</span></h1>
              <p className="heading-copy">Visão agregada e distribuição de todos os processos monitorados.</p>
            </div>
          </section>

          {loading ? (
            <p className="empty-state">Carregando dados...</p>
          ) : processes.length === 0 ? (
            <div className="empty-state">Nenhum processo encontrado para gerar relatórios.</div>
          ) : (
            <>
              <section className="summary-grid" aria-label="Resumo dos processos" style={{ marginBottom: '2rem' }}>
                <Summary icon={<ShieldCheck size={19} />} tone="navy" value={String(processes.length)} label="Processos monitorados" detail="ativos na base" />
                <Summary icon={<BookOpenCheck size={19} />} tone="green" value={String(statusData.find(d => d.name === "Em dia")?.value || 0)} label="Em dia" trend="banco" progress="70%" />
                <Summary icon={<AlertCircle size={19} />} tone="red" value={String(statusData.find(d => d.name === "Possível pendência")?.value || 0)} label="Pendências" trend="banco" progress="15%" />
                <Summary icon={<Clock3 size={19} />} tone="blue" value={String(new Set(processes.map(p => p.court)).size)} label="Tribunais distintos" trend="fontes" progress="100%" />
              </section>

              <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
                
                <article style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <span style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', color: '#64748b' }}><PieChartIcon size={20} /></span>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Distribuição por Status</h2>
                  </div>
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="45%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                          {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[entry.name as Status] || "#94a3b8"} />)}
                        </Pie>
                        <RechartsTooltip formatter={(value) => [`${value} processos`, "Total"]} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                <article style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <span style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', color: '#64748b' }}><BarChart2 size={20} /></span>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Top 5 Clientes (Volume)</h2>
                  </div>
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                      <BarChart data={clientData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                        <RechartsTooltip formatter={(value) => [`${value} processos`, "Total"]} cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="value" fill="#23835d" radius={[0, 4, 4, 0]} barSize={28}>
                          {clientData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? "#23835d" : "#94a3b8"} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                <article style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <span style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', color: '#64748b' }}><BarChart2 size={20} /></span>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Top Tribunais / Câmaras</h2>
                  </div>
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                      <BarChart data={courtData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" />
                        <YAxis hide />
                        <RechartsTooltip formatter={(value) => [`${value} processos`, "Total"]} cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40}>
                          {courtData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? "#3b82f6" : "#cbd5e1"} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>

              </div>
            </>
          )}
        </div>
      </section>
      {notice && <div className="toast-notice">{notice}</div>}
    </main>
  );
}

function Summary({ icon, tone, value, label, detail, trend, progress }: { icon: React.ReactNode; tone: string; value: string; label: string; detail?: string; trend?: string; progress?: string }) {
  return (
    <article className={`summary-card ${tone === "navy" ? "summary-main" : ""}`}>
      <div className="summary-top">
        <span className={`summary-icon ${tone}`}>{icon}</span>
        {trend ? <span className={`summary-trend ${tone}-text`}>{trend}</span> : <span className="summary-period">total agregado</span>}
      </div>
      <strong>{value}</strong>
      <div className="summary-label">{label}</div>
      {detail ? (
        <div className="summary-detail"><span className="trend">{detail.split(" ")[0]}</span> {detail.substring(detail.indexOf(" ") + 1)}</div>
      ) : (
        <div className="progress"><i style={{ width: progress }} /></div>
      )}
    </article>
  );
}
