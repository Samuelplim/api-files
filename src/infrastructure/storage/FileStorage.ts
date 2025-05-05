import fs from "fs-extra";
import path from "path";
import { promisify } from "util";
import { ApiError } from "../../interfaces/errors/ApiError";
import crypto from "crypto";

const statAsync = promisify(fs.stat);

export class FileStorage {
  private baseUploadPath: string;

  constructor() {
    this.baseUploadPath = path.join(__dirname, "../../../public/uploads");
  }

  /**
   * Verifica se um arquivo existe
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await statAsync(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Constrói o caminho completo para um arquivo a partir de sua URI
   */
  getFullPath(uri: string): string {
    // Se a URI já for um caminho completo com a pasta public, retorna direto
    if (uri.startsWith("/uploads/")) {
      return path.join(__dirname, "../../../public", uri);
    }

    // Se a URI for apenas o nome do arquivo, busca na pasta padrão
    return path.join(this.baseUploadPath, uri);
  }

  /**
   * Recupera um arquivo do sistema de arquivos
   */
  async getFile(uri: string): Promise<{ buffer: Buffer; filePath: string }> {
    const filePath = this.getFullPath(uri);

    if (!(await this.fileExists(filePath))) {
      throw new ApiError(`Arquivo não encontrado: ${uri}`, 404);
    }

    try {
      const buffer = await this.readFile(filePath);
      return { buffer, filePath };
    } catch (error) {
      throw new ApiError(`Erro ao ler arquivo: ${uri}`, 500);
    }
  }

  /**
   * Determina o tipo MIME de um arquivo com base em sua extensão
   */
  getMimeType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();

    const mimeTypes: { [key: string]: string } = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".txt": "text/plain",
      ".zip": "application/zip",
      ".mp3": "audio/mpeg",
      ".mp4": "video/mp4",
      ".wav": "audio/wav",
      ".avi": "video/x-msvideo",
      ".mov": "video/quicktime",
      ".xml": "application/xml",
      ".csv": "text/csv",
    };

    return mimeTypes[extension] || "application/octet-stream";
  }

  /**
   * Cria os diretórios necessários para armazenar um arquivo
   */
  async ensureDirectoryExists(directoryPath: string): Promise<void> {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
  }

  /**
   * Converte um buffer para uma matriz de números para transferência via JSON
   */
  bufferToArray(buffer: Buffer): number[] {
    return Array.from(buffer);
  }

  /**
   * Calcula o hash SHA-256 de um buffer
   */
  calculateHash(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  /**
   * Verifica a integridade de um arquivo comparando seu hash
   */
  async verifyFileIntegrity(
    filePath: string,
    expectedHash?: string
  ): Promise<boolean> {
    try {
      const buffer = await this.readFile(filePath);
      const actualHash = this.calculateHash(buffer);

      // Se não houver hash esperado, apenas retorna true
      if (!expectedHash) {
        return true;
      }

      // Compara os hashes
      return actualHash === expectedHash;
    } catch (error) {
      return false;
    }
  }

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
