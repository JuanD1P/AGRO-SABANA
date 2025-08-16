import React, { useState, useEffect } from 'react';
import axios from 'axios';
import logo from '../ImagenesP/ImagenesLogin/LOGO.png';
import './DOCSS/Admin.css';  

axios.defaults.withCredentials = true;

const api = axios.create({
  baseURL: 'http://localhost:3000/auth',
  withCredentials: true
});

const Admin = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { obtenerUsuarios(); }, []);

  const obtenerUsuarios = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/usuarios');
      setUsuarios(data);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      alert(error?.response?.data?.error || 'No fue posible cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const cambiarRol = async (id, nuevoRol) => {
    try {
      await api.put(`/usuarios/${id}/rol`, { rol: nuevoRol }); 
      await obtenerUsuarios();
    } catch (error) {
      console.error('Error al cambiar rol:', error);
      alert(error?.response?.data?.error || 'No fue posible cambiar el rol');
    }
  };

  const eliminarUsuario = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      await api.delete(`/usuarios/${id}`);
      await obtenerUsuarios();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      alert(error?.response?.data?.error || 'No fue posible eliminar el usuario');
    }
  };

  return (
    <div className="admin-container">
      <img src={logo} alt="Logo de la aplicación" className="admin-logo" />
      <h2 className="admin-title">Panel de Administración</h2>

      {loading ? <p>Cargando...</p> : (
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
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.nombre_completo}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    className="admin-role-select"
                    value={u.rol}
                    onChange={(e) => cambiarRol(u.id, e.target.value)} 
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td>
                  <button
                    className="admin-delete-btn"
                    onClick={() => eliminarUsuario(u.id)} 
                  >
                    ❌ Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>No hay usuarios</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Admin;
