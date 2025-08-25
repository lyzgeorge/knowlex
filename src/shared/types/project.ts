export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface CreateProjectData {
  name: string
}

export interface UpdateProjectData {
  name?: string
}
