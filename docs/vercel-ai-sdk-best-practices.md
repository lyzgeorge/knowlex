# Vercel AI SDK 5.0 Best Practices for Knowlex

## Key Improvements Made

### 1. Import Pattern Fixes
- ✅ Removed outdated `.bind()` pattern
- ✅ Use consistent `createXXX()` functions for all providers
- ✅ Simplified imports from provider packages

### 2. Error Handling Fixes  
- ✅ Fixed `this.enhanceError` calls to use `enhanceError` function
- ✅ Proper error context and provider-specific messages

### 3. Provider Configuration
- ✅ Consistent configuration pattern across all providers
- ✅ Optional baseURL support where applicable
- ✅ Proper model capabilities mapping

## Advanced Usage Patterns

### Streaming with Event Callbacks
```typescript
const result = await streamText({
  model: openai('gpt-4o'),
  messages,
  onChunk: ({ chunk }) => {
    console.log('Received chunk:', chunk)
  },
  onFinish: ({ text, usage }) => {
    console.log('Final text:', text)
    console.log('Token usage:', usage)
  },
  onError: (error) => {
    console.error('Streaming error:', error)
  }
})
```

### Tool Calling Support
```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  messages,
  tools: {
    searchFiles: {
      description: 'Search for files in the project',
      parameters: z.object({
        query: z.string().describe('Search query')
      }),
      execute: async ({ query }) => {
        // Implementation here
        return { results: [] }
      }
    }
  }
})
```

### Response Format Control
```typescript
// For structured output
const result = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    tags: z.array(z.string())
  }),
  prompt: 'Analyze this content...'
})
```

## Error Handling Best Practices

### 1. Network Error Handling
- Implement retry logic for temporary failures
- Provide meaningful error messages to users
- Log detailed errors for debugging

### 2. Rate Limit Handling
- Implement exponential backoff
- Queue requests when hitting limits
- Provide user feedback about delays

### 3. Model-Specific Error Handling
- Different providers have different error formats
- Map provider errors to consistent user messages
- Handle model availability issues

## Performance Optimizations

### 1. Model Caching
- Cache model instances to avoid recreation
- Clear cache when configuration changes
- Use consistent cache keys

### 2. Request Batching
- Batch multiple requests when possible
- Use streaming for long responses
- Implement request cancellation

### 3. Memory Management
- Clean up large responses after processing
- Limit conversation history length
- Use pagination for large result sets

## Security Considerations

### 1. API Key Management
- Never expose API keys in frontend code
- Use environment variables securely
- Rotate keys regularly

### 2. Input Validation
- Validate all user inputs before sending to AI
- Implement content filtering
- Limit request sizes

### 3. Output Sanitization
- Sanitize AI responses before displaying
- Filter potentially harmful content
- Validate structured outputs

## Testing Strategies

### 1. Unit Testing
- Test provider configuration
- Mock AI responses for consistent tests
- Test error handling paths

### 2. Integration Testing
- Test with real API calls (limited)
- Test streaming responses
- Test cancellation scenarios

### 3. Performance Testing
- Measure response times
- Test with large inputs
- Monitor memory usage