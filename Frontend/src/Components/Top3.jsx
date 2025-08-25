import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DOCSS/Top3.css";

const API_BASE = "http://localhost:3000/openmeteo";

export default function Recomendacion() {
  const navigate = useNavigate();

  const [selectedMunicipio] = useState(() => localStorage.getItem("municipioSeleccionado") || "");
  const [selectedDate] = useState(() => localStorage.getItem("fechaSeleccionada") || "");

  const [batchLoading, setBatchLoading] = useState(false);
  const [batchErr, setBatchErr] = useState("");
  const [batchResults, setBatchResults] = useState([]);

  const [prodLoading, setProdLoading] = useState(false);
  const [prodErr, setProdErr] = useState("");
  const [muniData, setMuniData] = useState(null);

  const [rankLoading, setRankLoading] = useState(false);
  const [rankErr, setRankErr] = useState("");
  const [rankData, setRankData] = useState([]);

  const dateCacheRef = useRef(new Map());
  const lastHashRef = useRef("");
  const inFlightRef = useRef(false);

  const normalizeDate = (str) => {
    if (!str) return "";
    const d = new Date(`${str}T00:00:00`);
    if (isNaN(d)) return "";
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
const parseLocalYMD = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ""));
  if (!m) return null;
  const [, y, mm, dd] = m;
  return new Date(Number(y), Number(mm) - 1, Number(dd), 12);
};

