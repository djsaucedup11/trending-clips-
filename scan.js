import { supabaseServer } from "@/lib/supabase";
import fetch from "cross-fetch";

function hypeScore({ viewsPerMin, accel=0, engagementPct=0, minutesSince=60 }) {
  const logv = Math.log(1 + (viewsPerMin || 0));
  const recencyBoost = Math.max(0, 1.5 - minutesSince/720);
  return Math.max(0, Math.min(100, (logv*28 + accel*10 + engagementPct*0.8 + recencyBoost*15)));
}
const minutesBetween = (a,b) => (b-a)/60000;

async function fetchYouTubeRecent(ykey, source) {
  let channelId = source.handle;
  if (channelId && channelId.startsWith("@")) channelId = channelId.slice(1);

  if (!/^[A-Za-z0-9_-]{20,30}$/.test(channelId || "")) {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channelId)}&maxResults=1&key=${ykey}`;
    const sr = await fetch(searchUrl).then(r=>r.json());
    channelId = sr?.items?.[0]?.id?.channelId || null;
  }
  if (!channelId) return [];

  const now = new Date();
  const publishedAfter = new Date(now.getTime() - 24*60*60*1000).toISOString();
  const listUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&publishedAfter=${publishedAfter}&type=video&maxResults=10&key=${ykey}`;
  const lr = await fetch(listUrl).then(r=>r.json());
  const ids = (lr.items || []).map(it => it.id.videoId).filter(Boolean);
  if (!ids.length) return [];

  const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids.join(",")}&key=${ykey}`;
  const vr = await fetch(statsUrl).then(r=>r.json());
  const nowMs = Date.now();

  return (vr.items || []).map(v => {
    const views = Number(v.statistics?.viewCount || 0);
    const likes = Number(v.statistics?.likeCount || 0);
    const comments = Number(v.statistics?.commentCount || 0);
    const publishedAt = new Date(v.snippet?.publishedAt || now).getTime();
    const mins = minutesBetween(publishedAt, nowMs);
    const vpm = mins > 0 ? views / mins : 0;
    const eng = views > 0 ? ((likes + comments) / views) * 100 : 0;
    return {
      platform:"youtube",
      title: v.snippet?.title || "video",
      url: `https://www.youtube.com/watch?v=${v.id}`,
      published_at: new Date(publishedAt).toISOString(),
      views_per_min: vpm,
      accel: 0,
      engagement_pct: eng,
      hype_score: hypeScore({ viewsPerMin: vpm, engagementPct: eng, minutesSince: mins })
    };
  });
}

async function redditToken({ id, secret, username, password, userAgent }) {
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const params = new URLSearchParams();
  params.append("grant_type", "password");
  params.append("username", username);
  params.append("password", password);
  const r = await fetch("https://www.reddit.com/api/v1/access_token", {
    method:"POST",
    headers:{
      "Authorization":`Basic ${auth}`,
      "User-Agent":userAgent,
      "Content-Type":"application/x-www-form-urlencoded"
    },
    body: params.toString()
  });
  if (!r.ok) throw new Error("Reddit auth failed");
  return r.json();
}

async function fetchRedditRising(token, userAgent, sub) {
  const r = await fetch(`https://oauth.reddit.com/r/${sub}/rising?limit=10`, {
    headers:{ "Authorization":`Bearer ${token}`, "User-Agent":userAgent }
  });
  const j = await r.json();
  const now = Date.now();
  return (j.data?.children || []).map(ch => {
    const p = ch.data;
    const views = p.ups || 0;
    const comments = p.num_comments || 0;
    const created = (p.created_utc || 0) * 1000;
    const mins = minutesBetween(created, now);
    const vpm = mins > 0 ? views / mins : 0;
    const eng = views > 0 ? (comments / views) * 100 : 0;
    return {
      platform:"reddit",
      title:p.title,
      url:`https://reddit.com${p.permalink}`,
      published_at:new Date(created).toISOString(),
      views_per_min:vpm,
      accel:0,
      engagement_pct:eng,
      hype_score:hypeScore({ viewsPerMin:vpm, EngagementPct:eng, minutesSince:mins })
    };
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error:"Method not allowed" });
  const supa = supabaseServer();

  const { data: sources, error: srcErr } = await supa.from("sources").select("*").limit(100);
  if (srcErr) return res.status(500).json({ error: srcErr.message });

  const YT_KEY = process.env.YOUTUBE_API_KEY;
  const RID = process.env.REDDIT_CLIENT_ID;
  const RSECRET = process.env.REDDIT_CLIENT_SECRET;
  const RUSER = process.env.REDDIT_USERNAME;
  const RPASS = process.env.REDDIT_PASSWORD;
  const RUA = process.env.REDDIT_USER_AGENT;

  let out = [];

  // YouTube
  for (const s of (sources || []).filter(s => s.platform === "youtube")) {
    try { out.push(...await fetchYouTubeRecent(YT_KEY, s)); } catch(e) { console.error(e); }
  }

  // Reddit
  try {
    const hasSubs = (sources || []).some(s => s.platform === "reddit");
    if (hasSubs) {
      const tok = await redditToken({ id: RID, secret: RSECRET, username: RUSER, password: RPASS, userAgent: RUA });
      const access = tok.access_token;
      for (const sub of sources.filter(x => x.platform==="reddit").map(x => x.subreddit)) {
        try { out.push(...await fetchRedditRising(access, RUA, sub)); } catch(e){ console.error(e); }
      }
    }
  } catch(e) { console.error("Reddit auth", e); }

  // Insert rows; ignore duplicates via URL
  for (const r of out) {
    try { await supa.from("candidates").insert(r); } catch(e) { /* ignore duplicates */ }
  }

  res.json({ ok:true, count: out.length, message:`Scanned ${out.length} items` });
}
