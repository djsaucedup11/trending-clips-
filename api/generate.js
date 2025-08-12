import { supabaseServer } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error:"Method not allowed" });
  const supa = supabaseServer();
  const { candidate_id } = req.body || {};
  if (!candidate_id) return res.status(400).json({ error:"candidate_id required" });

  const { data: jobRows, error: jobErr } = await supa.from("jobs").insert({ candidate_id, status:"done" }).select();
  if (jobErr) return res.status(500).json({ error: jobErr.message });
  const job_id = jobRows[0].id;

  const clips = Array.from({ length:5 }).map((_, i) => ({
    job_id, start_s: i*60, end_s: i*60+45, srt_url: null, mp4_url: null
  }));
  const { error: clipErr } = await supa.from("clips").insert(clips);
  if (clipErr) return res.status(500).json({ error: clipErr.message });

  res.json({ ok:true, message:"Created demo clips for this candidate" });
}
