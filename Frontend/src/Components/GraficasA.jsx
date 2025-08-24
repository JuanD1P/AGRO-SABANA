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
  Legend,
  LabelList,
} from "recharts";
import "./DOCSS/GraficasA.css";

const GraficasA = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openIds, setOpenIds] = useState(new Set());
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await axios.get(
          "http://localhost:3000/productos/municipios-productos",
          { withCredentials: true }
        );
        if (!res.data?.ok) throw new Error("Respuesta inválida");
        setRows(res.data.data || []);
      } catch (e) {
        console.error(e);
        setError("No se pudo cargar la información.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const term = q.toLowerCase();
    const match = (v) => String(v ?? "").toLowerCase().includes(term);

    return rows
      .map((m) => ({
        ...m,
        productos: (m.productos || []).filter(
          (p) =>
            match(p.producto) ||
            match(p.ciclo_dias) ||
            match(p.temp_min) ||
            match(p.temp_max) ||
            match(p.humedad_min) ||
            match(p.humedad_max) ||
            match(p.cont)
        ),
      }))
      .filter((m) => match(m.municipio) || (m.productos || []).length > 0);
  }, [rows, q]);

  const toggle = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const num = (v) => (v == null || v === "" ? 0 : Number(v));

  // Datos para gráficas
  const cicloData = (p) => [{ name: "Ciclo", ciclo: num(p.ciclo_dias) }];
  const temperaturaData = (p) => [
    { name: "Temperatura", min: num(p.temp_min), max: num(p.temp_max) },
  ];
  const humedadData = (p) => [
    { name: "Humedad", min: num(p.humedad_min), max: num(p.humedad_max) },
  ];
  const contadorData = (p) => [{ name: "Contador", cont: num(p.cont) }];

  if (loading) return <div className="loading">Cargando…</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="graficasContainer">
      <h2 className="pageTitle">🌱 Municipios y productos</h2>

      <div className="searchRow">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar municipio o producto…"
          className="input"
        />
        <span className="mutedText">{filtered.length} municipios</span>
      </div>

      {filtered.length === 0 && <div className="mutedText">Sin resultados.</div>}

      <div className="cardGrid">
        {filtered.map((m) => {
          const isOpen = openIds.has(m.municipio_id);
          const totalCont = (m.productos || []).reduce(
            (acc, p) => acc + (Number(p.cont) || 0),
            0
          );

          return (
            <div key={m.municipio_id} className="card">
              <button onClick={() => toggle(m.municipio_id)} className="cardHeaderBtn">
                <span>{m.municipio}</span>
                <span className="mutedRow">
                  <span>{(m.productos || []).length} productos</span>
                  <span>∑ cont: {totalCont}</span>
                </span>
              </button>

              {isOpen && (
                <div className="tableWrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Ciclo (días)</th>
                        <th>Temp. mín</th>
                        <th>Temp. máx</th>
                        <th>Humedad mín</th>
                        <th>Humedad máx</th>
                        <th>Contador</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(m.productos || []).map((p, idx) => (
                        <tr key={p.producto_id} className={idx % 2 ? "zebra" : ""}>
                          <td>{p.producto ?? "—"}</td>
                          <td>{p.ciclo_dias ?? "—"}</td>
                          <td>{p.temp_min ?? "—"}</td>
                          <td>{p.temp_max ?? "—"}</td>
                          <td>{p.humedad_min ?? "—"}</td>
                          <td>{p.humedad_max ?? "—"}</td>
                          <td>{p.cont ?? 0}</td>
                          <td>
                            <button
                              onClick={() => setSelected({ municipio: m.municipio, producto: p })}
                              className="btnPrimary"
                            >
                              Ver gráficas
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selected && (
        <div role="dialog" aria-modal="true" onClick={() => setSelected(null)} className="backdrop">
          <div onClick={(e) => e.stopPropagation()} className="modal">
            <div className="modalHeader">
              <div>
                <div className="title">{selected.producto.producto}</div>
                <div className="subtitle">Municipio: {selected.municipio}</div>
              </div>
              <button onClick={() => setSelected(null)} className="iconBtn">
                ×
              </button>
            </div>

            {/* Definición del contador */}
            <div className="definitionBox">
              <strong>Contador (índice de favorabilidad):</strong>{" "}
              puntaje asignado a cada cultivo que combina:
              clima y humedad en rangos óptimos para el cultivo, y la demanda
              estimada del producto por persona. Un valor más alto indica
              mejores condiciones y oportunidad de siembra.
            </div>

            <div className="chartsGrid">
              <ChartCard title="Ciclo de días">
                <MiniBar
                  data={cicloData(selected.producto)}
                  bars={[{ key: "ciclo", name: "Días de ciclo", fill: "var(--brand-600)" }]}
                />
              </ChartCard>

              <ChartCard title="Temperatura (°C)">
                <MiniBar
                  data={temperaturaData(selected.producto)}
                  bars={[
                    { key: "min", name: "Mín", fill: "var(--orange-500)" },
                    { key: "max", name: "Máx", fill: "var(--red-500)" },
                  ]}
                />
              </ChartCard>

              <ChartCard title="Humedad relativa (%)">
                <MiniBar
                  data={humedadData(selected.producto)}
                  bars={[
                    { key: "min", name: "Mín", fill: "var(--teal-500)" },
                    { key: "max", name: "Máx", fill: "var(--brand-500)" },
                  ]}
                />
              </ChartCard>

              {/* NUEVA: Contador */}
              <ChartCard title="Contador (índice)">
                <MiniBar
                  data={contadorData(selected.producto)}
                  bars={[{ key: "cont", name: "Índice", fill: "var(--violet-500)" }]}
                />
              </ChartCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MiniBar = ({ data, bars }) => (
  <div style={{ width: "100%", height: 170 }}>
    <ResponsiveContainer>
      <BarChart data={data} margin={{ top: 6, right: 10, left: 2, bottom: 6 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        {bars.map((b) => (
          <Bar key={b.key} dataKey={b.key} name={b.name} fill={b.fill} radius={[8, 8, 0, 0]}>
            <LabelList dataKey={b.key} position="top" />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="chartCard">
    <div className="chartTitle">{title}</div>
    {children}
  </div>
);

export default GraficasA;
