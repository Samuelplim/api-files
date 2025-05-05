import { File } from "../../domain/entities/File";
import { FileRepository } from "../../domain/repositories/FileRepository";
import { ApiError } from "../../interfaces/errors/ApiError";

// Este é um repositório em memória para simplificar
// Em uma aplicação real, seria usado um banco de dados
export class FileRepositoryImpl implements FileRepository {
  private files: Map<string, File> = new Map();

  async saveFile(file: File): Promise<File> {
    this.files.set(file.uri, file);
    return file;
  }

  async getFileByUri(uri: string): Promise<File | null> {
    return this.files.get(uri) || null;
  }

  async getFilesByUris(uris: string[]): Promise<(File | null)[]> {
    return uris.map((uri) => this.files.get(uri) || null);
  }
}