const formatPrettyDateShort = (str) => {
  if (!str) return "—";

    const norm = /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : normalizeDate(str);
    const d = parseLocalYMD(norm);
    if (!d || isNaN(d)) return "—";
    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
  };
  const toYear2024 = (ymd) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
    const [, , mm, dd] = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/) || [];
    if (!mm || !dd) return "";
    return (mm === "02" && dd === "29") ? "2024-02-28" : `2024-${mm}-${dd}`;
  };
  const toNoonLocal = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const addDays = (date, days) => { const b = toNoonLocal(date); const r = new Date(b); r.setDate(r.getDate() + Number(days)); return r; };
  const toYMD = (date) => { if (!date) return ""; const y = date.getFullYear(), m = String(date.getMonth()+1).padStart(2,"0"), d = String(date.getDate()).padStart(2,"0"); return `${y}-${m}-${d}`; };
  const inRange = (val, min, max) => (val == null || min == null || max == null) ? null : (val >= min && val <= max);
  const normName = (s = "") => { try { return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim(); } catch { return s.toLowerCase().trim(); } };

  const toFileKey = (nombre) => {
    const base = (nombre || "")
      .normalize("NFD").replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .split(" ")
      .map(w => w ? (w[0].toUpperCase() + w.slice(1).toLowerCase()) : "")
      .join("");
    return base || "Default";
  };
  const getImgPath = (nombre) => {
    const key = toFileKey(nombre);
    return new URL(`../ImagenesP/LogosPng/${key}.png`, import.meta.url).href;
  };
  const defaultImg = new URL(`../ImagenesP/LogosPng/Default.png`, import.meta.url).href;

  const fetchProductosMunicipio = async () => {
    if (!selectedMunicipio) return;
    try {
      setProdLoading(true); setProdErr(""); setMuniData(null);
      const res = await fetch("http://localhost:3000/productos/municipios-productos", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Error consultando productos");
      const found = (json.data || []).find(m => m.municipio?.toLowerCase() === selectedMunicipio.toLowerCase());
      if (!found) throw new Error(`No encontré datos para "${selectedMunicipio}".`);
      found.productos.sort((a,b)=>a.producto.localeCompare(b.producto,"es"));
      setMuniData(found);
      const norm = normalizeDate(selectedDate);
      if (norm) {
        const d = new Date(`${norm}T12:00:00`);
        const cosechas = {};
        for (const p of found.productos) if (p?.ciclo_dias != null) cosechas[p.producto] = toYMD(addDays(d, p.ciclo_dias));
        try { localStorage.setItem("fechasCosecha", JSON.stringify(cosechas)); } catch {}
      }
    } catch (e) {
      setProdErr(e.message);
    } finally {
      setProdLoading(false);
    }
  };

  const buildFechasHash = () => {
    let map = {};
    try { map = JSON.parse(localStorage.getItem("fechasCosecha") || "{}"); } catch {}
    const entries = Object.entries(map).sort(([a],[b]) => a.localeCompare(b, "es"));
    return `${selectedMunicipio}|` + entries.map(([k,v]) => `${k}:${v}`).join("|");
  };

  const fetchWithRetry = async (url, tries = 3) => {
    let attempt = 0; let lastErr;
    while (attempt < tries) {
      try {
        const res = await fetch(url);
        const json = await res.json().catch(() => ({}));
        if (res.ok) return { ok: true, json };
        if (res.status === 429 || res.status >= 500) {
          const ms = Math.min(1000 * (2 ** attempt), 4000);
          await new Promise(r => setTimeout(r, ms));
          attempt++; lastErr = json?.error || `HTTP ${res.status}`; continue;
        }
        return { ok: false, error: json?.error || `HTTP ${res.status}` };
      } catch (e) {
        const ms = Math.min(1000 * (2 ** attempt), 4000);
        await new Promise(r => setTimeout(r, ms));
        attempt++; lastErr = e.message || "Network error";
      }
    }
    return { ok: false, error: lastErr || "Max retries reached" };
  };

  const runWithConcurrency = async (items, worker, concurrency = 3) => {
    const results = new Array(items.length); let idx = 0;
    async function runner() { while (true) { const i = idx++; if (i >= items.length) break; results[i] = await worker(items[i], i); } }
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runner());
    await Promise.all(workers);
    return results;
  };

  const fetchBatch2024 = async () => {
    if (inFlightRef.current) return;
    if (!selectedMunicipio) return;
    try {
      setBatchLoading(true); setBatchErr(""); setBatchResults([]); inFlightRef.current = true;
      let map = {}; try { map = JSON.parse(localStorage.getItem("fechasCosecha") || "{}"); } catch { map = {}; }
      const entries = Object.entries(map);
      if (!entries.length) throw new Error("No hay fechas de cosecha guardadas (localStorage['fechasCosecha']).");
      const prodToDate = entries.map(([producto, fecha]) => ({ producto, date2024: toYear2024(fecha) }));
      const uniqueDates = Array.from(new Set(prodToDate.map(e => e.date2024).filter(Boolean)));
      const hash = buildFechasHash();
      if (hash === lastHashRef.current && uniqueDates.every(d => dateCacheRef.current.has(d))) {
        const out = prodToDate.map(({ producto, date2024 }) => {
          const cached = dateCacheRef.current.get(date2024);
          if (!cached) return { producto, date2024, wx: null, error: "Sin cache" };
          return cached.ok ? { producto, date2024, wx: cached.json, error: "" } : { producto, date2024, wx: null, error: cached.error || "Error API" };
        });
        setBatchResults(out);
        return;
      }
      const toFetch = uniqueDates.filter(d => !dateCacheRef.current.has(d));
      await runWithConcurrency(toFetch, async (d) => {
        const url = `${API_BASE}/daily?place=${encodeURIComponent(selectedMunicipio)}&date=${d}`;
        const res = await fetchWithRetry(url, 3);
        dateCacheRef.current.set(d, res);
      }, 3);
      const results = prodToDate.map(({ producto, date2024 }) => {
        const cached = dateCacheRef.current.get(date2024);
        if (!cached) return { producto, date2024, wx: null, error: "Fecha inválida" };
        return cached.ok ? { producto, date2024, wx: cached.json, error: "" } : { producto, date2024, wx: null, error: cached.error || "Error API" };
      });
      setBatchResults(results);
      lastHashRef.current = hash;
    } catch (e) {
      setBatchErr(e.message);
    } finally {
      setBatchLoading(false);
      inFlightRef.current = false;
    }
  };

  useEffect(() => { if (selectedMunicipio) fetchProductosMunicipio(); }, [selectedMunicipio, selectedDate]);
  useEffect(() => {
    const run = () => {
      let obj = {};
      try { obj = JSON.parse(localStorage.getItem("fechasCosecha") || "{}"); } catch {}
      if (selectedMunicipio && Object.keys(obj).length > 0) fetchBatch2024();
    };
    run();
    const onStorage = (e) => { if (e.key === "fechasCosecha") run(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [selectedMunicipio]);

  useEffect(() => {
    const loadRanking = async () => {
      try {
        setRankLoading(true); setRankErr(""); setRankData([]);
        const res = await fetch("/Puntuacion.json", { cache: "no-cache" });
        if (!res.ok) throw new Error(`No pude cargar Puntuacion.json (HTTP ${res.status})`);
        const json = await res.json();
        const arr =
          Array.isArray(json) ? json :
          Array.isArray(json?.productos) ? json.productos :
          Array.isArray(json?.data) ? json.data :
          Array.isArray(json?.items) ? json.items :
          [];
        setRankData(arr);
      } catch (e) {
        setRankErr(e.message);
      } finally {
        setRankLoading(false);
      }
    };
    loadRanking();
  }, []);

  const merged = useMemo(() => {
    if (!muniData) return [];
    const apiByProd = new Map(batchResults.map(r => [normName(r.producto), r]));
    const results = (muniData.productos || []).map(p => {
      const r = apiByProd.get(normName(p.producto));
      const m = r?.wx?.metrics || {};
      const tempAvg = m?.temp_avg_c;
      const hum = m?.humidity;
      const temp_ok = inRange(tempAvg, p.temp_min, p.temp_max);
      const hum_ok = inRange(hum, p.humedad_min, p.humedad_max);
      let puntos = 0;
      if (temp_ok != null) puntos += temp_ok ? 3 : -3;
      if (hum_ok != null) puntos += hum_ok ? 3 : -3;
      return {
        producto: p.producto,
        cont: p.cont ?? 0,
        date2024: r?.date2024 || "",
        puntos
      };
    });
    try { localStorage.setItem("puntuacionesProductos", JSON.stringify(Object.fromEntries(results.map(r => [r.producto, r.puntos])))); } catch {}
    return results;
  }, [muniData, batchResults]);

  const monthKeys = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const monthLabel = (idx) => monthKeys[idx] ? (monthKeys[idx][0].toUpperCase() + monthKeys[idx].slice(1)) : "—";
  const getMonthIndexForProduct = (row) => {
    const candidates = [row?.date2024, normalizeDate(selectedDate), toYMD(new Date())];
    for (const ymd of candidates) {
      if (ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        const dt = new Date(`${ymd}T00:00:00`);
        if (!isNaN(dt)) return dt.getMonth();
      }
    }
    return null;
  };

  const rankingRows = useMemo(() => {
    if (!rankData.length || !merged.length) return [];
    const rankByName = new Map(rankData.map(item => [normName(item.nombre), item]));
    return merged.map((p) => {
      const mIdx = getMonthIndexForProduct(p);
      const mesKey = mIdx == null ? null : monthKeys[mIdx];
      const mesTxt = mIdx == null ? "—" : monthLabel(mIdx);
      const item = rankByName.get(normName(p.producto));
      const puesto = mesKey && item ? item?.ranking?.[mesKey] : null;
      const puestoNum = puesto != null ? Number(puesto) : 0;
      const puntosClima = p.puntos ?? 0;
      const puntosCont = (p.cont ?? 0) * 0.4;
      const puntosFinales = puntosClima + puestoNum - puntosCont;
      return {
        producto: p.producto,
        mes: mesTxt,
        puesto: puesto ?? "—",
        cont: p.cont ?? 0,
        puntosClima,
        puntosFinales
      };
    });
  }, [merged, rankData, selectedDate]);

  useEffect(() => {
    if (!rankingRows.length) return;
    const finales = Object.fromEntries(rankingRows.map(r => [r.producto, r.puntosFinales ?? 0]));
    try {
      localStorage.setItem("puntuacionesFinales", JSON.stringify(finales));
      const top = Object.entries(finales).sort((a,b) => b[1] - a[1]).slice(0,3);
      if (top[0]) localStorage.setItem("TOP1", `${top[0][0]}:${top[0][1]}`);
      if (top[1]) localStorage.setItem("TOP2", `${top[1][0]}:${top[1][1]}`);
      if (top[2]) localStorage.setItem("TOP3", `${top[2][0]}:${top[2][1]}`);
    } catch {}
  }, [rankingRows]);

  const topCards = useMemo(() => {
    if (rankingRows.length) {
      return [...rankingRows]
        .sort((a,b) => (b.puntosFinales ?? 0) - (a.puntosFinales ?? 0))
        .slice(0,3)
        .map(r => ({ producto: r.producto, puntos: r.puntosFinales }));
    }
    let finales = {};
    try { finales = JSON.parse(localStorage.getItem("puntuacionesFinales") || "{}"); } catch {}
    const arr = Object.entries(finales)
      .map(([producto, puntos]) => ({ producto, puntos: Number(puntos) || 0 }))
      .sort((a,b) => b.puntos - a.puntos)
      .slice(0,3);
    if (arr.length) return arr;
    const read = (k) => {
      const v = localStorage.getItem(k) || "";
      const [prod, pts] = v.split(":");
      return prod ? { producto: prod, puntos: Number(pts) || 0 } : null;
    };
    return [read("TOP1"), read("TOP2"), read("TOP3")].filter(Boolean);
  }, [rankingRows]);

  const isLoading = (batchLoading || prodLoading || rankLoading) && !(batchErr || prodErr || rankErr);

  return (
    <div className="top3x-root">
      <header className="top3x-bar">
        <div className="top3x-titlewrap">
          <h2 className="top3x-title">
            NUESTRO TOP 3 PARA SEMBRAR EL {formatPrettyDateShort(selectedDate)}
          </h2>
          <div className="top3x-sub">
            Municipio: <strong>{selectedMunicipio || "—"}</strong>
          </div>
        </div>
        <button
          className="top3x-btn top3x-btn--ghost"
          onClick={() => navigate("/Recomendacion")}
          title="Ver análisis detallado"
        >
          Ver análisis
        </button>
      </header>

      {(batchErr || prodErr || rankErr) && (
        <div className="top3x-error">{batchErr || prodErr || rankErr}</div>
      )}

      <section className="top3x-layout">
        <aside className="top3x-info">
          <h3>¿Cómo elegimos?</h3>
          <p>Tomamos tu municipio y la fecha que escogiste. Estimamos cómo estará el clima cerca de la cosecha y lo comparamos con lo que necesita cada cultivo.</p>
          <ul>
            <li>Clima esperado alrededor de la cosecha.</li>
            <li>Condiciones ideales de cada cultivo.</li>
            <li>Comportamiento de mercado por mes.</li>
            <li>Ajuste por disponibilidad local.</li>
          </ul>
          <p>Con eso calculamos un puntaje y te mostramos los 3 mejores.</p>
          {isLoading && (
            <div className="top3x-loading">
              <span className="top3x-spinner" />
              <span>Armando tu recomendación…</span>
            </div>
          )}
        </aside>

        <main className="top3x-cards">
          {isLoading ? (
            [0,1,2].map((i) => (
              <div key={`sk-${i}`} className={`top3x-card top3x-card--skeleton`}>
                <div className="top3x-skel top3x-skel--img" />
                <div className="top3x-skel top3x-skel--ttl" />
                <div className="top3x-skel top3x-skel--pts" />
                <div className="top3x-skel top3x-skel--btn" />
              </div>
            ))
          ) : topCards.length > 0 ? (
            topCards.map((t, i) => (
              <article key={t.producto + i} className={`top3x-card top3x-card--rank-${i+1}`}>
                <div className="top3x-rankbadge">{i === 0 ? "TOP 1" : i === 1 ? "TOP 2" : "TOP 3"}</div>
                <div className="top3x-imgwrap">
                  <img
                    src={getImgPath(t.producto)}
                    onError={(e) => { e.currentTarget.src = defaultImg; }}
                    alt={t.producto}
                    className="top3x-img"
                    loading="lazy"
                  />
                </div>
                <h3 className="top3x-name" title={t.producto}>{t.producto}</h3>
                <p className="top3x-points">
                  Puntos finales: <strong>{t.puntos}</strong>
                </p>
                <button
                  className="top3x-btn"
                  onClick={() => {
                    localStorage.setItem("productoSeleccionado", t.producto); 
                    navigate("/Mercado");
                  }}
                >
                  Ver más
                </button>

              </article>
            ))
          ) : (
            <div className="top3x-empty">No hay datos para calcular el Top 3 aún.</div>
          )}
        </main>
      </section>

      {isLoading && (
        <div className="top3x-overlay" aria-live="polite" aria-busy="true">
          <div className="top3x-loader">
            <div className="top3x-loader-ring"/>
            <p>Cargando datos…</p>
          </div>
        </div>
      )}
    </div>
  );
}
