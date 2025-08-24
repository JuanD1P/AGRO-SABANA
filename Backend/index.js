import express from 'express';
import cors from 'cors';
import { userRouter } from './Routes/usuariosR.js';
import { productosRouter } from './Routes/Productos.js';
import cookieParser from 'cookie-parser';
import { openmeteoRouter } from './Routes/openmeteo.js'; 

const app = express();
app.use(cors({
    origin: ["http://localhost:5173"], 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use('/auth', userRouter);
app.use('/productos', productosRouter);
app.use('/openmeteo', openmeteoRouter);  

app.listen(3000, () => {
    console.log("🚀 Servidor en funcionamiento en http://localhost:3000");
});
