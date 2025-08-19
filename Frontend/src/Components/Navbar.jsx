import { NavLink } from "react-router-dom";
import "./DOCSS/Navbar.css";
import logo from '../ImagenesP/ImagenesLogin/LOGO 2.0.jpg';
import { useState } from "react";

export default function Navbar() {
  // Lista de municipios estáticos
  const municipios = ["Bojacá", "El Rosal", "Subachoque", "Zipacón", "Mosquera", "Madrid", "Facatativá", "Funza"];

  // Estado para mostrar/ocultar el menú
  const [open, setOpen] = useState(false);
  
  // Estado para el menú de fecha
  const [openFecha, setOpenFecha] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  return (
    <nav className="navbar">
      <NavLink to="/" className="logo">
        <img src={logo} alt="Logo" className="logoNavbar" />
      </NavLink>
      <div className="navbar-links">
        {/* Menú desplegable */}
        <div className="dropdown">
          <button 
            className="dropbtn" 
            onClick={() => setOpen(!open)}
          >
            Municipio
          </button>
          {open && (
            <div className="dropdown-content">
              {municipios.map((muni, index) => (
                <NavLink 
                  key={index} 
                  to={`/municipio/${muni.toLowerCase()}`} 
                  className="dropdown-item"
                  onClick={() => setOpen(false)} // cerrar menú al hacer click
                >
                  {muni}
                </NavLink>
              ))}
            </div>
          )}
        </div>
        <div className="dropdown">
          <button 
            className="dropbtn" 
            onClick={() => setOpenFecha(!openFecha)}
          >
            Fecha
          </button>
          {openFecha && (
            <div className="dropdown-content">
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          )}
        </div>
        <NavLink to="/buscar" activeClassName="active-link">
          Buscar
        </NavLink>
      </div>
    </nav>
  );
}
