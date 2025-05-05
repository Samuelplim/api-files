import { Router } from "express";
import { FileController } from "../controllers/FileController";
import {
  upload,
  checkFilesExist,
  handleMulterErrors,
} from "../../../infrastructure/config/multer";
import {
  validateFileUpload,
  validateLoadFilesRequest,
} from "../middlewares/validation";
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
  (req, res, next) => {
    upload.array("files")(req, res, (err) => {
      if (err) {
        return handleMulterErrors(err, req, res, next);
      }
      next();
    });
  },
  checkFilesExist,
  validateFileUpload,
  fileController.uploadFiles
);

// Rota para buscar arquivos por URI com rate limiting
router.post(
  "/load-files",
  downloadLimiter,
  validateLoadFilesRequest,
  fileController.loadFiles
);

export const fileRoutes = router;
