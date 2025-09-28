import { z } from 'zod'

const NonEmptyString = z.string().trim().min(1, 'Value is required')

const ProjectIdSchema = NonEmptyString.describe('Project ID')
const ProjectNameSchema = z
  .string()
  .trim()
  .min(1, 'Project name is required')
  .max(100, 'Project name must be 100 characters or less')

export const ProjectCreateRequestSchema = z
  .object({
    name: ProjectNameSchema
  })
  .strict()

export const ProjectUpdateRequestSchema = z
  .object({
    id: ProjectIdSchema,
    updates: z
      .object({
        name: ProjectNameSchema.optional()
      })
      .strict()
  })
  .strict()
  .refine((data) => data.updates.name !== undefined, {
    message: 'At least one field must be provided for update',
    path: ['updates']
  })
