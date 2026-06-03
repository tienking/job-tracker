import { useState, useEffect } from "react";

const authH = (token) => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` });

export default function JobsTab({ token }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState("");
  const [jobs, setJobs] = useState(null);
  const [jsonText, setJsonText] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  useEffect(() => {
    fetch("/api/jtadmin/users", { headers: authH(token) })
      .then(r => r.json()).then(setUsers);
  }, []);

  const loadJobs = async (username) => {
    setSelected(username); setJobs(null); setJsonText("");
    const res = await fetch(`/api/jtadmin/jobs/${username}`, { headers: authH(token) });
    const data = await res.json();
    setJobs(data.jobs || []);
    setJsonText(JSON.stringify(data.jobs || [], null, 2));
  };

  const saveJobs = async () => {
    if (!selected) return;
    try {
      const parsed = JSON.parse(jsonText);
      setSaving(true);
      const res = await fetch(`/api/jtadmin/jobs/${selected}`, {
        method: "PUT", headers: authH(token), body: JSON.stringify(parsed),
      });
      if (res.ok) { setJobs(parsed); flash("✓ Lưu thành công"); }
      else flash("Lỗi khi lưu");
    } catch { flash("JSON không hợp lệ"); }
    setSaving(false);
  };

  const inp = {
    fontSize: 13, padding: "8px 12px", borderRadius: 8,
    border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)",
    fontFamily: "var(--font-display)", outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, padding: "0 0 14px", borderBottom: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text)" }}>Jobs</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {msg && <span style={{ fontSize: 12, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{msg}</span>}
          {selected && (
            <button onClick={saveJobs} disabled={saving}
              style={{ padding: "8px 20px", borderRadius: 9, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: saving ? "default" : "pointer", fontFamily: "var(--font-display)", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          )}
        </div>
      </div>

      {/* Scrollable */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 0" }}>
        {/* User selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Chọn user:</label>
          <select value={selected} onChange={e => loadJobs(e.target.value)}
            style={{ ...inp, flex: 1, cursor: "pointer" }}>
            <option value="">-- Chọn user --</option>
            {users.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
          </select>
        </div>

        {selected && jobs !== null && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{jobs.length} jobs · Chỉnh sửa JSON bên dưới hoặc paste dữ liệu mới:</span>
            </div>
            <textarea
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              style={{ width: "100%", minHeight: 400, fontSize: 12, padding: "12px", borderRadius: 10, border: "1px solid var(--border)", fontFamily: "var(--font-mono)", background: "var(--bg)", color: "var(--text)", outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }}
            />
          </>
        )}

        {!selected && (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Chọn một user để xem và chỉnh sửa jobs.</p>
        )}
      </div>
    </div>
  );
}
