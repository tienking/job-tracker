import { useState, useEffect } from "react";

const authH = (token) => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` });

const inp = {
  fontSize: 13, padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--border)", width: "100%",
  boxSizing: "border-box", fontFamily: "var(--font-display)",
  outline: "none", background: "var(--bg)", color: "var(--text)",
};

export default function UsersTab({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ username: "", password: "" });
  const [newPw, setNewPw] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/jtadmin/users", { headers: authH(token) });
    setUsers(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createUser = async () => {
    if (!newUser.username.trim() || !newUser.password.trim()) return;
    setSaving(true);
    const res = await fetch("/api/jtadmin/users", { method: "POST", headers: authH(token), body: JSON.stringify(newUser) });
    if (res.ok) { setNewUser({ username: "", password: "" }); flash("✓ Tạo user thành công"); await load(); }
    else { const d = await res.json(); flash(`Lỗi: ${d.detail}`); }
    setSaving(false);
  };

  const changePw = async (username) => {
    const pw = newPw[username];
    if (!pw?.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/jtadmin/users/${username}`, { method: "PUT", headers: authH(token), body: JSON.stringify({ password: pw }) });
    if (res.ok) { setNewPw(p => ({ ...p, [username]: "" })); flash("✓ Đổi password thành công"); }
    else flash("Lỗi khi đổi password");
    setSaving(false);
  };

  const deleteUser = async (username) => {
    if (!confirm(`Xóa user "${username}"? Sẽ xóa luôn toàn bộ jobs.`)) return;
    await fetch(`/api/jtadmin/users/${username}`, { method: "DELETE", headers: authH(token) });
    flash("✓ Đã xóa user");
    await load();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, padding: "0 0 14px", borderBottom: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text)" }}>Người dùng</h2>
        {msg && <span style={{ fontSize: 12, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{msg}</span>}
      </div>

      {/* Scrollable */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 0" }}>

        {/* Create new user */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, fontFamily: "var(--font-mono)" }}>+ THÊM USER MỚI</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Username</label>
              <input value={newUser.username} onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))} style={inp} placeholder="username" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Password</label>
              <input type="password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && createUser()}
                style={inp} placeholder="password" />
            </div>
            <button onClick={createUser} disabled={saving}
              style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, cursor: saving ? "default" : "pointer", fontFamily: "var(--font-display)", opacity: saving ? 0.7 : 1, whiteSpace: "nowrap" }}>
              Tạo user
            </button>
          </div>
        </div>

        {/* User list */}
        {loading
          ? <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Đang tải...</p>
          : users.map(u => (
            <div key={u.username} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{u.username}</span>
                  {u.username === "admin" && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "var(--accent-dim)", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>admin</span>}
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString("vi-VN") : ""}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center" }}>
                <input type="password" value={newPw[u.username] || ""} onChange={e => setNewPw(p => ({ ...p, [u.username]: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && changePw(u.username)}
                  placeholder="Password mới..." style={{ ...inp }} />
                <button onClick={() => changePw(u.username)} disabled={saving || !newPw[u.username]?.trim()}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "none", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-display)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  Đổi pass
                </button>
                {u.username !== "admin" && (
                  <button onClick={() => deleteUser(u.username)}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-display)", color: "#f87171", whiteSpace: "nowrap" }}>
                    Xóa
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
