import type { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints'

export function patchFileUploadBlocks(
  blocks: BlockObjectRequest[],
  uploadMap: Map<string, string>,
): BlockObjectRequest[] {
  if (uploadMap.size === 0) return blocks

  return blocks.map((block) => {
    if (block.type === 'image') {
      const image = (block as any).image
      if (image?.type === 'external' && image.external?.url) {
        const fileUploadId = uploadMap.get(image.external.url)
        if (fileUploadId) {
          return {
            ...block,
            image: {
              type: 'file_upload' as const,
              file_upload: { id: fileUploadId },
            },
          } as unknown as BlockObjectRequest
        }
      }
    }
    if (block.type === 'file') {
      const file = (block as any).file
      if (file?.type === 'external' && file.external?.url) {
        const fileUploadId = uploadMap.get(file.external.url)
        if (fileUploadId) {
          return {
            ...block,
            file: {
              type: 'file_upload' as const,
              file_upload: { id: fileUploadId },
            },
          } as unknown as BlockObjectRequest
        }
      }
    }
    return block
  })
}
