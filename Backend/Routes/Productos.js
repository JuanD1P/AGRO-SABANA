import express from 'express';
import con from '../utils/db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

function verifyToken(req, res, next) {
  try {
    const token = req.cookies?.token || req.headers?.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ ok: false, error: 'No token' });

    const payload = jwt.verify(token, 'jwt_secret_key'); 
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: 'Token inválido' });
  }
}

router.get('/municipios-productos', verifyToken, (req, res) => {
  const sql = `
    SELECT 
      m.id          AS municipio_id,
      m.nombre      AS municipio,
      p.id          AS producto_id,
      p.nombre      AS producto,
      p.ciclo_dias  AS ciclo_dias
    FROM municipio m
    JOIN municipio_producto mp ON mp.municipio_id = m.id
    JOIN producto p           ON p.id = mp.producto_id
    ORDER BY m.nombre, p.nombre
  `;

  con.query(sql, (err, rows) => {
    if (err) {
      console.error('Error consultando municipios-productos:', err);
      return res.status(500).json({ ok: false, error: 'DB error' });
    }

    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.municipio_id)) {
        map.set(r.municipio_id, {
          municipio_id: r.municipio_id,
          municipio: r.municipio,
          productos: [],
        });
      }
      map.get(r.municipio_id).productos.push({
        producto_id: r.producto_id,
        producto: r.producto,
        ciclo_dias: r.ciclo_dias,
      });
    }

    return res.json({ ok: true, data: Array.from(map.values()) });
  });
});


router.get('/flat', verifyToken, (req, res) => {
  const sql = `
    SELECT 
      m.id AS municipio_id, m.nombre AS municipio,
      p.id AS producto_id,  p.nombre AS producto,
      p.ciclo_dias
    FROM municipio m
    JOIN municipio_producto mp ON mp.municipio_id = m.id
    JOIN producto p           ON p.id = mp.producto_id
    ORDER BY m.nombre, p.nombre
  `;
  con.query(sql, (err, rows) => {
    if (err) {
      console.error('Error consultando flat:', err);
      return res.status(500).json({ ok: false, error: 'DB error' });
    }
    return res.json({ ok: true, data: rows });
  });
});

/* -------------------- */
// Listar todos los productos
router.get('/productos', verifyToken, (req, res) => {
  con.query('SELECT id, nombre, ciclo_dias FROM producto ORDER BY nombre', (err, rows) => {
    if (err) return res.status(500).json({ ok: false, error: 'DB error' });
    res.json({ ok: true, data: rows });
  });
});

// Listar todos los municipios
router.get('/municipios', verifyToken, (req, res) => {
  con.query('SELECT id, nombre FROM municipio ORDER BY nombre', (err, rows) => {
    if (err) return res.status(500).json({ ok: false, error: 'DB error' });
    res.json({ ok: true, data: rows });
  });
});

export const productosRouter = router;
