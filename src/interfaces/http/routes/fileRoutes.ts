import { Router } from "express";
import { FileController } from "../controllers/FileController";
import { upload, checkFilesExist } from "../../../infrastructure/config/multer";
import {
  validateFileUpload,
  validateLoadFilesRequest,
} from "../middlewares/validation";

const router = Router();
const fileController = new FileController();

// Rota para upload de múltiplos arquivos
router.post(
  "/add-files",
  upload.array("files"),
  checkFilesExist,
  validateFileUpload,
  fileController.uploadFiles
);

// Rota para buscar arquivos por URI
router.post("/load-files", validateLoadFilesRequest, fileController.loadFiles);

export const fileRoutes = router;
