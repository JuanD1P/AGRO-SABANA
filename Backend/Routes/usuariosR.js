import express from 'express';
import con from '../utils/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import axios from 'axios'; 

const router = express.Router();

// 🚀 REGISTRO DE USUARIOS
router.post('/register', async (req, res) => {
    const { email, password, nombre_completo } = req.body;

    if (!email || !password || !nombre_completo) {
        return res.json({ registrationStatus: false, Error: "Faltan datos" });
    }

    try {
        con.query("SELECT * FROM usuarios WHERE email = ?", [email], async (err, result) => {
            if (err) {
                console.error("Error en la consulta:", err);
                return res.json({ registrationStatus: false, Error: "Error en la base de datos" });
            }
            if (result.length > 0) {
                return res.json({ registrationStatus: false, Error: "El email ya está registrado" });
            }

            // Encriptar la contraseña
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insertar usuario con rol 'USER' por defecto
            const sql = "INSERT INTO usuarios (email, password, nombre_completo, rol) VALUES (?, ?, ?, 'USER')";
            con.query(sql, [email, hashedPassword, nombre_completo], (err, result) => {
                if (err) {
                    console.error("Error al insertar usuario:", err);
                    return res.json({ registrationStatus: false, Error: "Error de inserción" });
                }
                console.log("Usuario registrado correctamente");
                return res.json({ registrationStatus: true });
            });
        });

    } catch (error) {
        console.error("Error en el registro:", error);
        res.status(500).json({ registrationStatus: false, Error: "Error interno" });
    }
});

// 🚀 LOGIN DE USUARIOS
router.post('/userlogin', (req, res) => {
    const { email, password } = req.body;
    
    const sql = "SELECT * FROM usuarios WHERE email = ?";
    con.query(sql, [email], async (err, result) => {
        if (err) {
            console.error("❌ Error en la consulta:", err);
            return res.json({ loginStatus: false, Error: "Error en la base de datos" });
        }
        if (result.length === 0) {
            return res.json({ loginStatus: false, Error: "Usuario no encontrado" });
        }

        try {
            const validPassword = await bcrypt.compare(password, result[0].password);
            if (!validPassword) {
                return res.json({ loginStatus: false, Error: "Contraseña incorrecta" });
            }

            // Crear el token con el rol
            const token = jwt.sign({ role: result[0].rol, email: email }, "jwt_secret_key", { expiresIn: '1d' });
            
            res.cookie('token', token, { httpOnly: true }); // Opción para cookies seguras
            return res.json({ loginStatus: true, role: result[0].rol, token }); // ⬅ Ahora enviamos el token también

        } catch (error) {
            console.error("❌ Error en login:", error);
            return res.json({ loginStatus: false, Error: "Error interno" });
        }
    });
});



//ACTUALIZAR TIPO DE USUARIO
router.put('/usuarios/:id', (req, res) => {
    const { rol } = req.body;
    const { id } = req.params;

    if (!['USER', 'ADMIN'].includes(rol)) {
        return res.status(400).json({ Error: "Rol no válido" });
    }

    const sql = "UPDATE usuarios SET rol = ? WHERE id = ?";
    con.query(sql, [rol, id], (err, result) => {
        if (err) {
            console.error("Error al actualizar el rol:", err);
            return res.status(500).json({ Error: "Error en la base de datos" });
        }
        res.json({ success: true, message: "Rol actualizado correctamente" });
    });
});

// 🚀 ELIMINAR USUARIO
router.delete('/usuarios/:id', (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM usuarios WHERE id = ?";
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Error al eliminar usuario:", err);
            return res.status(500).json({ Error: "Error en la base de datos" });
        }
        res.json({ success: true, message: "Usuario eliminado correctamente" });
    });
});

export const userRouter = router;
