import multer from "multer";
import path from "path";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";
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
    next(new ApiError("Arquivo não informado", 400));
    return;
  }
  next();
};
