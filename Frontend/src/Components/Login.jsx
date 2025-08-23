import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../ImagenesP/ImagenesLogin/LOGO.png';
import './DOCSS/Login.css';

const Login = () => {
    const [values, setValues] = useState({
        email: '',
        password: ''
    });
    localStorage.removeItem('auth-token');
    localStorage.removeItem('user-role');
    localStorage.removeItem('municipioSeleccionado');
    localStorage.removeItem('fechaSeleccionada');
    const [error, setError] = useState(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const navigate = useNavigate();
    axios.defaults.withCredentials = true;

    const handleSubmit = (event) => {
        event.preventDefault();
        setError(null);
    
        if (!values.email || !values.password) {
            setError('Todos los campos deben ser completados');
            return;
        }
    
        axios.post('http://localhost:3000/auth/userlogin', values)
        .then(result => {
            console.log("Respuesta del backend:", result.data);
    
            if (result.data.loginStatus) {
                if (result.data.token) {  // Verificar que el token está presente
                    localStorage.setItem('auth-token', result.data.token);
                }
                localStorage.setItem('user-role', result.data.role);
                console.log("Token guardado:", localStorage.getItem("auth-token"));
                console.log("Rol guardado:", localStorage.getItem("user-role"));
                
    
                if (result.data.role === 'USER') {
                    navigate('/Inicio');
                    window.location.reload();
                } else if (result.data.role === 'ADMIN') {
                    navigate('/Admin');
                    window.location.reload();
                }
            } else {
                setError(result.data.Error);
            }
        })
        .catch(err => {
            console.error("Error en la petición:", err);
            setError("Error en el servidor. Inténtalo de nuevo.");
        });
    
    
    };
    
    return (
        <div className="LoginPcontainer">
            
            <div className='LoginScontainer'>
            <img src={logo} alt="Logo" className="logoLogin" />
                <div className={`text-dangerLogin ${error ? 'show' : ''}`}>
                    {error && error}
                </div>
                <form onSubmit={handleSubmit} className='formularioLogin'>
                    <div className='form1'>
                        <input 
                            type='email' 
                            name='email' 
                            autoComplete='off' 
                            placeholder='Ingresa Email' 
                            onChange={(e) => setValues({ ...values, email: e.target.value })}
                            className='input1'
                        />
                    </div>
                    <div className='form2'>
                        <input 
                            type='password' 
                            name='password' 
                            placeholder='Ingresa Contraseña' 
                            onChange={(e) => setValues({ ...values, password: e.target.value })}
                            className='input2'
                        />
                    </div>

                    <button type="submit"  className='boton2'>Ingresa</button>
                </form>
                <button onClick={() => navigate('/Registro')} className='botonLogin1'>Ir a Registro</button>
            </div>
        </div>
    );
};

export default Login;
