import { File } from "../entities/File";
import { FileRepository } from "../repositories/FileRepository";

export class FileService {
  private fileRepository: FileRepository;

  constructor(fileRepository: FileRepository) {
    this.fileRepository = fileRepository;
  }

  async saveFile(file: File): Promise<File> {
    return this.fileRepository.saveFile(file);
  }

  async getFileByUri(uri: string): Promise<File | null> {
    return this.fileRepository.getFileByUri(uri);
  }

  async getFilesByUris(uris: string[]): Promise<(File | null)[]> {
    return this.fileRepository.getFilesByUris(uris);
  }
}
