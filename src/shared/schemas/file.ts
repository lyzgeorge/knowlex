import { z } from 'zod'
import { FILE_CONSTRAINTS } from '@shared/constants/file'
import { validateFileConstraints } from '@shared/utils/validation'

const FileNameSchema = z.string().min(1, 'Filename is required').max(512, 'Filename is too long')

const FileSizeSchema = z
  .number()
  .int({ message: 'File size must be an integer' })
  .nonnegative({ message: 'File size must be non-negative' })

const BaseFileSchema = z.object({
  name: FileNameSchema,
  size: FileSizeSchema
})

const AttachmentProcessFileSchema = BaseFileSchema.extend({
  path: z.string().min(1, 'File path is required')
})

const AttachmentContentFileSchema = BaseFileSchema.extend({
  content: z.string().min(1, 'File content is required')
})

const refineWithSharedConstraints = <T extends { name: string; size: number }>(
  files: T[],
  ctx: z.RefinementCtx
) => {
  const validation = validateFileConstraints(
    files.map((file) => ({ name: file.name, size: file.size }))
  )
  if (!validation.valid) {
    validation.errors.forEach((message) =>
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message
      })
    )
  }
}

export const AttachmentProcessRequestSchema = z
  .object({
    files: z
      .array(AttachmentProcessFileSchema)
      .min(1, 'At least one file is required')
      .max(
        FILE_CONSTRAINTS.maxFilesPerBatch,
        `No more than ${FILE_CONSTRAINTS.maxFilesPerBatch} files per batch`
      )
  })
  .superRefine((data, ctx) => {
    refineWithSharedConstraints(data.files, ctx)
  })

export const AttachmentContentProcessRequestSchema = z
  .object({
    files: z
      .array(AttachmentContentFileSchema)
      .min(1, 'At least one file is required')
      .max(
        FILE_CONSTRAINTS.maxFilesPerBatch,
        `No more than ${FILE_CONSTRAINTS.maxFilesPerBatch} files per batch`
      )
  })
  .superRefine((data, ctx) => {
    refineWithSharedConstraints(data.files, ctx)
  })

export type AttachmentProcessRequestInput = z.infer<typeof AttachmentProcessRequestSchema>
export type AttachmentContentProcessRequestInput = z.infer<
  typeof AttachmentContentProcessRequestSchema
>
