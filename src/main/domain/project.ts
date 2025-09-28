import type { Project } from '@shared/types/project'

interface ProjectCreateInput {
  name: string
}

interface ProjectUpdateInput {
  name?: string
}

export interface ProjectRepository {
  insert(project: Project): Promise<void>
  findById(projectId: string): Promise<Project | null>
  list(): Promise<Project[]>
  update(projectId: string, updates: Partial<Pick<Project, 'name'>>): Promise<void>
  delete(projectId: string): Promise<void>
}

export interface ProjectUseCases {
  createProject(input: ProjectCreateInput): Promise<Project>
  getProjectById(projectId: string): Promise<Project | null>
  listProjects(): Promise<Project[]>
  updateProject(projectId: string, updates: ProjectUpdateInput): Promise<Project>
  deleteProject(projectId: string): Promise<void>
}
