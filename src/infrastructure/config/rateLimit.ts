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
