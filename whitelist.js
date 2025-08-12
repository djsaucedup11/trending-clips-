import { useEffect, useState } from "react";

export default function Whitelist() {
  const [channels, setChannels] = useState([]);
  const [subs, setSubs] = useState([]);
  const [newChannel, setNewChannel] = useState("");
  const [newSub, setNewSub] = useState("");

  const load = async () => {
    const res = await fetch("/api/sources");
    const data = await res.json();
    setChannels(data.rows.filter(x => x.platform === "youtube"));
    setSubs(data.rows.filter(x => x.platform === "reddit"));
  };
  useEffect(() => { load(); }, []);

  const add = async (platform, value) => {
    await fetch("/api/sources", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ platform, value }) });
    setNewChannel(""); setNewSub(""); await load();
  };
  const remove = async (id) => {
    await fetch("/api/sources?id="+id, { method:"DELETE" });
    await load();
  };

  return (
    <div className="container">
      <h1>Whitelist</h1>
      <div className="grid grid-2">
        <div className="card">
          <h3>YouTube Channels</h3>
          <div style={{display:"flex", gap:8}}>
            <input placeholder="youtube.com/@name or /channel/ID" value={newChannel} onChange={e=>setNewChannel(e.target.value)} />
            <button onClick={()=>add("youtube", newChannel)}>Add</button>
          </div>
          <ul>{channels.map(c=>(
            <li key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0"}}>
              <span>{c.channel_url}</span><button onClick={()=>remove(c.id)}>Remove</button>
            </li>
          ))}</ul>
        </div>
        <div className="card">
          <h3>Subreddits</h3>
          <div style={{display:"flex", gap:8}}>
            <input placeholder="e.g., Entrepreneur" value={newSub} onChange={e=>setNewSub(e.target.value)} />
            <button onClick={()=>add("reddit", newSub)}>Add</button>
          </div>
          <ul>{subs.map(s=>(
            <li key={s.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0"}}>
              <span>r/{s.subreddit}</span><button onClick={()=>remove(s.id)}>Remove</button>
            </li>
          ))}</ul>
        </div>
      </div>
    </div>
  );
}
