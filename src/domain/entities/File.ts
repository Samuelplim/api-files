export class File {
  id: string;
  originalName: string;
  fileName: string;
  path: string;
  uri: string;
  mimeType: string;
  size: number;
  hash?: string;
  createdAt: Date;

  constructor(
    id: string,
    originalName: string,
    fileName: string,
    path: string,
    uri: string,
    mimeType: string,
    size: number,
    hash?: string
  ) {
    this.id = id;
    this.originalName = originalName;
    this.fileName = fileName;
    this.path = path;
    this.uri = uri;
    this.mimeType = mimeType;
    this.size = size;
    this.hash = hash;
    this.createdAt = new Date();
  }
}
