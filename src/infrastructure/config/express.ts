import express from "express";
import cors from "cors";
import path from "path";
import { fileRoutes } from "../../interfaces/http/routes/fileRoutes";
import { errorHandler } from "../../interfaces/http/middlewares/errorHandler";

const createApp = () => {
  const app = express();

  // Middlewares globais
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Servir arquivos estáticos da pasta 'public'
  app.use(express.static(path.join(process.cwd(), "public")));

  // Rotas da API
  app.use("/api", fileRoutes);

  // Middleware de tratamento de erros (deve ser o último middleware)
  app.use(errorHandler as express.ErrorRequestHandler);

  return app;
};

export { createApp };
