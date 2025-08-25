import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DOCSS/Mercado.css";

const API_BASE = "http://localhost:3000/openmeteo";
const HIDE_WIND = true; 
const toYear2024 = (ymd) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [, , mm, dd] = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/) || [];
  if (!mm || !dd) return "";
  return (mm === "02" && dd === "29") ? "2024-02-28" : `2024-${mm}-${dd}`;
};

const formatPrettyDateShort = (ymd) => {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "—";
  const d = new Date(`${ymd}T00:00:00`);
  if (isNaN(d)) return "—";
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
};

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const skyState = (cloudcover = null, precip = null) => {
  if (precip != null && precip >= 10) return "Lluvias fuertes";
  if (precip != null && precip >= 1) return "Chubascos";
  if (cloudcover != null) {
    if (cloudcover >= 75) return "Mayormente nublado";
    if (cloudcover >= 40) return "Parcialmente nublado";
    return "Despejado";
  }
  return "—";
};

const normalizeTrend = (raw = "") => {
  const s = String(raw).trim().toUpperCase();
  if (["ALTO", "ALTA", "HIGH"].includes(s)) return "ALTO";
  if (["BAJO", "BAJA", "LOW"].includes(s)) return "BAJO";
  if (["NEUTRO", "NEUTRA", "NEUTRAL", "MEDIA", "MEDIO", "PROMEDIO"].includes(s)) return "NEUTRO";
  return "NEUTRO";
};

const trendExplain = (t) => {
  const n = normalizeTrend(t);
  if (n === "ALTO")   return "los precios suelen ubicarse por encima de la media y pueden acercarse al máximo.";
  if (n === "BAJO")   return "los precios tienden a bajar hacia la media o por debajo.";
  return "los precios se mantienen cerca de la media histórica.";
};


const buildAdvices = (m = {}) => {
  const out = [];
  if (m.precip_mm >= 10) out.push("Prepara drenajes y zanjas; evita labores que compacten el suelo durante el evento.");
  else if (m.precip_mm >= 3) out.push("Revisa escorrentías y protege zonas bajas; evita riegos adicionales.");

  if (m.humidity >= 85) out.push("Vigila hongos (mildiu, botrytis); mejora ventilación y elimina follaje en exceso.");
  else if (m.humidity <= 45) out.push("Humedad baja: monitorea estrés hídrico y usa mulch para conservar humedad.");

  if (m.temp_min_c != null && m.temp_min_c <= 6) out.push("Riesgo de frío nocturno: usa coberturas ligeras o microtúneles.");
  if (m.temp_max_c != null && m.temp_max_c >= 28) out.push("Calor diurno: riega temprano y evita labores fuertes al mediodía.");

  if (m.cloudcover >= 70) out.push("Poca insolación: reduce fertilizaciones nitrogenadas altas que fomentan tejido blando.");

  if (!HIDE_WIND) {
    if (m.wind_gust_kph >= 60) out.push("Refuerza tutores y amarres por ráfagas fuertes.");
    else if (m.wind_kph >= 25) out.push("Viento moderado: evita aplicaciones foliares en horas ventosas.");
  }

  out.push("Mantén cobertura/mulch para estabilidad térmica y conservación de humedad.");
  out.push("Prioriza control de malezas tras la lluvia para mayor eficacia.");
  out.push("Si la fecha es cercana a cosecha, recolecta en horas secas para evitar pérdidas por humedad.");

  return Array.from(new Set(out));
};

