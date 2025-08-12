import { supabaseServer } from "@/lib/supabase";
export default async function handler(req, res) {
  const supa = supabaseServer();
  const { data, error } = await supa.from("candidates").select("*").order("hype_score", { ascending:false }).limit(100);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ rows: data || [] });
}
