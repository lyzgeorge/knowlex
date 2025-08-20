/**
 * CancellationToken
 *
 * A simple utility class to manage cancellation of asynchronous operations.
 * An instance of this class can be passed to long-running tasks.
 * The task can then check the `isCancelled` property to see if it should stop.
 * The `cancel()` method is called by the originator of the task to signal cancellation.
 */
export class CancellationToken {
  private _isCancelled = false
  private _onCancelCallbacks: (() => void)[] = []

  /**
   * Checks if cancellation has been requested.
   * @returns {boolean} `true` if `cancel()` has been called, otherwise `false`.
   */
  get isCancelled(): boolean {
    return this._isCancelled
  }

  /**
   * Signals that the operation should be cancelled.
   * This is a one-way operation; once cancelled, it cannot be un-cancelled.
   */
  cancel(): void {
    if (this._isCancelled) return

    this._isCancelled = true

    // Execute all registered callbacks
    for (const callback of this._onCancelCallbacks) {
      try {
        callback()
      } catch (error) {
        console.error('Error in cancellation callback:', error)
      }
    }

    // Clear callbacks after execution
    this._onCancelCallbacks = []
  }

  /**
   * Registers a callback to be executed when cancellation is requested.
   * @param callback Function to execute on cancellation
   */
  onCancel(callback: () => void): void {
    if (this._isCancelled) {
      // If already cancelled, execute immediately
      callback()
      return
    }

    this._onCancelCallbacks.push(callback)
  }

  /**
   * Throws an error if the token has been cancelled.
   * Useful for early exit in async operations.
   */
  throwIfCancelled(): void {
    if (this._isCancelled) {
      throw new Error('Operation was cancelled')
    }
  }
}

/**
 * CancellationManager
 *
 * Manages multiple cancellation tokens by ID, allowing for easy
 * creation, cancellation, and cleanup of long-running operations.
 */
export class CancellationManager {
  private tokens = new Map<string, CancellationToken>()

  /**
   * Creates a new cancellation token for the given ID.
   * If a token already exists for this ID, it will be cancelled and replaced.
   * @param id Unique identifier for the operation
   * @returns New cancellation token
   */
  createToken(id: string): CancellationToken {
    // Cancel existing token if it exists
    const existingToken = this.tokens.get(id)
    if (existingToken) {
      existingToken.cancel()
    }

    // Create and store new token
    const token = new CancellationToken()
    this.tokens.set(id, token)
    return token
  }

  /**
   * Cancels the operation with the given ID.
   * @param id Identifier of the operation to cancel
   * @returns true if a token was found and cancelled, false otherwise
   */
  cancel(id: string): boolean {
    const token = this.tokens.get(id)
    if (token) {
      token.cancel()
      return true
    }
    return false
  }

  /**
   * Registers an existing cancellation token under the given ID.
   * If a token already exists for this ID, it will be cancelled and replaced.
   * Use this when the stream ID (e.g., messageId) is only known after start.
   */
  registerToken(id: string, token: CancellationToken): void {
    const existing = this.tokens.get(id)
    if (existing && existing !== token) {
      existing.cancel()
    }
    this.tokens.set(id, token)
  }

  /**
   * Marks an operation as complete and removes its token.
   * @param id Identifier of the completed operation
   */
  complete(id: string): void {
    this.tokens.delete(id)
  }

  /**
   * Gets the cancellation token for the given ID.
   * @param id Identifier of the operation
   * @returns CancellationToken if found, undefined otherwise
   */
  getToken(id: string): CancellationToken | undefined {
    return this.tokens.get(id)
  }

  /**
   * Cancels all active operations and clears all tokens.
   */
  cancelAll(): void {
    Array.from(this.tokens.values()).forEach((token) => {
      token.cancel()
    })
    this.tokens.clear()
  }

  /**
   * Gets the number of active (non-cancelled) tokens.
   */
  get activeCount(): number {
    return this.tokens.size
  }
}

// Export a singleton instance for global use
export const cancellationManager = new CancellationManager()
