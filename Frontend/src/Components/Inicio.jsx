import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, BarChart3, CloudSun, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./DOCSS/Inicio.module.css";

/* ---------- IMÁGENES DEL CARRUSEL (8) ---------- */
import Slide1 from "../ImagenesP/ImagenesInicio/Madrid.jpeg";
import Slide2 from "../ImagenesP/ImagenesInicio/Soacha.jpg";
import Slide3 from "../ImagenesP/ImagenesInicio/Mosquera.jpg";
import Slide4 from "../ImagenesP/ImagenesInicio/Funza.jpg";
import Slide5 from "../ImagenesP/ImagenesInicio/Faca.jpg";
import Slide6 from "../ImagenesP/ImagenesInicio/Elrosal.jpg";
import Slide7 from "../ImagenesP/ImagenesInicio/Subachoque.jpeg";
import Slide8 from "../ImagenesP/ImagenesInicio/Zipacon.jpg";

/* ---------- GALERÍA  ---------- */
import CultivoA from "../ImagenesP/ImagenesInicio/CultivoA.jpeg";
import CultivoB from "../ImagenesP/ImagenesInicio/CultivoB.jpg";
import PaisajeA from "../ImagenesP/ImagenesInicio/PaisajeA.jpg";
import PaisajeB from "../ImagenesP/ImagenesInicio/PaisajeB.jpg";
import MercadoA from "../ImagenesP/ImagenesInicio/MercadoA.jpg";
import MercadoB from "../ImagenesP/ImagenesInicio/MercadoB.jpg";

