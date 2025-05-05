import "dotenv/config";
import { createApp } from "./infrastructure/config/express";
import fs from "fs-extra";
import path from "path";

// Garantir que a pasta de uploads exista
const uploadsDir = path.join(process.cwd(), "public/uploads");
fs.ensureDirSync(uploadsDir);

const app = createApp();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
