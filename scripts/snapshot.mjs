// Foto diaria de los canales de channels.txt. Guarda el historial en data/history/<canal>.json
// y la lista de canales en data/index.json. Cuota: unas 3 unidades por canal y día.
import fs from "node:fs/promises";

const KEY = process.env.YT_API_KEY;
if (!KEY) { console.error("Falta la variable YT_API_KEY con la clave de YouTube Data API v3."); process.exit(1); }
const today = new Date().toISOString().slice(0, 10);
const KEEP_DAYS = 60; // deja de seguir un vídeo cuando lleva 60 días fuera de los 50 más recientes

async function yt(path, params) {
  const u = new URL("https://www.googleapis.com/youtube/v3/" + path);
  for (const [k, v] of Object.entries({...params, key: KEY})) if (v != null) u.searchParams.set(k, v);
  const r = await fetch(u);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message || `HTTP ${r.status}`);
  return j;
}
const isoDur = s => { const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(s || "") || []; return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0); };
function parse(line) {
  let m = line.match(/(UC[\w-]{22})/); if (m) return {id: m[1]};
  m = line.match(/youtube\.com\/@([^/?#\s]+)/) || line.match(/^@?([\w.\-·]+)$/); if (m) return {forHandle: "@" + m[1]};
  return null;
}
const readJson = async (f, fallback) => { try { return JSON.parse(await fs.readFile(f, "utf8")); } catch { return fallback; } };

const lines = (await fs.readFile("channels.txt", "utf8")).split("\n").map(l => l.replace(/#.*/, "").trim()).filter(Boolean);
await fs.mkdir("data/history", {recursive: true});
const index = [];
let failures = 0;

for (const line of lines) {
  try {
    const q = parse(line);
    if (!q) throw new Error("no parece un canal");
    const c = (await yt("channels", {part: "snippet,statistics,contentDetails", ...q})).items?.[0];
    if (!c) throw new Error("canal no encontrado");
    const file = `data/history/${c.id}.json`;
    const h = await readJson(file, {id: c.id, days: [], videos: {}});
    Object.assign(h, {title: c.snippet.title, handle: c.snippet.customUrl || "", avatar: c.snippet.thumbnails?.default?.url || null,
      country: c.snippet.country || "", created: c.snippet.publishedAt});
    h.days = h.days.filter(p => p.d !== today).concat({d: today, subs: +c.statistics.subscriberCount || 0,
      views: +c.statistics.viewCount || 0, videos: +c.statistics.videoCount || 0});

    const pl = await yt("playlistItems", {part: "contentDetails", playlistId: c.contentDetails.relatedPlaylists.uploads, maxResults: 50});
    const ids = pl.items.map(i => i.contentDetails.videoId);
    const vs = ids.length ? (await yt("videos", {part: "snippet,statistics,contentDetails", id: ids.join(",")})).items : [];
    for (const v of vs) {
      const e = h.videos[v.id] ||= {s: []};
      Object.assign(e, {title: v.snippet.title, published: v.snippet.publishedAt.slice(0, 10), durationSec: isoDur(v.contentDetails.duration)});
      e.s = e.s.filter(p => p[0] !== today).concat([[today, +v.statistics.viewCount || 0,
        v.statistics.likeCount == null ? null : +v.statistics.likeCount, +v.statistics.commentCount || 0]]);
    }
    const cutoff = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);
    for (const [id, v] of Object.entries(h.videos)) if (!v.s.length || v.s.at(-1)[0] < cutoff) delete h.videos[id];

    await fs.writeFile(file, JSON.stringify(h));
    index.push({id: c.id, title: h.title, handle: h.handle, subs: h.days.at(-1).subs, since: h.days[0].d, updated: today});
    console.log(`✓ ${h.title}: ${h.days.length} días, ${Object.keys(h.videos).length} vídeos`);
  } catch (e) {
    failures++;
    console.error(`✗ ${line}: ${e.message}`);
  }
}
await fs.writeFile("data/index.json", JSON.stringify(index, null, 1));
if (failures && !index.length) process.exit(1);
