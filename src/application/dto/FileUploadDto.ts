export interface FileUploadDto {
  type: string; // MIME type do arquivo
  uri: string; // URI para acesso ao arquivo
  name: string; // Nome original do arquivo
}
