# 4. Segurança e Limitações

Este documento descreve as medidas de segurança e as limitações implementadas no sistema de gerenciamento de arquivos.

## Limitações de Tamanho para Uploads

### 1. Configuração de Limites no Multer

A configuração de limites já foi parcialmente implementada no arquivo `multer.ts`. Vamos expandir essa configuração:

Arquivo: `src/infrastructure/config/multer.ts` (adicionar/modificar seção de limites)

```typescript
// Configuração do limite de tamanho
const limits = {
  fileSize: 10 * 1024 * 1024, // 10MB por arquivo por padrão
  files: 10, // Máximo de 10 arquivos por requisição por padrão
};

// Middleware Multer configurado com os limites definidos
export const upload = multer({
  storage,
  fileFilter,
  limits,
});
```

### 2. Limitações Configuráveis

Para tornar as limitações mais flexíveis, podemos configurá-las através de variáveis de ambiente:

Arquivo: `.env` (adicionar estas variáveis)

```
MAX_FILE_SIZE=10485760  # 10MB em bytes
MAX_FILES_PER_REQUEST=10
```

Arquivo: `src/infrastructure/config/multer.ts` (versão atualizada com configurações)

```typescript
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { ApiError } from "../../interfaces/errors/ApiError";
import dotenv from "dotenv";

// Carrega variáveis de ambiente
dotenv.config();

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
  // Por enquanto, aceita qualquer tipo de arquivo
  cb(null, true);
};

// Configuração do limite de tamanho a partir das variáveis de ambiente
const limits = {
  fileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10), // 10MB por arquivo por padrão
  files: parseInt(process.env.MAX_FILES_PER_REQUEST || "10", 10), // Máximo de 10 arquivos por requisição por padrão
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

// Middleware para lidar com erros do Multer
export const handleMulterErrors = (
  err: any,
  req: Express.Request,
  res: Express.Response,
  next: Function
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: `Tamanho do arquivo excede o limite de ${
          limits.fileSize / (1024 * 1024)
        }MB`,
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        error: `Número máximo de arquivos excedido. Limite: ${limits.files} arquivos`,
      });
    }
    return res.status(400).json({ error: `Erro no upload: ${err.message}` });
  }
  next(err);
};
```

## Validação de Tipos de Arquivos

### 1. Implementação de Validação de Tipos de Arquivos

Para adicionar validação de tipos de arquivos, vamos modificar a função `fileFilter`:

```typescript
// Lista de tipos MIME permitidos (pode ser configurada por variável de ambiente ou banco de dados)
const ALLOWED_MIME_TYPES = [
  // Imagens
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/svg+xml",
  // Documentos
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Texto
  "text/plain",
  "text/csv",
  // Outros
  "application/zip",
  "application/x-rar-compressed",
];

// Configuração de filtro de arquivos
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Se não houver limitação de tipos ou a opção estiver desabilitada, aceitar qualquer arquivo
  if (process.env.VALIDATE_FILE_TYPES !== "true") {
    return cb(null, true);
  }

  // Verificar se o tipo MIME do arquivo está na lista de permitidos
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        `Tipo de arquivo não permitido: ${file.mimetype}`,
        400
      ) as any,
      false
    );
  }
};
```

### 2. Configuração de Validação via Variáveis de Ambiente

Arquivo: `.env` (adicionar esta variável)

```
VALIDATE_FILE_TYPES=false   # Se true, valida os tipos de arquivo conforme a lista
```

## Segurança Adicional

### 1. Implementação de Rate Limiting

Para evitar ataques de sobrecarga no servidor, vamos implementar um rate limiter:

Primeiro, adicionar a dependência:

```bash
npm install express-rate-limit
```

Arquivo: `src/infrastructure/config/rateLimit.ts`

```typescript
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

// Rate limiter para rotas de upload
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.UPLOAD_RATE_LIMIT || "100", 10), // limite de requisições por IP
  message:
    "Muitas requisições de upload deste IP, tente novamente após 15 minutos",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para rotas de download
export const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.DOWNLOAD_RATE_LIMIT || "300", 10), // limite de requisições por IP
  message:
    "Muitas requisições de download deste IP, tente novamente após 15 minutos",
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 2. Aplicação do Rate Limiting às Rotas

Arquivo: `src/interfaces/http/routes/fileRoutes.ts` (versão atualizada)

```typescript
import { Router } from "express";
import { FileController } from "../controllers/FileController";
import {
  upload,
  checkFilesExist,
  handleMulterErrors,
} from "../../../infrastructure/config/multer";
import { validateFileLoad } from "../middlewares/validation";
import {
  uploadLimiter,
  downloadLimiter,
} from "../../../infrastructure/config/rateLimit";

const router = Router();
const fileController = new FileController();

// Rota para upload de múltiplos arquivos com rate limiting
router.post(
  "/add-files",
  uploadLimiter,
  upload.array("files"),
  handleMulterErrors,
  checkFilesExist,
  fileController.uploadFiles
);

// Rota para buscar arquivos por URI com rate limiting
router.post(
  "/load-files",
  downloadLimiter,
  validateFileLoad,
  fileController.loadFiles
);

export const fileRoutes = router;
```

### 3. Verificação de Integridade dos Arquivos

Para garantir a integridade dos arquivos enviados, podemos implementar verificação de hash:

Arquivo: `src/infrastructure/storage/FileStorage.ts` (adicionar métodos de verificação)

```typescript
import crypto from 'crypto';

// Adicionar ao FileStorage class
/**
 * Calcula o hash SHA-256 de um buffer
 */
calculateHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Verifica a integridade de um arquivo comparando seu hash
 */
async verifyFileIntegrity(filePath: string, expectedHash?: string): Promise<boolean> {
  try {
    const { buffer } = await this.getFile(filePath);
    const actualHash = this.calculateHash(buffer);

    // Se não houver hash esperado, apenas retorna o hash calculado
    if (!expectedHash) {
      return true;
    }

    // Compara os hashes
    return actualHash === expectedHash;
  } catch (error) {
    return false;
  }
}
```

## Variáveis de Ambiente Completas

Aqui está a lista completa de variáveis de ambiente para configuração da segurança e limitações:

Arquivo: `.env`

```
# Configurações do servidor
PORT=3000
NODE_ENV=development

# Configurações de upload
UPLOAD_DIR=public/uploads
MAX_FILE_SIZE=10485760  # 10MB em bytes
MAX_FILES_PER_REQUEST=10
VALIDATE_FILE_TYPES=false

# Configurações de rate limiting
UPLOAD_RATE_LIMIT=100  # Requisições por 15 minutos por IP
DOWNLOAD_RATE_LIMIT=300  # Requisições por 15 minutos por IP
```

## Próximos Passos

Após implementar as medidas de segurança e limitações, siga para o próximo documento: [Testes e Documentação](./05-testes-documentacao.md) para garantir a qualidade e a documentação adequada do sistema.
