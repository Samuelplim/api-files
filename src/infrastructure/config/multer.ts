import multer from "multer";
import path from "path";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";
import { ApiError } from "../../interfaces/errors/ApiError";
import { Request, Response, NextFunction } from "express";
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
    const uploadDir = path.join(process.cwd(), "public/uploads", dateFolder);

    fs.ensureDirSync(uploadDir);
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
    const uniqueId = uuidv4().slice(0, 8);

    // Combinar para criar um nome de arquivo único
    const newFileName = `${timestamp}-${uniqueId}-${normalizedName}${fileExt}`;

    cb(null, newFileName);
  },
});

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

// Configuração do limite de tamanho
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
    next(new ApiError("Arquivo não informado", 400));
    return;
  }
  next();
};

// Middleware para lidar com erros do Multer
export const handleMulterErrors = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
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
