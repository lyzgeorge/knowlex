/**
 * OpenAI Test Handler
 *
 * Simple test handler to verify OpenAI Agents integration is working
 * without requiring database functionality.
 */

import { IpcMainEvent } from 'electron'
import { BaseIPCHandler } from './base.handler'
import { IPCMessage, IPCResponse } from '../types/ipc.types'
import { OpenAIAgentsWrapperService } from '../services/ai/openai-agents-wrapper.service'
import { ipcManager } from './ipc.manager'

export class OpenAITestHandler extends BaseIPCHandler {
  protected handlerName = 'OpenAITestHandler'
  private openaiService: OpenAIAgentsWrapperService

  constructor(openaiService: OpenAIAgentsWrapperService) {
    super()
    this.openaiService = openaiService
  }

  /**
   * Register test handlers
   */
  registerHandlers(): void {
    ipcManager.registerHandler('openai:test-connection', this.handleTestConnection.bind(this))
    ipcManager.registerHandler('openai:send-message', this.handleSendMessage.bind(this))
  }

  /**
   * Handle test connection request
   */
  private async handleTestConnection(
    message: IPCMessage<{
      channel: string
      data: { apiKey: string; baseUrl: string; model: string }
    }>,
    _event: IpcMainEvent
  ): Promise<IPCResponse> {
    return this.handleWithErrorCatch(message, async data => {
      const { data: config } = data

      this.validateRequired(config, ['apiKey', 'baseUrl', 'model'])

      // Configure the service temporarily for testing
      await this.openaiService.updateConfig(config)

      // Test the connection
      const result = await this.openaiService.testConnection()

      return result
    })
  }

  /**
   * Handle send message request
   */
  private async handleSendMessage(
    message: IPCMessage<{
      channel: string
      data: { message: string; apiKey: string; baseUrl: string; model: string }
    }>,
    _event: IpcMainEvent
  ): Promise<IPCResponse> {
    return this.handleWithErrorCatch(message, async data => {
      const { data: requestData } = data

      this.validateRequired(requestData, ['message', 'apiKey', 'baseUrl', 'model'])

      // Configure the service temporarily
      await this.openaiService.updateConfig({
        apiKey: requestData.apiKey,
        baseUrl: requestData.baseUrl,
        model: requestData.model,
      })

      // Send the message
      const result = await this.openaiService.sendMessage([
        { role: 'user', content: requestData.message },
      ])

      return result
    })
  }
}
