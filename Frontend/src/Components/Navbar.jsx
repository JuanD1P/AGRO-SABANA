import { NavLink, useNavigate } from "react-router-dom";
import "./DOCSS/Navbar.css";
import logo from "../ImagenesP/ImagenesLogin/LOGO 2.0.png";
import { useEffect, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


export default function Navbar() {
  const navigate = useNavigate();

  const municipios = [
    "Bojacá","El Rosal","Subachoque","Zipacón","Mosquera","Madrid","Facatativá","Funza",
  ];

  const [ddMunicipioOpen, setDdMunicipioOpen] = useState(false);
  const [ddFechaOpen, setDdFechaOpen] = useState(false);

  const [selectedMunicipio, setSelectedMunicipio] = useState(
    () => localStorage.getItem("municipioSeleccionado") || ""
  );
  const [selectedDate, setSelectedDate] = useState(
    () => localStorage.getItem("fechaSeleccionada") || ""
  );

  const [muniQuery, setMuniQuery] = useState("");

  const muniRef = useRef(null);
  const fechaRef = useRef(null);

  useEffect(() => {
    if (selectedMunicipio) localStorage.setItem("municipioSeleccionado", selectedMunicipio);
  }, [selectedMunicipio]);
  useEffect(() => {
    if (selectedDate) localStorage.setItem("fechaSeleccionada", selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    const onClick = (e) => {
      if (muniRef.current && !muniRef.current.contains(e.target)) setDdMunicipioOpen(false);
      if (fechaRef.current && !fechaRef.current.contains(e.target)) setDdFechaOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { setDdMunicipioOpen(false); setDdFechaOpen(false); }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleSelectMunicipio = (muni) => {
    setSelectedMunicipio(muni);
    setDdMunicipioOpen(false);
    setMuniQuery("");
  };
  const handleSelectDate = (e) => setSelectedDate(e.target.value);
  const clearDate = () => setSelectedDate("");

  const setDateToday = () => {
    const d = new Date();
    const iso = d.toISOString().slice(0,10);
    setSelectedDate(iso);
    setDdFechaOpen(false);
  };
  const setDateTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const iso = d.toISOString().slice(0,10);
    setSelectedDate(iso);
    setDdFechaOpen(false);
  };

const handleBuscar = () => {
  if (!selectedMunicipio || !selectedDate) {
    toast.error("Selecciona municipio y fecha", {
      position: "top-right",
      autoClose: 1500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: "colored",
    });
    return;
  }
  navigate("/Top3");
  if (location.pathname === "/Top3") navigate(0);
};


  const filteredMunicipios = municipios.filter(m =>
    m.toLowerCase().includes(muniQuery.trim().toLowerCase())
  );


  const formatDateLongEs = (iso) => {
    if (!iso) return "";
 
    const d = new Date(`${iso}T00:00:00`);

    return d.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <nav className="asb-navbar">
      <div className="asb-navbar-inner">
        <NavLink to="/Inicio" className="asb-logo-link" aria-label="Inicio">
          <img src={logo} alt="Logo" className="asb-logo-img" />
        </NavLink>

        <div className="asb-controls">
          {/* MUNICIPIO */}
          <div className="asb-dd" ref={muniRef}>
            <button
              className="asb-btn"
              onClick={() => setDdMunicipioOpen(v => !v)}
              aria-haspopup="listbox"
              aria-expanded={ddMunicipioOpen}
            >
              <span className="asb-btn-text">
                {selectedMunicipio || "Municipio"}
              </span>
              <span className={`asb-chev ${ddMunicipioOpen ? "asb-rotate" : ""}`}>▾</span>
            </button>

            {ddMunicipioOpen && (
              <div className="asb-panel" role="listbox">
                <div className="asb-panel-head">
                  <input
                    type="text"
                    className="asb-dd-search"
                    placeholder="Buscar municipio..."
                    value={muniQuery}
                    onChange={(e) => setMuniQuery(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="asb-grid-list">
                  {filteredMunicipios.length === 0 && (
                    <div className="asb-empty">Sin resultados</div>
                  )}
                  {filteredMunicipios.map((m) => (
                    <button
                      key={m}
                      className={`asb-card-item ${selectedMunicipio === m ? "asb-active" : ""}`}
                      onClick={() => handleSelectMunicipio(m)}
                      role="option"
                      aria-selected={selectedMunicipio === m}
                      title={m}
                    >
                      <span className="asb-card-bullet" aria-hidden />
                      <span className="asb-card-text">{m}</span>
                      {selectedMunicipio === m && <span className="asb-card-check">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FECHA */}
          <div className="asb-dd" ref={fechaRef}>
            <button
              className="asb-btn"
              onClick={() => setDdFechaOpen(v => !v)}
              aria-haspopup="dialog"
              aria-expanded={ddFechaOpen}
            >
              <span className="asb-btn-text">
                {selectedDate ? formatDateLongEs(selectedDate) : "Fecha"}
              </span>
              <span className={`asb-chev ${ddFechaOpen ? "asb-rotate" : ""}`}>▾</span>
            </button>

            {ddFechaOpen && (
              <div className="asb-panel asb-panel-date">
                <label className="asb-field">
                  <span className="asb-field-label">Selecciona una fecha</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleSelectDate}
                    className="asb-input"
                  />
                </label>

                <div className="asb-date-presets">
                  <button className="asb-chip" onClick={setDateToday}>Hoy</button>
                  <button className="asb-chip" onClick={setDateTomorrow}>Mañana</button>
                  <button className="asb-chip asb-chip-outline" onClick={clearDate}>Limpiar</button>
                </div>

                <div className="asb-panel-actions">
                  <button
                    className="asb-btn-primary asb-btn-small"
                    onClick={() => setDdFechaOpen(false)}
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* BUSCAR */}
          <button className="asb-cta" onClick={handleBuscar} >
            Buscar
          </button>

          
            {/* CERRAR SESIÓN */}
            
            <button
              className="asb-logout"
              onClick={() => {
                localStorage.clear();
                navigate("/userlogin");
              }}
            >
              <span className="asb-logout-icon">⏻</span>
              <span className="asb-logout-text">Cerrar Sesión</span>
            </button>


        </div>
        
      </div>
      <ToastContainer />
    </nav>
  );
}
