import { Request, Response, NextFunction } from "express";
import { FileAppService } from "../../../application/services/FileAppService";
import { FileStorage } from "../../../infrastructure/storage/FileStorage";
import { ApiError } from "../../errors/ApiError";
import path from "path";

export class FileTestController {
  private fileAppService: FileAppService;
  private fileStorage: FileStorage;

  constructor() {
    this.fileAppService = new FileAppService();
    this.fileStorage = new FileStorage();
  }

  testStorageOperations = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Verificar se a pasta public/uploads existe
      const baseUploadPath = path.join(process.cwd(), "public/uploads");
      await this.fileStorage.ensureDirectoryExists(baseUploadPath);

      // Verificar pastas de categorias
      const categoriesPaths = [
        path.join(baseUploadPath, "categories", "documents"),
        path.join(baseUploadPath, "categories", "images"),
        path.join(baseUploadPath, "categories", "other"),
      ];

      for (const categoryPath of categoriesPaths) {
        await this.fileStorage.ensureDirectoryExists(categoryPath);
      }

      // Testar a determinação de tipo MIME para diferentes extensões
      const mimeTests = [
        { filePath: "teste.jpg", expected: "image/jpeg" },
        { filePath: "teste.pdf", expected: "application/pdf" },
        { filePath: "teste.txt", expected: "text/plain" },
        { filePath: "teste.unknown", expected: "application/octet-stream" },
      ];

      const mimeResults = mimeTests.map((test) => ({
        filePath: test.filePath,
        mimeType: this.fileStorage.getMimeType(test.filePath),
        expected: test.expected,
        passed: this.fileStorage.getMimeType(test.filePath) === test.expected,
      }));

      // Retornar resultados dos testes
      res.status(200).json({
        message:
          "Testes de armazenamento e gerenciamento executados com sucesso",
        storage: {
          baseUploadPath,
          categoriesPaths,
        },
        mimeTypeTests: mimeResults,
      });

      return;
    } catch (error) {
      next(error);
    }
  };
}
