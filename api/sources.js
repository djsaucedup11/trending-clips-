import { supabaseServer } from "@/lib/supabase";
import { extractChannelId } from "@/lib/utils";

export default async function handler(req, res) {
  const supa = supabaseServer();

  if (req.method === "GET") {
    const { data, error } = await supa.from("sources").select("*").order("created_at", { ascending:false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ rows: data || [] });
  }

  if (req.method === "POST") {
    const { platform, value } = req.body || {};
    if (platform === "youtube") {
      const channel_url = value;
      const handle = extractChannelId(value);
      const { data, error } = await supa.from("sources").insert({ platform:"youtube", channel_url, handle }).select();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok:true, row:data[0] });
    }
    if (platform === "reddit") {
      const subreddit = (value || "").replace(/^r\//i, "");
      const { data, error } = await supa.from("sources").insert({ platform:"reddit", subreddit }).select();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok:true, row:data[0] });
    }
    return res.status(400).json({ error:"Invalid platform" });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    const { error } = await supa.from("sources").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok:true });
  }

  res.status(405).json({ error:"Method not allowed" });
}
