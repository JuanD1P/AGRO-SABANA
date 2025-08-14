import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center">
      <h1 className="text-6xl font-bold text-red-600">404</h1>
      <p className="text-2xl font-semibold text-gray-700 mt-4">¡Oh no! Parece que esta página necesita primeros auxilios</p>
      <p className="text-lg text-gray-500 mt-2">No encontramos la página que buscas, pero estamos aquí para ayudarte.</p>
      <Link
        to="/"
        className="mt-6 px-6 py-3 bg-red-500 text-white text-lg font-semibold rounded-lg hover:bg-red-700 transition duration-300"
      >
        Regresar a la consulta
      </Link>
    </div>
  );
};

export default NotFound;
