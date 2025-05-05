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
