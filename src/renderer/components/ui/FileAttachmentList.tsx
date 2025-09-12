import React from 'react'
import { TempFileCard, TempFileCardList } from '@renderer/components/ui'

export interface AttachmentListItem {
  id: string
  // When present, rendered as uploading file
  file?: File
  // When file is absent, render using messageFile-like info
  filename: string
  size: number
  mimeType: string
}

export interface FileAttachmentListProps {
  items: AttachmentListItem[]
  onRemove: (id: string) => void
  // Optional layout props passed to TempFileCardList
  alignSelf?: 'flex-end' | 'flex-start' | 'center' | string
  maxW?: string
  mb?: number | string
  className?: string
  spacing?: number
}

export const FileAttachmentList: React.FC<FileAttachmentListProps> = ({
  items,
  onRemove,
  alignSelf,
  maxW,
  mb,
  className,
  spacing
}) => {
  if (!items || items.length === 0) return null

  return (
    <TempFileCardList
      {...(alignSelf ? { alignSelf } : {})}
      {...(maxW ? { maxW } : {})}
      {...(mb ? { mb } : {})}
      {...(className ? { className } : {})}
      {...(spacing !== undefined ? { spacing } : {})}
    >
      {items.map((item) => (
        <TempFileCard
          key={item.id}
          {...(item.file
            ? { file: item.file }
            : {
                messageFile: { filename: item.filename, size: item.size, mimeType: item.mimeType }
              })}
          onRemove={() => onRemove(item.id)}
          variant="compact"
        />
      ))}
    </TempFileCardList>
  )
}

export default FileAttachmentList
