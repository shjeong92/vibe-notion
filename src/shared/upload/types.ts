export type UploadResult = {
  url: string
  fileId: string
}

export type FileInfo = {
  path: string
  name: string
  size: number
  contentType: string
  isImage: boolean
}
