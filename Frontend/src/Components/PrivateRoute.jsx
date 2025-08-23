import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('auth-token');
    const role = localStorage.getItem('user-role');


    if (!token || !allowedRoles.includes(role)) {
        console.warn("Acceso denegado. Redirigiendo a /userlogin");
        return <Navigate to="/userlogin" />;
    }

    return children;
};

export default PrivateRoute;
