export interface IPCResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
