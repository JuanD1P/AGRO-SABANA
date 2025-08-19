// App.jsx (encabezado correcto)
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import Login from './Components/Login';
import Registro from './Components/Registro';
import Inicio from './Components/Inicio';
import NotFound from './Components/NotFound';
import ProtectedRoute from './Components/PrivateRoute';
import Admin from './Components/Admin';
import Mercado from './Components/Mercado';
import Navbar from './Components/Navbar';




function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Navigate to="/userlogin" />} />
                <Route path="/userlogin" element={<Login />} />
                <Route path="/Registro" element={<Registro />} />
                
                {/* RUTAS PARA EL ADMINISTRADOR */}
                <Route element={<LayoutWithNavbar />}>
                    <Route path="/Admin" element={
                        <ProtectedRoute allowedRoles={['ADMIN']}>
                            <Admin />
                        </ProtectedRoute>
                    } />
                </Route>

                {/* RUTAS PARA LOS USUARIOS */}   

                <Route element={<LayoutWithNavbar />}>
                    <Route path="/Inicio" element={
                        <ProtectedRoute allowedRoles={['USER']}>
                            <Inicio />
                        </ProtectedRoute>
                    } />
                </Route>
                <Route path="/Mercado" element={
                    <ProtectedRoute allowedRoles={['USER']}>
                        <Mercado />
                    </ProtectedRoute>
                } />

                {/* RUTA NO ENCONTRADA */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Router>
    );
}

// Layout con Navbar fijo
function LayoutWithNavbar() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

export default App;
