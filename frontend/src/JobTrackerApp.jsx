import LoginPage from "./components/jobtracker/LoginPage";
import TrackerPage from "./components/jobtracker/TrackerPage";
import JtProfilePage from "./components/jobtracker/JtProfilePage";

function getTokenData() {
  const token = localStorage.getItem("jt_token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp * 1000 < Date.now()) { localStorage.removeItem("jt_token"); return null; }
    return { token, username: payload.sub };
  } catch { localStorage.removeItem("jt_token"); return null; }
}

export default function JobTrackerApp() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const urlUsername = parts.length >= 2 ? parts[1] : null;
  const subPage = parts[2] || null;
  const auth = getTokenData();

  if (!urlUsername) {
    if (auth) { window.location.href = `/jobtracker/${auth.username}`; return null; }
    return <LoginPage />;
  }
  if (!auth) { window.location.href = "/jobtracker"; return null; }
  if (auth.username !== urlUsername) { localStorage.removeItem("jt_token"); window.location.href = "/jobtracker"; return null; }
  if (subPage === "profile") return <JtProfilePage username={urlUsername} token={auth.token} />;
  return <TrackerPage username={urlUsername} token={auth.token} />;
}
