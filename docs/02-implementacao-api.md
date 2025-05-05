# 2. Implementação da API

Este documento descreve como implementar a API para gerenciamento de arquivos, incluindo a configuração do servidor e a criação das rotas para upload e acesso.

## Configuração do Servidor Express

### 1. Criar o Arquivo Principal da Aplicação

Arquivo: `src/server.ts`

```typescript
import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { fileRoutes } from "./interfaces/http/routes/fileRoutes";
import { errorHandler } from "./interfaces/http/middlewares/errorHandler";

// Carrega variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsing de JSON
app.use(express.json());

// Configuração de CORS
app.use(cors());

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, "../public")));

// Rotas da API
app.use("/api", fileRoutes);

// Middleware de tratamento de erros
app.use(errorHandler);

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
```

### 2. Configuração do Express

Arquivo: `src/infrastructure/config/express.ts`

```typescript
import express, { Application } from "express";
import cors from "cors";
import path from "path";
import { fileRoutes } from "../../interfaces/http/routes/fileRoutes";
import { errorHandler } from "../../interfaces/http/middlewares/errorHandler";

export const configureExpress = (): Application => {
  const app = express();

  // Middleware para parsing de JSON
  app.use(express.json());

  // Configuração de CORS
  app.use(cors());

  // Servir arquivos estáticos da pasta 'public'
  app.use(express.static(path.join(__dirname, "../../../public")));

  // Rotas da API
  app.use("/api", fileRoutes);

  // Middleware de tratamento de erros
  app.use(errorHandler);

  return app;
};
```

## Configuração do Multer para Upload de Arquivos

### 1. Configuração Básica do Multer

Arquivo: `src/infrastructure/config/multer.ts`

```typescript
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { ApiError } from "../../interfaces/errors/ApiError";

// Função para normalizar nomes de arquivos (remover caracteres especiais, espaços, etc.)
const normalizeFileName = (fileName: string): string => {
  // Remove caracteres especiais e espaços
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]/g, "-")
    .toLowerCase();
};

// Configuração de armazenamento do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Obter a data atual para organizar em pastas por data
    const today = new Date();
    const dateFolder = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Criar pasta se não existir
    const uploadDir = path.join(
      __dirname,
      "../../../public/uploads",
      dateFolder
    );

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Extrair a extensão do arquivo original
    const fileExt = path.extname(file.originalname);

    // Obter o nome original sem extensão
    const baseName = path.basename(file.originalname, fileExt);

    // Normalizar o nome do arquivo
    const normalizedName = normalizeFileName(baseName);

    // Gerar timestamp e id único
    const timestamp = Date.now();
    const uniqueId = nanoid(8);

    // Combinar para criar um nome de arquivo único
    const newFileName = `${timestamp}-${uniqueId}-${normalizedName}${fileExt}`;

    cb(null, newFileName);
  },
});

// Configuração de filtro de arquivos
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Aqui podemos aplicar validações mais específicas se necessário
  // Por enquanto, aceita qualquer tipo de arquivo
  cb(null, true);
};

// Configuração do limite de tamanho
const limits = {
  fileSize: 10 * 1024 * 1024, // 10MB por arquivo
  files: 10, // Máximo de 10 arquivos por requisição
};

// Middleware Multer configurado
export const upload = multer({
  storage,
  fileFilter,
  limits,
});

// Middleware para verificar se arquivos foram enviados
export const checkFilesExist = (
  req: Express.Request,
  res: Express.Response,
  next: Function
) => {
  if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
    throw new ApiError("Arquivo não informado", 400);
  }
  next();
};
```

## Implementação das Rotas para Upload e Acesso aos Arquivos

### 1. Definição das Rotas

Arquivo: `src/interfaces/http/routes/fileRoutes.ts`

```typescript
import { Router } from "express";
import { FileController } from "../controllers/FileController";
import { upload, checkFilesExist } from "../../../infrastructure/config/multer";

const router = Router();
const fileController = new FileController();

// Rota para upload de múltiplos arquivos
router.post(
  "/add-files",
  upload.array("files"),
  checkFilesExist,
  fileController.uploadFiles
);

// Rota para buscar arquivos por URI
router.post("/load-files", fileController.loadFiles);

export const fileRoutes = router;
```

### 2. Implementação do Controlador

Arquivo: `src/interfaces/http/controllers/FileController.ts`

```typescript
import { Request, Response, NextFunction } from "express";
import { FileAppService } from "../../../application/services/FileAppService";
import { ApiError } from "../../errors/ApiError";

export class FileController {
  private fileAppService: FileAppService;

  constructor() {
    this.fileAppService = new FileAppService();
  }

  uploadFiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];

      // Se não houver arquivos, lançar erro (embora o middleware checkFilesExist já deva cuidar disso)
      if (!files || files.length === 0) {
        throw new ApiError("Arquivo não informado", 400);
      }

      const results = await this.fileAppService.uploadFiles(files);

      return res.status(200).json(results);
    } catch (error) {
      next(error);
    }
  };

  loadFiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uris } = req.body;

      if (!uris || !Array.isArray(uris) || uris.length === 0) {
        throw new ApiError("URIs não informadas ou inválidas", 400);
      }

      const files = await this.fileAppService.loadFiles(uris);

      return res.status(200).json(files);
    } catch (error) {
      next(error);
    }
  };
}
```

## Próximos Passos

Após implementar a API, siga para o próximo documento: [Armazenamento e Gerenciamento](./03-armazenamento-gerenciamento.md) para configurar o armazenamento adequado dos arquivos.
