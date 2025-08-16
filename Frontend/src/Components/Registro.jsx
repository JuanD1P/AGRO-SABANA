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

        // Validaciones de campos obligatorios
        if (!values.nombre_completo || !values.email || !values.password || !values.confirmPassword) {
            setError("Todos los campos son obligatorios");
            return;
        }

        // ✅ Validación: el correo debe contener al menos un '@'
        if (!values.email.includes('@')) {
            setError("El correo debe contener un '@'");
            return;
        }

        // ✅ Validación: longitud mínima de contraseña
        if (values.password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        // ✅ Validación: debe contener al menos una letra
        const hasLetter = /[A-Za-z]/.test(values.password);
        if (!hasLetter) {
            setError("La contraseña debe contener al menos una letra");
            return;
        }

        // ✅ Validación: debe contener al menos un número
        const hasNumber = /\d/.test(values.password);
        if (!hasNumber) {
            setError("La contraseña debe contener al menos un número");
            return;
        }

        // Validación: coincidencia de contraseñas
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
                    <h1>BIENVENIDO</h1>
                    <p>Completa el formulario: </p>
                </div>

                <input 
                    type="text"
                    value={values.nombre_completo}
                    onChange={(e) => setValues({ ...values, nombre_completo: e.target.value })} 
                    placeholder="Nombre Completo"
                    required
                />
    
                <input 
                    type="email"
                    value={values.email}
                    onChange={(e) => setValues({ ...values, email: e.target.value })} 
                    placeholder="Email"
                    required
                />

                <div className="password-container">
                    <input 
                        type={showPassword ? 'text' : 'password'} 
                        value={values.password}
                        onChange={(e) => setValues({ ...values, password: e.target.value })} 
                        placeholder="Contraseña"
                        required
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                </div>

                <div className="password-container">
                    <input 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        value={values.confirmPassword}
                        onChange={(e) => setValues({ ...values, confirmPassword: e.target.value })} 
                        placeholder="Confirmar Contraseña"
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