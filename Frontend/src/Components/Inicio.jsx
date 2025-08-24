import React from 'react';
import { Calendar } from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import InicioImg from '../ImagenesP/ImagenesInicio/Inicio.jpg';
import styles from './DOCSS/Inicio.module.css'; 

function Inicio() {
  const navigate = useNavigate(); 

  return (
    <div className={`min-h-screen bg-white flex flex-col ${styles.app}`}>
      {/* Header */}
      <header className={`text-white shadow-md ${styles.header}`}>
        <h1 className="text-2xl font-bold">Bienvenido a AgroSabana</h1>
      </header>

      {/* Main Section */}
      <main className={`flex-1 ${styles.main}`}>
        {/* Texto principal */}
        <div className={`max-w-xl space-y-6 ${styles.textCol}`}>
          <p className="text-gray-700 leading-relaxed">
            La herramienta creada para los agricultores de la Sabana de Occidente.
            Aquí podrás conocer la demanda de los principales productos agrícolas, 
            analizar proyecciones de mercado y tomar decisiones más seguras sobre 
            qué sembrar, cuándo hacerlo y cómo aprovechar mejor las condiciones climáticas de nuestra región.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Nuestro objetivo es ayudarte a sembrar con <span className="font-semibold text-green-700">inteligencia</span>, 
            reducir riesgos y aumentar tu <span className="font-semibold text-green-700">rentabilidad</span>, 
            siempre cuidando de la tierra y el futuro de nuestras comunidades.
          </p>

          {/* Mensaje final con íconos */}
          <p className={`mt-6 text-green-800 font-medium flex items-center ${styles.tip}`}>
            <Calendar className="w-5 h-5 text-green-700" />
            <span>No olvides seleccionar tu municipio y fecha para iniciar</span>
          </p>
        </div>

        {/* Imagen ilustrativa */}
        <div className={styles.imageCol}>
          <img
            src={InicioImg}
            alt="Agricultor trabajando la tierra"
            className={styles.heroImg}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        © {new Date().getFullYear()} AgroSabana. Todos los derechos reservados.
      </footer>
    </div>
  );
}

export default Inicio;