import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import Login from './Components/Login';
import Registro from './Components/Registro';
import Inicio from './Components/Inicio';
import NotFound from './Components/NotFound';
import ProtectedRoute from './Components/PrivateRoute';
import Admin from './Components/Admin';
import Mercado from './Components/Mercado';
import Navbar from './Components/Navbar';
import GraficasA from './Components/GraficasA';
import Recomendacion from './Components/Recomendacion';
import Top3 from './Components/Top3';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Navigate to="/userlogin" />} />
                <Route path="/userlogin" element={<Login />} />
                <Route path="/Registro" element={<Registro />} />

                
                {/* RUTAS PARA EL ADMINISTRADOR */}

                    <Route path="/Admin" element={
                        <ProtectedRoute allowedRoles={['ADMIN']}>
                            <Admin />
                        </ProtectedRoute>
                    } />

                    <Route path="/GraficasA" element={
                        <ProtectedRoute allowedRoles={['ADMIN']}>
                            <GraficasA />
                        </ProtectedRoute>
                    } />


                {/* RUTAS PARA LOS USUARIOS */}   

                <Route element={<LayoutWithNavbar />}>
                    <Route path="/Inicio" element={
                        <ProtectedRoute allowedRoles={['USER']}>
                            <Inicio />
                        </ProtectedRoute>
                    } />
                
                <Route path="/Mercado" element={
                    <ProtectedRoute allowedRoles={['USER']}>
                        <Mercado />
                    </ProtectedRoute>
                } />
                <Route element={<LayoutWithNavbar />}></Route>
                <Route path="/Recomendacion" element={
                    <ProtectedRoute allowedRoles={['USER']}> 
                        <Recomendacion />
                    </ProtectedRoute>
                } />
                <Route element={<LayoutWithNavbar />}></Route>
                <Route path="/Top3" element={
                    <ProtectedRoute allowedRoles={['USER']}>    
                        <Top3 />
                    </ProtectedRoute>
                } />
                </Route>

    

                {/* RUTA NO ENCONTRADA */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Router>
    );
}


//Navbar
function LayoutWithNavbar() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

export default App;
