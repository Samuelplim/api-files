import { File } from "../entities/File";

export interface FileRepository {
  saveFile(file: File): Promise<File>;
  getFileByUri(uri: string): Promise<File | null>;
  getFilesByUris(uris: string[]): Promise<(File | null)[]>;
}
