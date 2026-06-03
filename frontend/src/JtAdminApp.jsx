import { useState } from "react";
import UsersTab from "./components/jtadmin/UsersTab";
import JobsTab from "./components/jtadmin/JobsTab";
import AITab from "./components/jtadmin/AITab";

const TABS = [
  { id: "users", label: "👥 Người dùng" },
  { id: "jobs",  label: "📋 Jobs" },
  { id: "ai",    label: "🤖 AI Models" },
];

// Reuse the regular jobtracker token. Only "admin" may access this page.
function getAdminAuth() {
  const token = localStorage.getItem("jt_token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp * 1000 < Date.now()) { localStorage.removeItem("jt_token"); return null; }
    if (payload.sub !== "admin") return { token: null, notAdmin: true };
    return { token };
  } catch { localStorage.removeItem("jt_token"); return null; }
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
        <button onClick={onLogout}
          style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontFamily: "var(--font-display)" }}>
          Sign out
        </button>
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
  const auth = getAdminAuth();

  // Not logged in → go to the main Job Tracker login
  if (!auth) { window.location.href = "/jobtracker"; return null; }

  // Logged in but not admin → send back to their tracker
  if (auth.notAdmin) {
    const me = JSON.parse(atob(localStorage.getItem("jt_token").split(".")[1])).sub;
    window.location.href = `/jobtracker/${me}`;
    return null;
  }

  const handleLogout = () => { localStorage.removeItem("jt_token"); window.location.href = "/jobtracker"; };
  return <Dashboard token={auth.token} onLogout={handleLogout} />;
}
