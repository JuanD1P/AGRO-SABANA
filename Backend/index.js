import express from 'express';
import cors from 'cors';
import { userRouter } from './Routes/usuariosR.js';
import cookieParser from 'cookie-parser';

const app = express();
app.use(cors({
    origin: ["http://localhost:5173"], 
    methods: ['GET', 'POST', 'PUT'],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use('/auth', userRouter);

app.listen(3000, () => {
    console.log("🚀 Servidor en funcionamiento en http://localhost:3000");
});
