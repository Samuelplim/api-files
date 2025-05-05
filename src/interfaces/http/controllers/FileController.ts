import { Request, Response, NextFunction } from "express";
import { FileAppService } from "../../../application/services/FileAppService";
import { ApiError } from "../../errors/ApiError";

export class FileController {
  private fileAppService: FileAppService;

  constructor() {
    this.fileAppService = new FileAppService();
  }

  uploadFiles = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];

      // Se não houver arquivos, lançar erro (embora o middleware checkFilesExist já deva cuidar disso)
      if (!files || files.length === 0) {
        throw new ApiError("Arquivo não informado", 400);
      }

      const results = await this.fileAppService.uploadFiles(files);

      res.status(200).json(results);
      return;
    } catch (error) {
      next(error);
    }
  };

  loadFiles = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { uris } = req.body;

      if (!uris || !Array.isArray(uris) || uris.length === 0) {
        throw new ApiError("URIs não informadas ou inválidas", 400);
      }

      const files = await this.fileAppService.loadFiles(uris);

      res.status(200).json(files);
      return;
    } catch (error) {
      next(error);
    }
  };
}
