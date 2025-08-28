import { useCallback } from 'react'
import type { MessageContent } from '@shared/types/message'

/**
 * Hook for comparing message content without relying on JSON.stringify
 */
export function useMessageContentDiff(originalContent: MessageContent) {
  const compare = useCallback(
    (newContent: MessageContent): boolean => {
      // Quick length check
      if (originalContent.length !== newContent.length) {
        return true
      }

      // Compare each part
      for (let i = 0; i < originalContent.length; i++) {
        const originalPart = originalContent[i]
        const newPart = newContent[i]

        if (!originalPart || !newPart || originalPart.type !== newPart.type) {
          return true
        }

        switch (originalPart.type) {
          case 'text':
            if (originalPart.text !== newPart.text) {
              return true
            }
            break

          case 'temporary-file': {
            const originalFile = originalPart.temporaryFile
            const newFile = newPart.temporaryFile
            if (!originalFile || !newFile) return true

            if (
              originalFile.filename !== newFile.filename ||
              originalFile.mimeType !== newFile.mimeType ||
              originalFile.size !== newFile.size ||
              originalFile.content !== newFile.content
            ) {
              return true
            }
            break
          }

          case 'image': {
            const originalImage = originalPart.image
            const newImage = newPart.image
            if (!originalImage || !newImage) return true

            if (
              originalImage.filename !== newImage.filename ||
              originalImage.mediaType !== newImage.mediaType ||
              originalImage.image !== newImage.image
            ) {
              return true
            }
            break
          }

          default:
            // For any other content types, fall back to JSON comparison
            if (JSON.stringify(originalPart) !== JSON.stringify(newPart)) {
              return true
            }
        }
      }

      return false
    },
    [originalContent]
  )

  return { compare }
}
