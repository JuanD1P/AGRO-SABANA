import { useEffect, useMemo, useRef, useState } from "react";
import './DOCSS/Recomendacion.css';

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

  const normName = (s = "") => {
    try {
      return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
    } catch {
      return s.toLowerCase().trim();
    }
  };

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
    for (const r of results) puntuaciones[r.producto] = r.puntos;
    try { localStorage.setItem("puntuacionesProductos", JSON.stringify(puntuaciones)); } catch {}

    const total = results.reduce((acc, r) => acc + r.puntos, 0);
    return [...results, { producto: "TOTAL", puntos: total, cont: 0 }];
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
    const rows = [];
    if (!rankData.length) return rows;

    const rankByName = new Map(rankData.map(item => [normName(item.nombre), item]));
    const products = merged.filter(r => r.producto !== "TOTAL");
    if (!products.length) return rows;

    products.forEach((p) => {
      const mIdx = getMonthIndexForProduct(p);
      if (mIdx == null) {
        rows.push({ producto: p.producto, mes: "—", puesto: "—", cont: p.cont ?? 0, puntosClima: p.puntos ?? 0, puntosFinales: (p.puntos ?? 0) - (0.4 * (p.cont ?? 0)) });
        return;
      }
      const mesKey = monthKeys[mIdx];
      const mesTxt = monthLabel(mIdx);

      const item = rankByName.get(normName(p.producto));
      const puesto = item?.ranking?.[mesKey] ?? "—";
      const puestoNum = (puesto !== "—" && !Number.isNaN(Number(puesto))) ? Number(puesto) : 0;

      const puntosClima = p.puntos ?? 0;
      const puntosCont = (p.cont ?? 0) * 0.4;
      const puntosFinales = puntosClima + puestoNum - puntosCont;

      rows.push({
        producto: p.producto,
        mes: mesTxt,
        puesto: puesto,
        cont: p.cont ?? 0,
        puntosClima,
        puntosFinales
      });
    });

    return rows;
  }, [merged, rankData, selectedDate]);

  useEffect(() => {
    if (!rankingRows.length) return;
    const finales = {};
    rankingRows.forEach(r => {
      if (r.producto && r.producto !== "TOTAL") finales[r.producto] = r.puntosFinales ?? 0;
    });
    try { localStorage.setItem("puntuacionesFinales", JSON.stringify(finales)); } catch {}
  }, [rankingRows]);

  // ====== UI ======
  return (
    <div className="recx-root recx-theme-light">
      <header className="recx-hero">
        <div className="recx-hero-glass">
          <button
            type="button"
            className="recx-backlink"
            onClick={() => { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {} window.location.assign('/Top3'); }}
            aria-label="Volver a Top3"
          >
            <span aria-hidden>←</span> Volver a Top3
          </button>

          <h2 className="recx-title">Comparación clima (API 2024) vs rangos óptimos (BD)</h2>
          <div className="recx-meta">
            Municipio: <strong>{selectedMunicipio || "—"}</strong>
            <span className="recx-dot">•</span>
            Siembra seleccionada: <strong>{normalizeDate(selectedDate) || "—"}</strong>
          </div>

          {(batchLoading || prodLoading) && <p className="recx-status recx-status--loading">Cargando…</p>}
          {(batchErr || prodErr) && <p className="recx-status recx-status--error">{batchErr || prodErr}</p>}
        </div>
      </header>

      {merged.length > 0 && (
        <section className="recx-card recx-animate-up">
          <div className="recx-tableWrap">
            <table className="recx-table">
              <thead>
                <tr>
                  <th className="recx-th recx-th--sticky">Producto</th>
                  <th className="recx-th">Contador</th>
                  <th className="recx-th">Fecha consulta (2024)</th>
                  <th className="recx-th">Temp prom (°C)</th>
                  <th className="recx-th">Mín / Máx (°C)</th>
                  <th className="recx-th">Humedad (%)</th>
                  <th className="recx-th">Precip (mm)</th>
                  <th className="recx-th">Viento (km/h)</th>
                  <th className="recx-th">Nubosidad (%)</th>
                  <th className="recx-th">Fuente</th>
                  <th className="recx-th">Estado</th>
                  <th className="recx-th">Temp óptima (°C)</th>
                  <th className="recx-th">Humedad óptima (%)</th>
                  <th className="recx-th">¿Temp en rango?</th>
                  <th className="recx-th">¿Humedad en rango?</th>
                  <th className="recx-th">Puntos clima</th>
                </tr>
              </thead>
              <tbody>
                {merged.map((row) => (
                  <tr key={row.producto} className={`recx-tr ${row.producto === "TOTAL" ? "recx-tr--total" : ""}`}>
                    <td className="recx-td recx-td--bold recx-td--sticky">
                      <span className="recx-chip">{row.producto}</span>
                    </td>
                    {row.producto !== "TOTAL" ? (
                      <>
                        <td className="recx-td">{row.cont ?? 0}</td>
                        <td className="recx-td">{row.date2024 || "—"}</td>
                        <td className="recx-td">{fmt(row.temp_avg_c)}</td>
                        <td className="recx-td">{fmt(row.temp_min_c)} / {fmt(row.temp_max_c)}</td>
                        <td className="recx-td">
                          <div className="recx-bar" data-value={row.humidity ?? 0} title={`${row.humidity ?? "—"}%`}/>
                        </td>
                        <td className="recx-td">{fmt(row.precip_mm)}</td>
                        <td className="recx-td">{row.wind_kph != null ? `${row.wind_kph}` : "—"}</td>
                        <td className="recx-td">{row.cloudcover != null ? `${row.cloudcover}` : "—"}</td>
                        <td className="recx-td">{row.source || "—"}</td>
                        <td className={`recx-td ${row.estado?.startsWith("Error") ? "recx-badge recx-badge--error" : "recx-badge recx-badge--ok"}`}>{row.estado}</td>
                        <td className="recx-td">{fmt(row.tmin_opt)} – {fmt(row.tmax_opt)}</td>
                        <td className="recx-td">{fmt(row.hmin_opt)} – {fmt(row.hmax_opt)}</td>
                        <td className={`recx-td recx-td--flag ${row.temp_ok == null ? "recx-flag--na" : row.temp_ok ? "recx-flag--yes" : "recx-flag--no"}`}>
                          {row.temp_ok == null ? "—" : row.temp_ok ? "Sí" : "No"}
                        </td>
                        <td className={`recx-td recx-td--flag ${row.hum_ok == null ? "recx-flag--na" : row.hum_ok ? "recx-flag--yes" : "recx-flag--no"}`}>
                          {row.hum_ok == null ? "—" : row.hum_ok ? "Sí" : "No"}
                        </td>
                        <td className="recx-td">
                          <span className={`recx-pill ${row.puntos >= 0 ? "recx-pill--pos" : "recx-pill--neg"}`}>{row.puntos}</span>
                        </td>
                      </>
                    ) : (
                      <td className="recx-td recx-td--right recx-td--bold" colSpan={14}>
                        TOTAL PUNTOS (clima): {row.puntos}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <hr className="recx-sep" />
      <h2 className="recx-title">Ranking mensual por producto (Puntuacion.json) + Puntaje final</h2>
      {rankLoading && <p className="recx-status recx-status--loading">Cargando ranking…</p>}
      {rankErr && <p className="recx-status recx-status--error">Error: {rankErr}</p>}

      {rankingRows.length > 0 ? (
        <section className="recx-card recx-animate-up">
          <div className="recx-tableWrap">
            <table className="recx-table">
              <thead>
                <tr>
                  <th className="recx-th recx-th--sticky">Producto</th>
                  <th className="recx-th">Mes</th>
                  <th className="recx-th">Puesto</th>
                  <th className="recx-th">Contador</th>
                  <th className="recx-th">Puntos clima</th>
                  <th className="recx-th">Penalización (0.4 × cont)</th>
                  <th className="recx-th">Puntos finales</th>
                </tr>
              </thead>
              <tbody>
                {rankingRows.map((r) => {
                  const penal = (r.cont ?? 0) * 0.4;
                  return (
                    <tr key={`${r.producto}-${r.mes}`} className="recx-tr">
                      <td className="recx-td recx-td--bold recx-td--sticky">{r.producto}</td>
                      <td className="recx-td">{r.mes}</td>
                      <td className="recx-td">{r.puesto}</td>
                      <td className="recx-td">{r.cont ?? 0}</td>
                      <td className="recx-td">{r.puntosClima}</td>
                      <td className="recx-td">-{penal}</td>
                      <td className="recx-td">
                        <span className="recx-pill recx-pill--pos">{r.puntosFinales}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        !rankLoading && <p className="recx-empty">No hay filas de ranking para mostrar aún.</p>
      )}

      <hr className="recx-sep" />
      <h2 className="recx-title">Puntaje final ajustado por contador</h2>
      <div className="recx-card recx-card--compact recx-animate-up">
        {rankingRows.map(r => (
          <div key={`final-${r.producto}`} className="recx-line">
            <strong className="recx-chip">{r.producto}</strong>
            <span className="recx-lineScore">{r.puntosFinales}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const th = { textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #eaecef", whiteSpace: "nowrap" };
const td = { padding: "10px 12px", verticalAlign: "top" };
const tdBold = { ...td, fontWeight: 600 };
