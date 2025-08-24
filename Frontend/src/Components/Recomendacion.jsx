import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = "http://localhost:3000/openmeteo";

export default function Recomendacion() {
  const [selectedMunicipio, setSelectedMunicipio] = useState(() => localStorage.getItem("municipioSeleccionado") || "");
  const [selectedDate, setSelectedDate] = useState(() => localStorage.getItem("fechaSeleccionada") || "");

  const [batchLoading, setBatchLoading] = useState(false);
  const [batchErr, setBatchErr] = useState("");
  const [batchResults, setBatchResults] = useState([]); 

  const [prodLoading, setProdLoading] = useState(false);
  const [prodErr, setProdErr] = useState("");
  const [muniData, setMuniData] = useState(null);


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

  const toYear2024 = (ymd) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
    const [, , mm, dd] = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/) || [];
    if (!mm || !dd) return "";
    return (mm === "02" && dd === "29") ? "2024-02-28" : `2024-${mm}-${dd}`;
  };

  const toNoonLocal = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const addDays = (date, days) => { const b = toNoonLocal(date); const r = new Date(b); r.setDate(r.getDate() + Number(days)); return r; };
  const toYMD = (date) => { if (!date) return ""; const y = date.getFullYear(), m = String(date.getMonth()+1).padStart(2,"0"), d = String(date.getDate()).padStart(2,"0"); return `${y}-${m}-${d}`; };

  const fmt = (v, suf = "") => (v === null || v === undefined ? "—" : `${v}${suf}`);
  const inRange = (val, min, max) => (val == null || min == null || max == null) ? null : (val >= min && val <= max);

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
        for (const p of found.productos) {
          if (p?.ciclo_dias != null) {
            cosechas[p.producto] = toYMD(addDays(d, p.ciclo_dias));
          }
        }
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
    let attempt = 0;
    let lastErr;
    while (attempt < tries) {
      try {
        const res = await fetch(url);
        const json = await res.json().catch(() => ({}));
        if (res.ok) return { ok: true, json };
        if (res.status === 429 || res.status >= 500) {
          const ms = Math.min(1000 * (2 ** attempt), 4000);
          await new Promise(r => setTimeout(r, ms));
          attempt++;
          lastErr = json?.error || `HTTP ${res.status}`;
          continue;
        }
        return { ok: false, error: json?.error || `HTTP ${res.status}` };
      } catch (e) {
        const ms = Math.min(1000 * (2 ** attempt), 4000);
        await new Promise(r => setTimeout(r, ms));
        attempt++;
        lastErr = e.message || "Network error";
      }
    }
    return { ok: false, error: lastErr || "Max retries reached" };
    };

  const runWithConcurrency = async (items, worker, concurrency = 3) => {
    const results = new Array(items.length);
    let idx = 0;
    async function runner() {
      while (true) {
        const i = idx++;
        if (i >= items.length) break;
        results[i] = await worker(items[i], i);
      }
    }
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runner());
    await Promise.all(workers);
    return results;
  };

  const fetchBatch2024 = async () => {
    if (inFlightRef.current) return;             
    const place = selectedMunicipio;
    if (!place) return;

    try {
      setBatchLoading(true); setBatchErr(""); setBatchResults([]);
      inFlightRef.current = true;


      let map = {};
      try { map = JSON.parse(localStorage.getItem("fechasCosecha") || "{}"); } catch { map = {}; }
      const entries = Object.entries(map);
      if (!entries.length) throw new Error("No hay fechas de cosecha guardadas (localStorage['fechasCosecha']).");

      const prodToDate = entries.map(([producto, fecha]) => ({ producto, date2024: toYear2024(fecha) }));
      const uniqueDates = Array.from(new Set(prodToDate.map(e => e.date2024).filter(Boolean)));

      const hash = buildFechasHash();
      if (hash === lastHashRef.current && uniqueDates.every(d => dateCacheRef.current.has(d))) {
        const out = prodToDate.map(({ producto, date2024 }) => {
          const cached = dateCacheRef.current.get(date2024);
          if (!cached) return { producto, date2024, wx: null, error: "Sin cache" };
          return cached.ok ? { producto, date2024, wx: cached.json, error: "" }
                           : { producto, date2024, wx: null, error: cached.error || "Error API" };
        });
        setBatchResults(out);
        return;
      }

      const toFetch = uniqueDates.filter(d => !dateCacheRef.current.has(d));
      await runWithConcurrency(toFetch, async (d) => {
        const url = `${API_BASE}/daily?place=${encodeURIComponent(place)}&date=${d}`;
        const res = await fetchWithRetry(url, 3);
        dateCacheRef.current.set(d, res);
      }, 3);

      const results = prodToDate.map(({ producto, date2024 }) => {
        const cached = dateCacheRef.current.get(date2024);
        if (!cached) return { producto, date2024, wx: null, error: "Fecha inválida" };
        return cached.ok ? { producto, date2024, wx: cached.json, error: "" }
                         : { producto, date2024, wx: null, error: cached.error || "Error API" };
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
      const hasFechas = Object.keys(obj).length > 0;
      if (selectedMunicipio && hasFechas) fetchBatch2024();
    };
    run();
    const onStorage = (e) => { if (e.key === "fechasCosecha") run(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);

  }, [selectedMunicipio]);

  const merged = useMemo(() => {
    if (!muniData) return [];
    const apiByProd = new Map(batchResults.map(r => [r.producto?.toLowerCase(), r]));
    const results = (muniData.productos || []).map(p => {
      const r = apiByProd.get(p.producto?.toLowerCase());
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
        date2024: r?.date2024 || "",
        temp_avg_c: tempAvg,
        temp_min_c: m?.temp_min_c,
        temp_max_c: m?.temp_max_c,
        humidity: hum,
        precip_mm: m?.precip_mm ?? 0,
        wind_kph: m?.wind_kph,
        cloudcover: m?.cloudcover,
        source: r?.wx?.source,
        estado: r?.error ? `Error: ${r.error}` : (r ? "OK" : "—"),
        tmin_opt: p.temp_min,
        tmax_opt: p.temp_max,
        hmin_opt: p.humedad_min,
        hmax_opt: p.humedad_max,
        temp_ok,
        hum_ok,
        puntos,
      };
    });

    const puntuaciones = {};
    for (const r of results) {
      puntuaciones[r.producto] = r.puntos;
    }
    try { localStorage.setItem("puntuacionesProductos", JSON.stringify(puntuaciones)); } catch {}

    console.log("📊 PUNTUACIONES POR PRODUCTO:");
    results.forEach(r => console.log(`   ${r.producto}: ${r.puntos}`));
    const total = results.reduce((acc, r) => acc + r.puntos, 0);
    console.log("👉 TOTAL PUNTOS:", total);

    return [...results, { producto: "TOTAL", puntos: total }];
  }, [muniData, batchResults]);

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: 16 }}>
      <h2 style={{ margin: 0 }}>Comparación clima (API 2024) vs rangos óptimos (BD)</h2>
      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
        Municipio: <strong>{selectedMunicipio || "—"}</strong> · Siembra seleccionada: <strong>{normalizeDate(selectedDate) || "—"}</strong>
      </div>

      {(batchLoading || prodLoading) && <p style={{ marginTop: 10 }}>Cargando…</p>}
      {(batchErr || prodErr) && <p style={{ marginTop: 10, color: "crimson" }}>{batchErr || prodErr}</p>}

      {merged.length > 0 && (
        <div style={{ marginTop: 12, overflowX: "auto", border: "1px solid #e4e7ec", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <th style={th}>Producto</th>
                <th style={th}>Fecha consulta (2024)</th>
                <th style={th}>Temp prom (°C)</th>
                <th style={th}>Mín / Máx (°C)</th>
                <th style={th}>Humedad (%)</th>
                <th style={th}>Precip (mm)</th>
                <th style={th}>Viento (km/h)</th>
                <th style={th}>Nubosidad (%)</th>
                <th style={th}>Fuente</th>
                <th style={th}>Estado</th>
                <th style={th}>Temp óptima (°C)</th>
                <th style={th}>Humedad óptima (%)</th>
                <th style={th}>¿Temp en rango?</th>
                <th style={th}>¿Humedad en rango?</th>
                <th style={th}>Puntuación</th>
              </tr>
            </thead>
            <tbody>
              {merged.map((row) => (
                <tr key={row.producto} style={{ borderTop: "1px solid #f1f5f9", background: row.producto === "TOTAL" ? "#f1f5f9" : "transparent" }}>
                  <td style={tdBold}>{row.producto}</td>
                  {row.producto !== "TOTAL" ? (
                    <>
                      <td style={td}>{row.date2024 || "—"}</td>
                      <td style={td}>{fmt(row.temp_avg_c)}</td>
                      <td style={td}>{fmt(row.temp_min_c)} / {fmt(row.temp_max_c)}</td>
                      <td style={td}>{fmt(row.humidity)}</td>
                      <td style={td}>{fmt(row.precip_mm)}</td>
                      <td style={td}>{row.wind_kph != null ? `${row.wind_kph}` : "—"}</td>
                      <td style={td}>{row.cloudcover != null ? `${row.cloudcover}` : "—"}</td>
                      <td style={td}>{row.source || "—"}</td>
                      <td style={{ ...td, color: row.estado?.startsWith("Error") ? "crimson" : "#0a7f2f" }}>{row.estado}</td>
                      <td style={td}>{fmt(row.tmin_opt)} – {fmt(row.tmax_opt)}</td>
                      <td style={td}>{fmt(row.hmin_opt)} – {fmt(row.hmax_opt)}</td>
                      <td style={{ ...td, fontWeight: 700, color: row.temp_ok == null ? "#6b7280" : row.temp_ok ? "#0a7f2f" : "#b91c1c" }}>
                        {row.temp_ok == null ? "—" : row.temp_ok ? "Sí" : "No"}
                      </td>
                      <td style={{ ...td, fontWeight: 700, color: row.hum_ok == null ? "#6b7280" : row.hum_ok ? "#0a7f2f" : "#b91c1c" }}>
                        {row.hum_ok == null ? "—" : row.hum_ok ? "Sí" : "No"}
                      </td>
                      <td style={{ ...td, fontWeight: 700 }}>{row.puntos}</td>
                    </>
                  ) : (
                    <td colSpan={14} style={{ ...td, fontWeight: 700, textAlign: "right" }}>
                      TOTAL PUNTOS: {row.puntos}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #eaecef", whiteSpace: "nowrap" };
const td = { padding: "10px 12px", verticalAlign: "top" };
const tdBold = { ...td, fontWeight: 600 };
