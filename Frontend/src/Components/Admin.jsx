import React, { useState, useEffect } from 'react';
import axios from 'axios';
import logo from '../ImagenesP/ImagenesLogin/LOGO.png';
import './DOCSS/Admin.css';  

const Admin = () => {
    const [usuarios, setUsuarios] = useState([]);

    useEffect(() => {
        obtenerUsuarios();
    }, []);

    const obtenerUsuarios = async () => {
        try {
            const response = await axios.get('http://localhost:3000/auth/usuarios');
            const usuariosUnicos = response.data.reduce((acc, usuario) => {
                if (!acc.find(u => u.usuario_id === usuario.usuario_id)) {
                    acc.push(usuario);
                }
                return acc;
            }, []);
            setUsuarios(usuariosUnicos);
        } catch (error) {
            console.error("Error al obtener usuarios:", error);
        }
    };

    const cambiarRol = async (id, nuevoRol) => {
        try {
            await axios.put(`http://localhost:3000/auth/usuarios/${id}`, { rol: nuevoRol });
            obtenerUsuarios();
        } catch (error) {
            console.error("Error al cambiar rol:", error);
        }
    };

    const eliminarUsuario = async (id) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar este usuario?")) return;

        try {
            await axios.delete(`http://localhost:3000/auth/usuarios/${id}`);
            obtenerUsuarios();
        } catch (error) {
            console.error("Error al eliminar usuario:", error);
        }
    };

    return (
        <div className="admin-container">
            {/* 🔹 Logo agregado arriba del título */}
            <img src={logo} alt="Logo de la aplicación" className="admin-logo" />
            <h2 className="admin-title">Panel de Administración</h2>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre Completo</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.map((usuario) => (
                        <tr key={usuario.usuario_id}>
                            <td>{usuario.usuario_id}</td>
                            <td>{usuario.nombre_completo}</td>
                            <td>{usuario.email}</td>
                            <td>
                                <select 
                                    className="admin-role-select"
                                    value={usuario.rol} 
                                    onChange={(e) => cambiarRol(usuario.usuario_id, e.target.value)}
                                >
                                    <option value="USER">USER</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </td>
                            <td>
                                <button 
                                    className="admin-delete-btn" 
                                    onClick={() => eliminarUsuario(usuario.usuario_id)}
                                >
                                    ❌ Eliminar
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Admin;