export default function Mercado() {
  const navigate = useNavigate();

  const [producto, setProducto] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [fechaCosecha, setFechaCosecha] = useState("");
  const [fecha2024, setFecha2024] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [apiData, setApiData] = useState(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyErr, setMonthlyErr] = useState("");
  const [monthlyItem, setMonthlyItem] = useState(null); 

  useEffect(() => {
    const prod = localStorage.getItem("productoSeleccionado") || "";
    setProducto(prod);

    const muni = localStorage.getItem("municipioSeleccionado") || "";
    setMunicipio(muni);

    let mapa = {};
    try { mapa = JSON.parse(localStorage.getItem("fechasCosecha") || "{}"); } catch { mapa = {}; }
    const fecha = prod ? (mapa?.[prod] || "") : "";
    setFechaCosecha(fecha);
    setFecha2024(fecha ? toYear2024(fecha) : "");
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!municipio || !fecha2024) return;
      setLoading(true); setErr(""); setApiData(null);
      try {
        const url = `${API_BASE}/daily?place=${encodeURIComponent(municipio)}&date=${fecha2024}`;
        const res = await fetch(url);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        setApiData(json);
      } catch (e) {
        setErr(e.message || "Error consultando clima 2024");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [municipio, fecha2024]);

  useEffect(() => {
    const run = async () => {
      if (!producto) return;
      setMonthlyLoading(true); setMonthlyErr(""); setMonthlyItem(null);
      try {
        const res = await fetch("/DatosMensuales.json", { cache: "no-cache" });
        if (!res.ok) throw new Error(`No pude cargar DatosMensuales.json (HTTP ${res.status})`);
        const json = await res.json();
        const item = (Array.isArray(json) ? json : []).find(
          it => (it?.producto || "").toLowerCase().trim() === producto.toLowerCase().trim()
        );
        if (!item) throw new Error(`No hay datos mensuales para "${producto}".`);
        setMonthlyItem(item);
      } catch (e) {
        setMonthlyErr(e.message || "Error leyendo DatosMensuales.json");
      } finally {
        setMonthlyLoading(false);
      }
    };
    run();
  }, [producto]);

  const loc = apiData?.location?.name || municipio || "—";
  const m = apiData?.metrics || {};
  const estadoCielo = skyState(m.cloudcover, m.precip_mm);
  const advices = useMemo(() => buildAdvices(m), [m]);

  const fechaBonita = formatPrettyDateShort(fechaCosecha);
  const fecha2024Bonita = formatPrettyDateShort(fecha2024);

  const monthIndexCosecha = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaCosecha)) return null;
    const d = new Date(`${fechaCosecha}T00:00:00`);
    if (isNaN(d)) return null;
    return d.getMonth(); 
  }, [fechaCosecha]);

  const resumenMensual = useMemo(() => {
    if (!monthlyItem || monthIndexCosecha == null) return null;
    const mesNombre = MONTHS_ES[monthIndexCosecha];
    const found = (monthlyItem.datos || []).find(
      (row) => String(row.mes || "").toLowerCase().trim() === mesNombre.toLowerCase().trim()
    );
    if (!found) return { mes: mesNombre, existe: false };

    const puntos = Number(found.puntos);
    const tendenciaNorm = normalizeTrend(found.tendencia);
    const descPuntos =
      puntos === 1 ? "peor del año" :
      (puntos >= 2 && puntos <= 4) ? "zona mala" :
      (puntos >= 5 && puntos <= 7) ? "zona buena" :
      (puntos >= 10 && puntos <= 11) ? "muy altos" :
      (puntos === 12) ? "mejor del año" : "zona alta"; // 8–9

    return {
      mes: mesNombre,
      existe: true,
      puntos,
      precio_min: Number(found.precio_min),
      precio_max: Number(found.precio_max),
      precio_promedio: Number(found.precio_promedio),
      tendencia: tendenciaNorm,         
      explicacionTendencia: trendExplain(tendenciaNorm),
      descripcionPuntos: descPuntos
    };
  }, [monthlyItem, monthIndexCosecha]);

  const graphData = useMemo(() => {
    if (!monthlyItem) return [];
    const byName = new Map((monthlyItem.datos || []).map(d => [String(d.mes || "").toLowerCase(), d]));
    return MONTHS_ES.map((name, i) => {
      const row = byName.get(name.toLowerCase());
      return {
        i,
        mes: name.slice(0,3),
        full: name,
        min: row ? Number(row.precio_min) : null,
        avg: row ? Number(row.precio_promedio) : null,
        max: row ? Number(row.precio_max) : null,
        tendencia: row ? normalizeTrend(row.tendencia) : null,
        puntos: row ? Number(row.puntos) : null,
      };
    });
  }, [monthlyItem]);

  return (
    <div className="mkd-root">
      <header className="mkd-head">
        <button className="mkd-back mkd-back--pretty" onClick={() => navigate("/Top3")}>
          <span className="mkd-back-icon" aria-hidden>⬅️</span>
          Volver al Top 3
        </button>

        <h1 className="mkd-title">
          Vas a cosechar <span className="mkd-prod">{producto || "—"}</span>
        </h1>
        <p className="mkd-sub">Por lo que debes tener en cuenta estas variables climatológicas</p>
        <div className="mkd-chips">
          <span className="chip">{loc}</span>
          <span className="chip">Cosecha: {fechaBonita || "—"}</span>
          <span className="chip">Referencia clima 2024: {fecha2024Bonita || "—"}</span>
          <span className="chip chip-soft">{estadoCielo}</span>
        </div>
      </header>

      {loading && !err && (
        <div className="mkd-loading" aria-live="polite" aria-busy="true">
          <div className="mkd-ring" />
          <span>Cargando clima para {fecha2024 || "—"}…</span>
        </div>
      )}
      {err && <div className="mkd-callout mkd-danger"><strong>Ups:</strong> {err}</div>}

      {!err && apiData && (
        <>
          <section className="mkd-now">
            <div className="mkd-now-left">
              <div className="mkd-state">{estadoCielo}</div>
              <div className="mkd-temp">
                {m?.temp_avg_c != null ? `${Math.round(m.temp_avg_c)}°C` : "—"}
              </div>
              <div className="mkd-temp-sub">
                {m?.temp_avg_c != null ? `Promedio` : ""}{m?.temp_min_c != null || m?.temp_max_c != null ? " · " : ""}
                {m?.temp_min_c != null ? `Mín ${m.temp_min_c.toFixed(1)}°C` : ""}
                {m?.temp_min_c != null && m?.temp_max_c != null ? " · " : ""}
                {m?.temp_max_c != null ? `Máx ${m.temp_max_c.toFixed(1)}°C` : ""}
              </div>
            </div>

            <div className="mkd-now-right">
              <Row label="Humedad relativa" val={m?.humidity != null ? `${m.humidity}%` : "—"} />
              <Row label="Precipitación" val={m?.precip_mm != null ? `${m.precip_mm} mm` : "—"} />
              <Row label="Nubosidad" val={m?.cloudcover != null ? `${m.cloudcover}%` : "—"} />
              {!HIDE_WIND && (
                <>
                  <Row label="Viento"   val={m?.wind_kph != null ? `${Math.round(m.wind_kph)} km/h` : "—"} />
                  <Row label="Ráfagas"  val={m?.wind_gust_kph != null ? `${Math.round(m.wind_gust_kph)} km/h` : "—"} />
                </>
              )}
              <Row label="Fecha (API)" val={apiData?.date ? formatPrettyDateShort(apiData.date) : "—"} />
              <Row label="Fuente"     val={apiData?.source || "—"} />
            </div>
          </section>

          <section className="mkd-advice">
            <h3>Recomendaciones para tu cosecha</h3>
            <ul>{buildAdvices(m).map((t, i) => <li key={i}>{t}</li>)}</ul>
          </section>
        </>
      )}

      {monthlyLoading && (
        <div className="mkd-loading" aria-live="polite" aria-busy="true">
          <div className="mkd-ring" />
          <span>Procesando datos mensuales…</span>
        </div>
      )}
      {monthlyErr && <div className="mkd-callout">{monthlyErr}</div>}

      {monthlyItem && resumenMensual && (
        <section className="mkd-month-summary">
          <h3>Comportamiento de precios — {resumenMensual.mes}</h3>

          {resumenMensual.existe ? (
            <p className="mkd-month-text">
              En <strong>{resumenMensual.mes}</strong> el producto <strong>{monthlyItem.producto}</strong> obtuvo
              una <strong>puntuación {resumenMensual.puntos}</strong> ({resumenMensual.descripcionPuntos}).{" "}
              El precio <strong>mínimo</strong> fue <strong>${resumenMensual.precio_min?.toLocaleString("es-CO")}</strong>,{" "}
              el <strong>máximo</strong> <strong>${resumenMensual.precio_max?.toLocaleString("es-CO")}</strong>,{" "}
              con un <strong>promedio</strong> de <strong>${resumenMensual.precio_promedio?.toLocaleString("es-CO")}</strong>;{" "}
              la <strong>tendencia</strong> es <strong>{resumenMensual.tendencia}</strong>, lo cual indica que {resumenMensual.explicacionTendencia}
            </p>
          ) : (
            <p className="mkd-month-text">
              No encontré datos de {monthlyItem.producto} para <strong>{resumenMensual.mes}</strong>.
            </p>
          )}
        </section>
      )}

      {graphData.length > 0 && (
        <section className="mkd-chart">
          <h3>Rango de precios por mes</h3>
          <PriceRangeChart
            data={graphData}
            highlightIndex={monthIndexCosecha}
          />
          <div className="mkd-legend">
            <span><i className="lg lg-range" /> Rango (mín→máx)</span>
            <span><i className="lg lg-avg" /> Promedio</span>
            {monthIndexCosecha != null && <span className="chip chip-soft">Mes de cosecha resaltado</span>}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ label, val }) {
  return (
    <div className="mkd-row">
      <span className="mkd-row-label">{label}</span>
      <span className="mkd-row-val">{val}</span>
    </div>
  );
}

function PriceRangeChart({ data, highlightIndex }) {
  const rows = data.map(d => ({
    ...d, min: d.min ?? 0, avg: d.avg ?? 0, max: d.max ?? 0
  }));
  const maxVal = Math.max(...rows.flatMap(r => [r.min, r.avg, r.max, 1]));
  const height = 260;
  const topPad = 16, bottomPad = 34, leftPad = 48, rightPad = 16;


  const colW = 56;         
  const rangeW = 8;        
  const dotR = 4.5;          
  const totalW = leftPad + rightPad + rows.length * colW;

  const yScale = (v) => {
    const h = height - topPad - bottomPad;
    return topPad + (1 - v / maxVal) * h;
  };


  const [tip, setTip] = useState(null);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(maxVal * t));

  return (
    <div className="mkd-chart-wrap">
      <svg className="mkd-svg" viewBox={`0 0 ${totalW} ${height}`} role="img" aria-label="Rango de precios por mes">
  
        {ticks.map((val, i) => {
          const y = yScale(val);
          return (
            <g key={i}>
              <line x1={leftPad} x2={totalW - rightPad} y1={y} y2={y} className="mkd-grid" />
              <text x={leftPad - 10} y={y} className="mkd-y" textAnchor="end" dominantBaseline="middle">
                ${val.toLocaleString("es-CO")}
              </text>
            </g>
          );
        })}

  
        {rows.map((r, idx) => {
          const cx = leftPad + idx * colW + colW / 2;

          const yMin = yScale(r.min);
          const yMax = yScale(r.max);
          const yAvg = yScale(r.avg);

          const isHighlight = highlightIndex === idx;

          return (
            <g key={r.full}
               className={`mkd-g ${isHighlight ? "hl" : ""}`}
               onMouseMove={(e) => {
                 const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                 setTip({
                   x: e.clientX - rect.left + 12,
                   y: e.clientY - rect.top - 12,
                   content:
                     `<b>${r.full}</b><br/>
                      Min: $${r.min.toLocaleString("es-CO")}<br/>
                      Prom: $${r.avg.toLocaleString("es-CO")}<br/>
                      Máx: $${r.max.toLocaleString("es-CO")}`
                 });
               }}
               onMouseLeave={() => setTip(null)}
            >
   
              {isHighlight && (
                <rect
                  x={cx - 20} y={topPad - 6} width={40} height={height - topPad - bottomPad + 12}
                  rx="10" className="mkd-halo"
                />
              )}

    
              <line x1={cx} x2={cx} y1={yMax} y2={yMin} className="mkd-range" />
              <rect x={cx - rangeW/2} y={yMax} width={rangeW} height={yMin - yMax} rx="4" className="mkd-range-bar" />

                    <circle cx={cx} cy={yAvg} r={dotR} className="mkd-dot" />

              <text x={cx} y={height - 10} className="mkd-x" textAnchor="middle">{r.mes}</text>
            </g>
          );
        })}
      </svg>

      {tip && (
        <div
          className="mkd-tip"
          style={{ left: tip.x, top: tip.y }}
          dangerouslySetInnerHTML={{ __html: tip.content }}
        />
      )}
    </div>
  );
}
