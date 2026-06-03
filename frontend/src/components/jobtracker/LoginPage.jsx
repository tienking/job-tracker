import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inp = {
    fontSize: 13, padding: "9px 12px", borderRadius: 8,
    border: "1px solid var(--border)", width: "100%",
    boxSizing: "border-box", outline: "none",
    fontFamily: "var(--font-display)",
    background: "var(--bg)", color: "var(--text)",
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/jobtracker/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      if (!res.ok) { setError("Sai username hoặc password."); return; }
      const data = await res.json();
      localStorage.setItem("jt_token", data.access_token);
      window.location.href = `/jobtracker/${data.username}`;
    } catch { setError("Không thể kết nối server."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", fontFamily: "var(--font-display)" }}>
      <div style={{ width: 360, background: "var(--bg-surface)", borderRadius: 16, border: "1px solid var(--border)", padding: "36px 32px" }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.12em", marginBottom: 8 }}>JOB TRACKER</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>Đăng nhập</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>Xem danh sách job ứng tuyển của bạn.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)} required autoFocus style={{ ...inp, marginBottom: 14 }} />
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ ...inp, marginBottom: error ? 10 : 20 }} />
          {error && <p style={{ fontSize: 12, color: "#f87171", marginBottom: 14 }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "10px", borderRadius: 9, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "var(--font-display)" }}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