export default function Inicio() {
  const navigate = useNavigate();

  const slides = useMemo(
    () => [
      { src: Slide1, title: "Madrid, Cundinamarca" },
      { src: Slide2, title: "Soacha, Cundinamarca" },
      { src: Slide3, title: "Mosquera, Cundinamarca" },
      { src: Slide4, title: "Funza, Cundinamarca" },
      { src: Slide5, title: "Facatativá, Cundinamarca" },
      { src: Slide6, title: "El Rosal, Cundinamarca" },
      { src: Slide7, title: "Subachoque, Cundinamarca" },
      { src: Slide8, title: "Zipacón, Cundinamarca" },
    ],
    []
  );

  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);
  const hoveringRef = useRef(false);


  useEffect(() => {
    const play = () => {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (!hoveringRef.current) setIdx((i) => (i + 1) % slides.length);
      }, 3000);
    };
    play();
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  const onMouseEnter = () => (hoveringRef.current = true);
  const onMouseLeave = () => (hoveringRef.current = false);

  return (
    <div className={styles.app}>

      <section className={styles.hero} aria-label="Bienvenida">
        <div className={styles.heroInner}>
          <span className={styles.badge}>
            <Leaf size={16} /> Inteligencia para sembrar mejor
          </span>
          <h1 className={styles.title}>Bienvenido a AgroSabana</h1>
          <p className={styles.subtitle}>
            Información clara y tranquila para tomar decisiones agrícolas en la Sabana de Occidente.
          </p>
        </div>
      </section>


      <section className={styles.main} aria-label="Introducción">
        <div className={styles.textCard}>
          <p>
            Aquí podrás conocer la informacion de los principales productos agrícolas, junto con proyecciones de mercado para decidir con mayor seguridad <strong>qué sembrar</strong>, <strong>cuándo</strong> y{" "}
            <strong>cómo</strong> aprovechar las condiciones climáticas de nuestra región.
          </p>
          <p>
            Nuestro objetivo es ayudarte a sembrar con{" "}
            <strong style={{ color: "var(--g-800)" }}>inteligencia</strong>, reducir riesgos y aumentar tu{" "}
            <strong style={{ color: "var(--g-800)" }}>rentabilidad</strong>, siempre cuidando la tierra y el futuro de
            nuestras comunidades.
          </p>

          <span className={styles.tip} role="note">
            <Calendar size={18} />
            No olvides seleccionar tu municipio y fecha para iniciar.
          </span>
        </div>


        <div className={styles.imageCol}>
          <div
            className={styles.carousel}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            aria-label="Galería de imágenes agrícolas"
          >
            <div className={styles.frame}>
              {slides.map((s, i) => (
                <img
                  key={i}
                  src={s.src}
                  className={`${styles.slide} ${i === idx ? styles.active : ""}`}
                  alt={s.title}
                  loading={i === 0 ? "eager" : "lazy"}
                  draggable={false}
                />
              ))}

              <div className={styles.caption} aria-live="polite">
                {slides[idx].title}
              </div>


              <div className={styles.gradientMask} aria-hidden="true" />
            </div>


            <div className={styles.dots} role="tablist" aria-label="Indicadores de carrusel">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`${styles.dot} ${i === idx ? styles.dotActive : ""}`}
                  role="tab"
                  aria-selected={i === idx}
                  aria-label={`Ir a la imagen ${i + 1}`}
                  onClick={() => setIdx(i)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>


      <section className={styles.features} aria-label="Beneficios">
        <article className={styles.feature}>
          <div className={styles.featureHead}>
            <BarChart3 size={18} />
            <h3>Demanda y precios</h3>
          </div>
          <p>Observa el comportamiento del mercado y prioriza cultivos con mejor perspectiva.</p>
        </article>
        <article className={styles.feature}>
          <div className={styles.featureHead}>
            <CloudSun size={18} />
            <h3>Clima a tu favor</h3>
          </div>
          <p>Identifica ventanas de siembra y cosecha según patrones climáticos regionales.</p>
        </article>
        <article className={styles.feature}>
          <div className={styles.featureHead}>
            <Leaf size={18} />
            <h3>Decisiones sostenibles</h3>
          </div>
          <p>Mejores resultados cuidando suelo, agua y productividad a largo plazo.</p>
        </article>
      </section>

      <section className={styles.stats} aria-label="Indicadores destacados">
        <div className={styles.stat}>
          <b>+10</b><span>Productos</span>
        </div>
        <div className={styles.stat}>
          <b>8</b><span>Municipios</span>
        </div>
        <div className={styles.stat}>
          <b>+ 12&nbsp;meses</b><span>Histórico</span>
        </div>
        <div className={styles.stat}>
          <b>100%</b><span>Sabana de Occidente</span>
        </div>
      </section>

      <section className={styles.gallery} aria-label="Explora la Sabana">
        <h2 className={styles.galleryTitle}>Explora la Sabana</h2>

        <div className={styles.galleryGrid}>

          <figure className={styles.tile}>
            <img className={`${styles.img} ${styles.bottom}`} src={CultivoB} alt="" aria-hidden="true"
                 onError={(e)=>{e.currentTarget.style.display='none';}} />
            <img className={`${styles.img} ${styles.top}`} src={CultivoA} alt="Cultivos verdes en la sabana"
                 onError={(e)=>{e.currentTarget.style.display='none';}} />
            <figcaption className={styles.tileLabel}>Cultivos</figcaption>
          </figure>


          <figure className={styles.tile}>
            <img className={`${styles.img} ${styles.bottom}`} src={PaisajeB} alt="" aria-hidden="true"
                 onError={(e)=>{e.currentTarget.style.display='none';}} />
            <img className={`${styles.img} ${styles.top}`} src={PaisajeA} alt="Paisaje agrícola"
                 onError={(e)=>{e.currentTarget.style.display='none';}} />
            <figcaption className={styles.tileLabel}>Paisaje</figcaption>
          </figure>

          <figure className={styles.tile}>
            <img className={`${styles.img} ${styles.bottom}`} src={MercadoB} alt="" aria-hidden="true"
                 onError={(e)=>{e.currentTarget.style.display='none';}} />
            <img className={`${styles.img} ${styles.top}`} src={MercadoA} alt="Mercado agrícola local"
                 onError={(e)=>{e.currentTarget.style.display='none';}} />
            <figcaption className={styles.tileLabel}>Mercado</figcaption>
          </figure>
        </div>
      </section>


      <section className={styles.quoteWrap} aria-label="Mensaje">
        <blockquote className={styles.quote}>
          “Sembrar con datos es sembrar con confianza. Cuando conoces tu tierra y tu mercado, cada decisión pesa menos y rinde más.”
          <small>Equipo AgroSabana</small>
        </blockquote>
      </section>


      <section className={styles.cta} aria-label="Recordatorio">
        <div className={styles.ctaCard}>
          <div>
            <div className={styles.ctaTitle}>Comienza con dos datos sencillos</div>
            <div className={styles.ctaText}>Selecciona municipio y fecha para ver recomendaciones a tu medida.</div>
          </div>
          <span className={styles.badge}>
            <Calendar size={16} /> Listo para iniciar
          </span>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        © {new Date().getFullYear()} AgroSabana • Todos los derechos reservados.
      </footer>
    </div>
  );
}
