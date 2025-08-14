import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from "react-icons/fa";
import './DOCSS/Registro.css';
import logo from '../ImagenesP/ImagenesLogin/LOGO.png';


const Registro = () => {
    const [values, setValues] = useState({
        nombre_completo: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();
    axios.defaults.withCredentials = true;

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);

        // Validaciones de campos
        if (!values.nombre_completo || !values.email || !values.password || !values.confirmPassword) {
            setError("Todos los campos son obligatorios");
            return;
        }

        if (values.password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        if (values.password !== values.confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        const dataToSend = {
            nombre_completo: values.nombre_completo,
            email: values.email,
            password: values.password
        };

        try {
            const result = await axios.post('http://localhost:3000/auth/register', dataToSend);
            if (result.data.registrationStatus) {
                alert("Registro exitoso");
                navigate('/userlogin');
            } else {
                setError(result.data.Error);
            }
        } catch (err) {
            console.error("Error en el registro:", err);
            setError("Error en el servidor, intenta más tarde");
        }
    };

    return (
        <div className="registro-container">
            

            {error && <div className='error-message'>{error}</div>}

            <form onSubmit={handleSubmit} className='form-container'>
                <div>
                <img src={logo} alt="Logo" className="logoLogin" />
                <h2>Página de Registro</h2>
                </div>
                
                <label>Nombre Completo</label>
                <input 
                    type="text"
                    value={values.nombre_completo}
                    onChange={(e) => setValues({ ...values, nombre_completo: e.target.value })} 
                    required
                />

                <label>Email</label>
                <input 
                    type="email"
                    value={values.email}
                    onChange={(e) => setValues({ ...values, email: e.target.value })} 
                    required
                />

                <label>Contraseña</label>
                <div className="password-container">
                    <input 
                        type={showPassword ? 'text' : 'password'} 
                        value={values.password}
                        onChange={(e) => setValues({ ...values, password: e.target.value })} 
                        required
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                </div>

                <label>Confirmar Contraseña</label>
                <div className="password-container">
                    <input 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        value={values.confirmPassword}
                        onChange={(e) => setValues({ ...values, confirmPassword: e.target.value })} 
                        required
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                </div>

                <button type="submit">Registrarse</button>
            </form>
        </div>
    );
};

export default Registro;
