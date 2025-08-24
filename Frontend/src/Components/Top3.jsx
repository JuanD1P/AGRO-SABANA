import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

function parseFecha(str) {
  if (!str) return null;
  const s = String(str).trim();

  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (ymd) {
    const [, y, m, d] = ymd;
    return new Date(Number(y), Number(m) - 1, Number(d), 12); 
  }

  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
  if (dmy) {
    const [, d, mo, y] = dmy;
    return new Date(Number(y), Number(mo) - 1, Number(d), 12);
  }

  const meses = {
    enero:0, ene:0, febrero:1, feb:1, marzo:2, mar:2, abril:3, abr:3, mayo:4,
    junio:5, jun:5, julio:6, jul:6, agosto:7, ago:7,
    septiembre:8, setiembre:8, sept:8, sep:8,
    octubre:9, oct:9, noviembre:10, nov:10, diciembre:11, dic:11
  };
  const r = /^(\d{1,2})\s*(?:de\s*)?([a-záéíóúñ\.]+)\s*(\d{4})?$/i.exec(s.toLowerCase().replace(/\./g,''));
  if (r) {
    const d = Number(r[1]);
    const mes = meses[r[2]];
    const y = r[3] ? Number(r[3]) : new Date().getFullYear();
    if (mes != null) return new Date(y, mes, d, 12);
  }

  return null;
}

function toNoonLocal(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

function addDays(date, days) {
  const base = toNoonLocal(date);
  const res = new Date(base);
  res.setDate(res.getDate() + Number(days));
  return res;
}

function fDate(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function toYMD(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fmt(v, suf = "") {
  if (v === null || v === undefined) return "—";
  return `${v}${suf}`;
}

const Top3 = () => {
  const [muni, setMuni] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedMunicipio = useMemo(() => {
    try { return localStorage.getItem("municipioSeleccionado") || ""; } catch { return ""; }
  }, []);

  const selectedFechaStr = useMemo(() => {
    try { return localStorage.getItem("fechaSeleccionada") || ""; } catch { return ""; }
  }, []);

  const fechaSiembra = useMemo(() => parseFecha(selectedFechaStr), [selectedFechaStr]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedMunicipio) {
        setError("No has seleccionado un municipio.");
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get("http://localhost:3000/productos/municipios-productos", {
          withCredentials: true,
        });
        if (!res.data?.ok) throw new Error("Respuesta inválida");

        const found = (res.data.data || []).find(
          m => m.municipio.toLowerCase() === selectedMunicipio.toLowerCase()
        );
        if (!found) {
          setError(`No encontré datos para "${selectedMunicipio}".`);
        } else {
          found.productos.sort((a,b)=>a.producto.localeCompare(b.producto,"es"));
          setMuni(found);
        }
      } catch (e) {
        console.error(e);
        setError("No se pudo cargar la información.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedMunicipio]);

  useEffect(() => {
    if (fechaSiembra && muni) {
      const cosechas = {};
      (muni.productos || []).forEach((p) => {
        if (p?.ciclo_dias != null) {
          const cosecha = addDays(fechaSiembra, p.ciclo_dias);
          cosechas[p.producto] = toYMD(cosecha);
        }
      });
      try {
        localStorage.setItem("fechasCosecha", JSON.stringify(cosechas));
        console.log("[Top3] fechas de cosecha guardadas:", cosechas);
      } catch (e) {
        console.warn("[Top3] No se pudo guardar fechasCosecha en localStorage:", e);
      }
    }
  }, [fechaSiembra, muni]);

  if (loading) return <div style={{ padding: 16 }}>Cargando…</div>;
  if (error) return <div style={{ padding: 16, color: "#b91c1c", background: "#fee2e2", borderRadius: 12 }}>{error}</div>;
  if (!muni) return null;

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #1b2e22, #264734)",
          color: "#e8f0ea",
          borderRadius: 16,
          padding: "18px 20px",
          boxShadow: "0 10px 24px rgba(6,19,12,0.25)",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 24 }}>🌿 {muni.municipio}</h2>
        <div style={{ fontSize: 13, opacity: 0.95, marginTop: 6 }}>
          Siembra seleccionada: <strong>{selectedFechaStr || "—"}</strong>{" "}
          {fechaSiembra && <span style={{ opacity: 0.9 }}>({fDate(fechaSiembra)})</span>}
        </div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
          Productos: {muni.productos.length}
        </div>
      </div>

      <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e4e7ec", borderRadius: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f8fafc" }}>
            <tr>
              <th style={{ textAlign: "left", padding: "12px 14px", borderBottom: "1px solid #eaecef" }}>Producto</th>
              <th style={{ textAlign: "left", padding: "12px 14px", borderBottom: "1px solid #eaecef" }}>Ciclo (días)</th>
              <th style={{ textAlign: "left", padding: "12px 14px", borderBottom: "1px solid #eaecef" }}>Temp. mín (°C)</th>
              <th style={{ textAlign: "left", padding: "12px 14px", borderBottom: "1px solid #eaecef" }}>Temp. máx (°C)</th>
              <th style={{ textAlign: "left", padding: "12px 14px", borderBottom: "1px solid #eaecef" }}>Humedad mín (%)</th>
              <th style={{ textAlign: "left", padding: "12px 14px", borderBottom: "1px solid #eaecef" }}>Humedad máx (%)</th>
              <th style={{ textAlign: "left", padding: "12px 14px", borderBottom: "1px solid #eaecef" }}>Fecha de siembra</th>
              <th style={{ textAlign: "left", padding: "12px 14px", borderBottom: "1px solid #eaecef" }}>Fecha estimada de cosecha</th>
            </tr>
          </thead>
          <tbody>
            {muni.productos.map((p) => {
              const ciclo = p.ciclo_dias;
              const cosecha = (fechaSiembra && ciclo != null) ? addDays(fechaSiembra, ciclo) : null;

              return (
                <tr key={p.producto_id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 14px" }}>{p.producto}</td>
                  <td style={{ padding: "10px 14px" }}>{ciclo != null ? ciclo : "—"}</td>

                  <td style={{ padding: "10px 14px" }}>{fmt(p.temp_min, "°C")}</td>
                  <td style={{ padding: "10px 14px" }}>{fmt(p.temp_max, "°C")}</td>
                  <td style={{ padding: "10px 14px" }}>{fmt(p.humedad_min, "%")}</td>
                  <td style={{ padding: "10px 14px" }}>{fmt(p.humedad_max, "%")}</td>

                  <td style={{ padding: "10px 14px" }}>
                    {fechaSiembra ? fDate(fechaSiembra) : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>
                    {cosecha ? fDate(cosecha) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!fechaSiembra && (
        <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
          Tip: guarda una fecha en <code>localStorage["fechaSeleccionada"]</code> (por ejemplo, <code>2025-09-30</code> o <code>30/09/2025</code>) para ver las fechas estimadas de cosecha.
        </div>
      )}
    </div>
  );
};

export default Top3;
