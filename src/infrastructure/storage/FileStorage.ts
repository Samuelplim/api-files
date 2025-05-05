import fs from "fs-extra";
import path from "path";
import { ApiError } from "../../interfaces/errors/ApiError";

export class FileStorage {
  async readFile(filePath: string): Promise<Buffer> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new ApiError(
          `Arquivo não encontrado: ${path.basename(filePath)}`,
          404
        );
      }

      return await fs.readFile(filePath);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Erro ao ler arquivo: ${(error as Error).message}`,
        500
      );
    }
  }

  async removeFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.unlink(filePath);
      }
    } catch (error) {
      throw new ApiError(
        `Erro ao remover arquivo: ${(error as Error).message}`,
        500
      );
    }
  }
}
