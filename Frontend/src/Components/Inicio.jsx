import React from 'react';
import { useNavigate } from 'react-router-dom';

function Inicio() {
  const navigate = useNavigate(); 

  return (
    <div>
      <h1>Inicio</h1>
    </div>
  );
}

export default Inicio;
