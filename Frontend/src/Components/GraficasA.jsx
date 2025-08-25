import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Cell,
} from "recharts";
import "./DOCSS/GraficasA.css";

axios.defaults.withCredentials = true;

const api = axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: true,
});

export default function GraficasA() {
  const [municipios, setMunicipios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [openSet, setOpenSet] = useState(() => new Set());
  const [chartOpen, setChartOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErr("");
        const [mRes, pRes] = await Promise.all([
          api.get("/productos/municipios-productos"),
          api.get("/productos/productos"),
        ]);
        if (!mRes.data?.ok || !pRes.data?.ok) throw new Error("Respuesta inválida");
        const muni = (mRes.data.data || [])
          .map((x) => ({
            ...x,
            productos: [...(x.productos || [])].sort((a, b) =>
              (a.producto || "").localeCompare(b.producto || "")
            ),
          }))
          .sort((a, b) => a.municipio.localeCompare(b.municipio));
        setMunicipios(muni);
        setProductos((pRes.data.data || []).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      } catch (e) {
        console.error(e);
        setErr("No se pudo cargar la información.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const dataGraf = useMemo(() => {
    const rows = (productos || []).map((p) => ({
      producto: p.nombre,
      valor: Number(p.cont || 0),
    }));
    rows.sort((a, b) => b.valor - a.valor || a.producto.localeCompare(b.producto));
    return rows;
  }, [productos]);

  const maxVal = useMemo(
    () => Math.max(1, ...dataGraf.map((d) => d.valor)),
    [dataGraf]
  );
  const greenScale = (v) => {
    const t = maxVal ? v / maxVal : 0; 
    return `rgba(16,185,129, ${0.35 + t * 0.45})`;
  };

  const toggleMun = (id) =>
    setOpenSet((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const chartHeight = Math.min(900, Math.max(320, 38 * dataGraf.length + 80));

  if (loading) return <div className="gx2-state">Cargando…</div>;
  if (err) return <div className="gx2-state gx2-error">{err}</div>;

  return (
    <div className="gx2-page">
      <section className="gx2-section glass">
        <header className="gx2-head">
          <h2 className="gx2-title">Municipios y productos</h2>
          <div className="gx2-chips">
            <span className="gx2-chip">{municipios.length} municipios</span>
            <span className="gx2-chip">{productos.length} productos en total</span>
          </div>
        </header>

        <div className="gx2-accordGrid">
          {municipios.map((m) => {
            const open = openSet.has(m.municipio_id);
            return (
              <article key={m.municipio_id} className={`gx2-acc ${open ? "open" : ""}`}>
                <button className="gx2-accHead" onClick={() => toggleMun(m.municipio_id)}>
                  <div className="gx2-accLeft">
                    <span className="gx2-arrow" aria-hidden>▸</span>
                    <h3 className="gx2-muni">{m.municipio}</h3>
                  </div>
                  <span className="gx2-count">{m.productos.length} productos</span>
                </button>
                <div className="gx2-accBody">
                  {m.productos.length ? (
                    <ul className="gx2-tags">
                      {m.productos.map((p) => (
                        <li key={p.producto_id} className="gx2-tag">{p.producto}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="gx2-empty">Sin productos</div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="gx2-section glass">
        <header className="gx2-head">
          <h2 className="gx2-title">Interés por producto</h2>
          <p className="gx2-note">
            Aquí ves, para cada cultivo, cuántas personas han mostrado interés en sembrarlo.
            Ese interés se usa para comparar y priorizar qué productos impulsar.
          </p>
        </header>

        <div className="gx2-list">
          {productos.map((p) => (
            <div key={p.id} className="gx2-row">
              <span className="gx2-dot" />
              <span className="gx2-name">{p.nombre}</span>
              <span className="gx2-val">{Number(p.cont || 0)}</span>
            </div>
          ))}
          {!productos.length && <div className="gx2-emptyList">No hay productos.</div>}
        </div>

        <div className="gx2-chartToggle">
          <button
            className="gx2-btn"
            onClick={() => setChartOpen((s) => !s)}
            aria-expanded={chartOpen}
          >
            {chartOpen ? "Ocultar gráfica" : "Ver gráfica"}
          </button>
        </div>

        <div
          className={`gx2-chartWrap ${chartOpen ? "open" : ""}`}
          style={{ maxHeight: chartOpen ? chartHeight : 0 }}
          aria-hidden={!chartOpen}
        >
          {chartOpen && (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={dataGraf}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="producto"
                  width={200}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(v) => [`${v}`, "Interés"]}
                  labelFormatter={(l) => `Producto: ${l}`}
                />
                <Bar dataKey="valor" name="Interés" radius={[10, 10, 10, 10]}>
                  {dataGraf.map((d, i) => (
                    <Cell key={i} fill={greenScale(d.valor)} />
                  ))}
                  <LabelList dataKey="valor" position="right" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}
