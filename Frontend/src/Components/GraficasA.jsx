import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const GraficasA = () => {
  const [rows, setRows] = useState([]);         
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openIds, setOpenIds] = useState(new Set()); 
  const [q, setQ] = useState("");              

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
    return rows
      .map(m => ({
        ...m,
        productos: m.productos.filter(
          p =>
            p.producto.toLowerCase().includes(term) ||
            String(p.ciclo_dias || "").toLowerCase().includes(term)
        ),
      }))
      .filter(m =>
        m.municipio.toLowerCase().includes(term) || m.productos.length > 0
      );
  }, [rows, q]);

  const toggle = (id) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) return <div style={{ padding: 16 }}>Cargando…</div>;
  if (error) return <div style={{ padding: 16, color: "red" }}>{error}</div>;

  return (
    <div style={{ padding: 16, maxWidth: 960, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 8 }}>🌱 Municipios y productos</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar municipio o producto…"
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
            outline: "none",
          }}
        />
        <span style={{ fontSize: 12, color: "#666" }}>
          {filtered.length} municipios
        </span>
      </div>

      {filtered.length === 0 && (
        <div style={{ color: "#666" }}>Sin resultados.</div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.map((m) => {
          const isOpen = openIds.has(m.municipio_id);
          return (
            <div
              key={m.municipio_id}
              style={{
                border: "1px solid #e3e3e3",
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                background: "#fff",
              }}
            >
              <button
                onClick={() => toggle(m.municipio_id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  padding: "14px 16px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontWeight: 600,
                }}
              >
                <span>{m.municipio}</span>
                <span style={{ fontSize: 12, color: "#666" }}>
                  {m.productos.length} productos
                </span>
              </button>

              {isOpen && (
                <div style={{ padding: "0 16px 12px 16px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left" }}>
                        <th style={{ padding: "8px 0" }}>Producto</th>
                        <th style={{ padding: "8px 0" }}>Ciclo (días)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.productos.map((p) => (
                        <tr key={p.producto_id} style={{ borderTop: "1px solid #f0f0f0" }}>
                          <td style={{ padding: "8px 0" }}>{p.producto}</td>
                          <td style={{ padding: "8px 0" }}>
                            {p.ciclo_dias ?? "—"}
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

      <div style={{ marginTop: 16, fontSize: 12, color: "#777" }}>
        Tip: haz clic en el municipio para expandir/contraer.
      </div>
    </div>
  );
};

export default GraficasA;

