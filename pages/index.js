import { useEffect, useState } from "react";

export default function TrendRadar() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");

  const fetchItems = async () => {
    const res = await fetch("/api/candidates");
    const data = await res.json();
    setItems(data.rows || []);
  };
  useEffect(() => { fetchItems(); }, []);

  const scan = async () => {
    setLoading(true); setMsg("Scanning…");
    const res = await fetch("/api/scan", { method: "POST" });
    const data = await res.json();
    setMsg(data.message || "Scan done");
    await fetchItems();
    setLoading(false);
  };

  const genClips = async (id) => {
    setMsg("Generating clips…");
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ candidate_id: id })
    });
    const data = await res.json();
    setMsg(data.message || "Generated");
  };

  return (
    <div className="container">
      <h1>Trend Radar</h1>
      <div className="card">
        <button onClick={scan} disabled={loading}>{loading ? "Scanning…" : "Scan Now"}</button>
        <p>{msg}</p>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Title</th><th>Source</th><th>Published</th><th>Views/min</th><th>Eng%</th><th>Hype</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(x => (
              <tr key={x.id}>
                <td><a href={x.url} target="_blank">{x.title}</a></td>
                <td>{x.platform}</td>
                <td>{new Date(x.published_at).toLocaleString()}</td>
                <td>{Number(x.views_per_min||0).toFixed(2)}</td>
                <td>{Number(x.engagement_pct||0).toFixed(2)}</td>
                <td><span className="badge">{Number(x.hype_score||0).toFixed(0)}</span></td>
                <td><button onClick={()=>genClips(x.id)}>Generate Clips</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <p>Go to <a href="/whitelist">Whitelist</a> to add channels & subreddits. Settings at <a href="/settings">Settings</a>.</p>
      </div>
    </div>
  );
}
