# Knowlex Backend API Documentation

This document outlines the implemented backend APIs for the Knowlex Desktop App. Communication between the frontend (React) and backend (Electron main process) is handled via Electron's IPC (Inter-Process Communication).

All communication follows a standard message format defined in `packages/types/src/ipc.types.ts`.

---

## 1. System Handlers

These handlers provide basic system-level information.

### Get System Info

-   **Channel:** `system:get-info@v1.0.0`
-   **Description:** Retrieves version information for the operating system, Node.js, and Electron.
-   **Request Payload:** `void`
-   **Success Response Payload:**
    ```typescript
    {
      platform: string;        // e.g., 'darwin', 'win32'
      arch: string;            // e.g., 'x64', 'arm64'
      version: string;         // Node.js version
      electronVersion: string;
      nodeVersion: string;
      chromeVersion: string;
    }
    ```

---

## 2. OpenAI Test Handlers

These handlers are used to verify the connection and basic interaction with the OpenAI API.

### Test OpenAI Connection

-   **Channel:** `openai:test-connection`
-   **Description:** Temporarily configures the OpenAI service with the provided credentials and tests the connection.
-   **Request Payload:**
    ```typescript
    {
      apiKey: string;
      baseUrl: string;
      model: string;
    }
    ```
-   **Success Response Payload:**
    ```typescript
    {
      success: boolean; // true if connection is successful
      message: string;  // e.g., "Connection successful"
      data?: any;       // Additional data from the API test
    }
    ```

### Send Simple Message (OpenAI)

-   **Channel:** `openai:send-message`
-   **Description:** Sends a single user message to the OpenAI API using a temporary configuration and returns the complete response. This is a non-streaming endpoint.
-   **Request Payload:**
    ```typescript
    {
      message: string; // The user's message
      apiKey: string;
      baseUrl: string;
      model: string;
    }
    ```
-   **Success Response Payload:**
    ```typescript
    {
      // The response from the OpenAI service wrapper
      // Typically contains the AI's reply
    }
    ```

---

## 3. Development Test Handlers

These handlers are available only in development mode (`IS_DEV=true`) and are used for debugging and testing the IPC framework itself.

### Echo Test

-   **Channel:** `test:echo@v1.0.0`
-   **Description:** Receives any data and returns it, confirming the round-trip communication.
-   **Request Payload:** `any`
-   **Success Response Payload:**
    ```typescript
    {
      echo: any; // The original data sent in the request
      timestamp: number;
      message: "Echo test successful";
    }
    ```

### Ping Test

-   **Channel:** `test:ping@v1.0.0`
-   **Description:** A simple health check that returns "pong" and timing information.
-   **Request Payload:** `void`
-   **Success Response Payload:**
    ```typescript
    {
      pong: true;
      requestTime: number;
      responseTime: number;
      processingTime: number; // Time taken on the backend
    }
    ```

### Error Test

-   **Channel:** `test:error@v1.0.0`
-   **Description:** Intentionally triggers a backend error to test frontend error handling.
-   **Request Payload:**
    ```typescript
    {
      errorType?: 'generic' | 'validation' | 'timeout' | 'network';
    }
    ```
-   **Response:** An `IPCResponse` with `success: false` and an `error` object.

### Validation Test

-   **Channel:** `test:validation@v1.0.0`
-   **Description:** Tests the backend's data validation logic.
-   **Request Payload:**
    ```typescript
    {
      testField: any; // Must be present. Fails if the value is "invalid".
    }
    ```
-   **Success Response Payload:**
    ```typescript
    {
      message: "Validation test passed";
      validatedData: {
        testField: any;
      };
    }
    ```

### Stream Test

-   **Channel:** `test:stream@v1.0.0`
-   **Description:** Initiates a test stream from the backend to the frontend.
-   **Request Payload:**
    ```typescript
    {
      sessionId?: string; // Optional ID for the stream
      count?: number;     // Number of chunks to send (default: 10)
      delay?: number;     // Delay between chunks in ms (default: 100)
    }
    ```
-   **Initial Response:** An immediate response confirming the stream has started.
-   **Subsequent Data:** A series of stream chunks sent to the frontend over time.
