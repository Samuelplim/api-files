import { File } from "../../domain/entities/File";
import { FileService } from "../../domain/services/FileService";
import { FileRepositoryImpl } from "../../infrastructure/repositories/FileRepositoryImpl";
import { FileStorage } from "../../infrastructure/storage/FileStorage";
import { FileResponseDto } from "../dto/FileResponseDto";
import { FileUploadDto } from "../dto/FileUploadDto";
import { ApiError } from "../../interfaces/errors/ApiError";
import { v4 as uuidv4 } from "uuid";
import path from "path";

export class FileAppService {
  private fileService: FileService;
  private fileStorage: FileStorage;

  constructor() {
    const fileRepository = new FileRepositoryImpl();
    this.fileService = new FileService(fileRepository);
    this.fileStorage = new FileStorage();
  }

  async uploadFiles(files: Express.Multer.File[]): Promise<FileUploadDto[]> {
    const results: FileUploadDto[] = [];

    for (const file of files) {
      // Os arquivos já foram salvos pelo Multer, só precisamos registrar
      const id = uuidv4();

      // Calcular URI relativa (sem caminho absoluto)
      const relativePath = file.path.replace(
        path.join(process.cwd(), "public"),
        ""
      );
      const uri = relativePath.replace(/\\/g, "/"); // Normaliza separadores para URLs

      // Calcular hash do arquivo para verificação de integridade
      const buffer = await this.fileStorage.readFile(file.path);
      const hash = this.fileStorage.calculateHash(buffer);

      const fileEntity = new File(
        id,
        file.originalname,
        file.filename,
        file.path,
        uri,
        file.mimetype,
        file.size,
        hash
      );

      await this.fileService.saveFile(fileEntity);

      results.push({
        type: file.mimetype,
        uri: uri,
        name: file.originalname,
      });
    }

    return results;
  }

  async loadFiles(uris: string[]): Promise<FileResponseDto[]> {
    const results: FileResponseDto[] = [];

    // Primeiro, verificamos se os arquivos existem na base de dados
    const files = await this.fileService.getFilesByUris(uris);

    // Verificar se todos os arquivos foram encontrados
    const missingFiles = files.some((file) => file === null);
    if (missingFiles) {
      throw new ApiError("Um ou mais arquivos não foram encontrados", 400);
    }

    for (const file of files) {
      if (file) {
        try {
          // Buscar o arquivo no sistema de arquivos usando os novos métodos
          const { buffer, filePath } = await this.fileStorage.getFile(file.uri);

          // Verificar a integridade do arquivo se houver hash armazenado
          if (file.hash) {
            const isIntegrityValid = await this.fileStorage.verifyFileIntegrity(
              filePath,
              file.hash
            );

            if (!isIntegrityValid) {
              throw new ApiError(
                `Falha na verificação de integridade do arquivo: ${file.uri}`,
                400
              );
            }
          }

          // Obter o tipo MIME (podemos usar o armazenado ou determinar novamente)
          const type = file.mimeType || this.fileStorage.getMimeType(filePath);

          // Converter buffer para array
          const bufferArray = this.fileStorage.bufferToArray(buffer);

          // Adicionar ao resultado
          results.push({
            buffer: {
              type: "Buffer",
              data: bufferArray,
            },
            type: type,
          });
        } catch (error) {
          if (error instanceof ApiError) {
            throw error;
          }
          throw new ApiError(`Erro ao processar arquivo: ${file.uri}`, 500);
        }
      }
    }

    return results;
  }
}
