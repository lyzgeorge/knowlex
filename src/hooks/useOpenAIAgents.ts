/**
 * React Hook for OpenAI Agents
 *
 * Provides React integration for OpenAI Agents functionality including
 * chat messages, streaming responses, and conversation management.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  openaiAgentsService,
  ChatMessage,
  SendMessageOptions,
  ChatResponse,
} from '../services/api/openai-agents.service'
import { StreamController } from '../services/ipc.service'
import { StreamResponseChunk } from '@knowlex/types'

export interface UseOpenAIAgentsOptions {
  conversationId?: string
  projectId?: number
  ragEnabled?: boolean
  systemPrompt?: string
  onError?: (error: Error) => void
}

export interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  currentResponse: string
}

export interface UseOpenAIAgentsReturn {
  // State
  chatState: ChatState

  // Actions
  sendMessage: (
    message: string,
    options?: Partial<SendMessageOptions>
  ) => Promise<ChatResponse | null>
  sendMessageStream: (
    message: string,
    options?: Partial<SendMessageOptions>
  ) => StreamController | null
  generateTitle: (conversationId?: string) => Promise<string>
  generateSummary: (conversationId?: string, maxTokens?: number) => Promise<string>
  testConnection: (config: {
    apiKey: string
    baseUrl: string
    model: string
  }) => Promise<{ success: boolean; latency?: number; error?: string }>

  // Utilities
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void
  clearError: () => void
  stopStreaming: () => void

  // Validation
  validateMessage: (message: string) => { valid: boolean; error?: string }
  estimateTokens: (text: string) => number
}

export function useOpenAIAgents(options: UseOpenAIAgentsOptions = {}): UseOpenAIAgentsReturn {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isStreaming: false,
    error: null,
    currentResponse: '',
  })

  const streamControllerRef = useRef<StreamController | null>(null)
  const currentConversationIdRef = useRef<string | undefined>(options.conversationId)

  // Update conversation ID when options change
  useEffect(() => {
    currentConversationIdRef.current = options.conversationId
  }, [options.conversationId])

  /**
   * Add a message to the chat state
   */
  const addMessage = useCallback((message: ChatMessage) => {
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }))
  }, [])

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setChatState(prev => ({
      ...prev,
      messages: [],
      currentResponse: '',
    }))
  }, [])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setChatState(prev => ({
      ...prev,
      error: null,
    }))
  }, [])

  /**
   * Stop current streaming
   */
  const stopStreaming = useCallback(() => {
    if (streamControllerRef.current) {
      streamControllerRef.current.stop()
      streamControllerRef.current = null
    }

    setChatState(prev => ({
      ...prev,
      isStreaming: false,
      isLoading: false,
    }))
  }, [])

  /**
   * Send a message (non-streaming)
   */
  const sendMessage = useCallback(
    async (
      message: string,
      messageOptions: Partial<SendMessageOptions> = {}
    ): Promise<ChatResponse | null> => {
      try {
        // Validate message
        const validation = openaiAgentsService.validateMessage(message)
        if (!validation.valid) {
          setChatState(prev => ({
            ...prev,
            error: validation.error || 'Invalid message',
          }))
          return null
        }

        // Clear previous error
        clearError()

        // Set loading state
        setChatState(prev => ({
          ...prev,
          isLoading: true,
          error: null,
        }))

        // Add user message to state
        const userMessage: ChatMessage = {
          role: 'user',
          content: openaiAgentsService.cleanMessage(message),
          timestamp: new Date().toISOString(),
        }
        addMessage(userMessage)

        // Prepare options
        const sendOptions: SendMessageOptions = {
          conversationId: currentConversationIdRef.current,
          projectId: options.projectId,
          ragEnabled: options.ragEnabled ?? true,
          systemPrompt: options.systemPrompt,
          ...messageOptions,
        }

        // Send message
        const response = await openaiAgentsService.sendMessage(message, sendOptions)

        // Update conversation ID if this is a new conversation
        if (!currentConversationIdRef.current && response.conversationId) {
          currentConversationIdRef.current = response.conversationId
        }

        // Add assistant response to state
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.content,
          timestamp: new Date().toISOString(),
        }
        addMessage(assistantMessage)

        // Clear loading state
        setChatState(prev => ({
          ...prev,
          isLoading: false,
        }))

        return response
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        setChatState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }))

        options.onError?.(error instanceof Error ? error : new Error(errorMessage))
        return null
      }
    },
    [options, addMessage, clearError]
  )

  /**
   * Send a message with streaming response
   */
  const sendMessageStream = useCallback(
    (
      message: string,
      messageOptions: Partial<SendMessageOptions> = {}
    ): StreamController | null => {
      try {
        // Validate message
        const validation = openaiAgentsService.validateMessage(message)
        if (!validation.valid) {
          setChatState(prev => ({
            ...prev,
            error: validation.error || 'Invalid message',
          }))
          return null
        }

        // Clear previous error and stop any existing stream
        clearError()
        stopStreaming()

        // Set streaming state
        setChatState(prev => ({
          ...prev,
          isStreaming: true,
          isLoading: true,
          error: null,
          currentResponse: '',
        }))

        // Add user message to state
        const userMessage: ChatMessage = {
          role: 'user',
          content: openaiAgentsService.cleanMessage(message),
          timestamp: new Date().toISOString(),
        }
        addMessage(userMessage)

        // Prepare options
        const sendOptions = {
          conversationId: currentConversationIdRef.current,
          projectId: options.projectId,
          ragEnabled: options.ragEnabled ?? true,
          systemPrompt: options.systemPrompt,
          ...messageOptions,
          onData: (chunk: StreamResponseChunk) => {
            // Update conversation ID if this is a new conversation
            if (!currentConversationIdRef.current && chunk.conversationId) {
              currentConversationIdRef.current = chunk.conversationId
            }

            if (chunk.isComplete) {
              // Add complete assistant message to state
              setChatState(prev => {
                const assistantMessage: ChatMessage = {
                  role: 'assistant',
                  content: prev.currentResponse,
                  timestamp: new Date().toISOString(),
                }

                return {
                  ...prev,
                  messages: [...prev.messages, assistantMessage],
                  isStreaming: false,
                  isLoading: false,
                  currentResponse: '',
                }
              })
            } else {
              // Update current response
              setChatState(prev => ({
                ...prev,
                currentResponse: prev.currentResponse + chunk.content,
              }))
            }
          },
          onError: (error: Error) => {
            setChatState(prev => ({
              ...prev,
              isStreaming: false,
              isLoading: false,
              error: error.message,
            }))
            options.onError?.(error)
          },
          onEnd: () => {
            setChatState(prev => ({
              ...prev,
              isStreaming: false,
              isLoading: false,
            }))
          },
        }

        // Start streaming
        const controller = openaiAgentsService.sendMessageStream(message, sendOptions)
        streamControllerRef.current = controller

        return controller
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        setChatState(prev => ({
          ...prev,
          isStreaming: false,
          isLoading: false,
          error: errorMessage,
        }))

        options.onError?.(error instanceof Error ? error : new Error(errorMessage))
        return null
      }
    },
    [options, addMessage, clearError, stopStreaming]
  )

  /**
   * Generate title for conversation
   */
  const generateTitle = useCallback(async (conversationId?: string): Promise<string> => {
    try {
      const targetConversationId = conversationId || currentConversationIdRef.current
      if (!targetConversationId) {
        throw new Error('No conversation ID available')
      }

      return await openaiAgentsService.generateTitle(targetConversationId)
    } catch (error) {
      console.warn('Failed to generate title:', error)
      return 'Untitled Chat'
    }
  }, [])

  /**
   * Generate summary for conversation
   */
  const generateSummary = useCallback(
    async (conversationId?: string, maxTokens?: number): Promise<string> => {
      try {
        const targetConversationId = conversationId || currentConversationIdRef.current
        if (!targetConversationId) {
          throw new Error('No conversation ID available')
        }

        return await openaiAgentsService.generateSummary(targetConversationId, maxTokens)
      } catch (error) {
        console.warn('Failed to generate summary:', error)
        return 'Unable to generate summary'
      }
    },
    []
  )

  /**
   * Test API connection
   */
  const testConnection = useCallback(
    async (config: {
      apiKey: string
      baseUrl: string
      model: string
    }): Promise<{ success: boolean; latency?: number; error?: string }> => {
      return await openaiAgentsService.testConnection(config)
    },
    []
  )

  /**
   * Validate message
   */
  const validateMessage = useCallback((message: string) => {
    return openaiAgentsService.validateMessage(message)
  }, [])

  /**
   * Estimate tokens
   */
  const estimateTokens = useCallback((text: string) => {
    return openaiAgentsService.estimateTokens(text)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamControllerRef.current) {
        streamControllerRef.current.stop()
      }
    }
  }, [])

  return {
    chatState,
    sendMessage,
    sendMessageStream,
    generateTitle,
    generateSummary,
    testConnection,
    addMessage,
    clearMessages,
    clearError,
    stopStreaming,
    validateMessage,
    estimateTokens,
  }
}
