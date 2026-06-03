import { useState } from "react";
import JtAdminLogin from "./components/jtadmin/LoginPage";
import UsersTab from "./components/jtadmin/UsersTab";
import JobsTab from "./components/jtadmin/JobsTab";
import AITab from "./components/jtadmin/AITab";

const TABS = [
  { id: "users", label: "👥 Người dùng" },
  { id: "jobs",  label: "📋 Jobs" },
  { id: "ai",    label: "🤖 AI Models" },
];

function getAdminToken() {
  const token = localStorage.getItem("jtadmin_token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp * 1000 < Date.now()) { localStorage.removeItem("jtadmin_token"); return null; }
    return token;
  } catch { localStorage.removeItem("jtadmin_token"); return null; }
}

function Dashboard({ token, onLogout }) {
  const [tab, setTab] = useState("users");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font-display)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", letterSpacing: "0.1em" }}>JT ADMIN</p>
          <span style={{ color: "var(--border)" }}>·</span>
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>Job Tracker</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/jobtracker/admin" style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "none" }}
            onClick={e => { e.preventDefault(); window.location.href = "/jobtracker"; }}>
            ← Về Tracker
          </a>
          <button onClick={onLogout}
            style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontFamily: "var(--font-display)" }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "0 24px", overflow: "hidden" }}>
        {/* Sidebar */}
        <nav style={{ width: 180, flexShrink: 0, padding: "24px 0", marginRight: 24, display: "flex", flexDirection: "column", gap: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 10, border: "none", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-display)", background: tab === t.id ? "var(--accent-dim)" : "none", color: tab === t.id ? "var(--accent)" : "var(--text-muted)" }}>
              {t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", padding: "24px 0" }}>
          {tab === "users" && <UsersTab token={token} />}
          {tab === "jobs"  && <JobsTab  token={token} />}
          {tab === "ai"    && <AITab    token={token} />}
        </div>
      </div>
    </div>
  );
}

export default function JtAdminApp() {
  const [token, setToken] = useState(() => getAdminToken());

  const handleLogin = (t) => { localStorage.setItem("jtadmin_token", t); setToken(t); };
  const handleLogout = () => { localStorage.removeItem("jtadmin_token"); setToken(null); };

  if (!token) return <JtAdminLogin onLogin={handleLogin} />;
  return <Dashboard token={token} onLogout={handleLogout} />;
}
