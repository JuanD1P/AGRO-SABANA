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
      p.ciclo_dias  AS ciclo_dias,
      p.temp_min    AS temp_min,
      p.temp_max    AS temp_max,
      p.humedad_min AS humedad_min,
      p.humedad_max AS humedad_max,
      p.cont        AS cont
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
        temp_min: r.temp_min,
        temp_max: r.temp_max,
        humedad_min: r.humedad_min,
        humedad_max: r.humedad_max,
        cont: r.cont ?? 0, // 👈 aquí va
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
      p.ciclo_dias, p.temp_min, p.temp_max, p.humedad_min, p.humedad_max,
      p.cont AS cont
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



router.get('/productos', verifyToken, (req, res) => {
  const sql = `
    SELECT id, nombre, ciclo_dias, temp_min, temp_max, humedad_min, humedad_max, cont
    FROM producto
    ORDER BY nombre
  `;
  con.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ ok: false, error: 'DB error' });
    res.json({ ok: true, data: rows });
  });
});


router.post('/init-cont', verifyToken, (req, res) => {
  if (req?.user?.rol !== 'ADMIN') {
    return res.status(403).json({ ok: false, error: 'Solo ADMIN puede inicializar cont' });
  }

  const sql = `UPDATE producto SET cont = FLOOR(1 + (RAND() * 5))`;
  con.query(sql, (err, result) => {
    if (err) {
      console.error('Error inicializando cont:', err);
      return res.status(500).json({ ok: false, error: 'DB error al inicializar cont' });
    }
    res.json({ ok: true, affectedRows: result?.affectedRows ?? 0 });
  });
});


router.patch('/productos/:id/cont', verifyToken, (req, res) => {
  if (req?.user?.rol !== 'ADMIN') {
    return res.status(403).json({ ok: false, error: 'Solo ADMIN puede actualizar cont' });
  }

  const id = Number(req.params.id);
  const { cont } = req.body || {};
  if (!Number.isInteger(id) || !Number.isFinite(cont)) {
    return res.status(400).json({ ok: false, error: 'Parámetros inválidos' });
  }

  con.query(
    'UPDATE producto SET cont = ? WHERE id = ?',
    [cont, id],
    (err, result) => {
      if (err) {
        console.error('Error actualizando cont:', err);
        return res.status(500).json({ ok: false, error: 'DB error' });
      }
      res.json({ ok: true, affectedRows: result?.affectedRows ?? 0 });
    }
  );
});


router.post('/productos/interes', verifyToken, (req, res) => {
  const { nombre, producto_id } = req.body || {};

  let whereSql = '';
  let whereVal = null;
  if (Number.isInteger(producto_id)) {
    whereSql = 'id = ?';
    whereVal = producto_id;
  } else if (typeof nombre === 'string' && nombre.trim()) {
    whereSql = 'nombre = ?';
    whereVal = nombre.trim();
  } else {
    return res.status(400).json({ ok: false, error: 'Falta nombre o producto_id' });
  }

  const sqlUpdate = `UPDATE producto SET cont = COALESCE(cont, 0) + 1 WHERE ${whereSql} LIMIT 1`;

  con.query(sqlUpdate, [whereVal], (err, result) => {
    if (err) {
      console.error('Error incrementando cont:', err);
      return res.status(500).json({ ok: false, error: 'DB error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Producto no encontrado' });
    }


    con.query(`SELECT id, nombre, cont FROM producto WHERE ${whereSql} LIMIT 1`, [whereVal], (err2, rows) => {
      if (err2) {
        console.error('Error leyendo cont:', err2);
        return res.status(200).json({ ok: true, newCont: null });
      }
      const prod = rows?.[0];
      return res.json({ ok: true, newCont: prod?.cont ?? null, producto: prod });
    });
  });
});


export const productosRouter = router;
