/*!
 * Message Handler
 *
 * Handles incoming message processing, parsing, and routing
 * for different types of IPC messages.
 */

import { EventEmitter } from 'events';
import { Logger } from '@/service/utils/logger';
import { MessageHandler, ServiceRequestMessage, ServiceResponseMessage, RuntimeRequestMessage, RuntimeResponseMessage, SidecarMessage, MAX_MESSAGE_SIZE } from '../types';
import { IPCEvents } from './types';

/**
 * Message Handler Manager
 *
 * Manages message parsing, routing, and handler execution
 */
export class MessageHandlerManager {
    private messageHandlers: Map<string, MessageHandler> = new Map();
    private messageBuffer: Buffer = Buffer.alloc(0);
    private pendingRequests: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();
    private eventListeners: Map<string, Set<Function>> = new Map();
    private logger: Logger;
    private eventEmitter: EventEmitter;

    constructor(logger: Logger, eventEmitter: EventEmitter) {
        this.logger = logger;
        this.eventEmitter = eventEmitter;
        this.setupDefaultHandlers();
    }

    /**
     * Register a custom message handler for specific request types
     */
    public registerHandler<T extends string = any>(requestType: T, handler: MessageHandler): void {
        if (this.messageHandlers.has(requestType)) {
            this.logger.warn(`Handler for ${requestType} already registered`);
        }

        this.messageHandlers.set(requestType, handler);
        this.logger.debug(`Registered handler for: ${requestType}`);
    }

    /**
     * Unregister a message handler
     */
    public unregisterHandler(requestType: string): boolean {
        const removed = this.messageHandlers.delete(requestType);
        if (removed) {
            this.logger.debug(`Unregistered handler for: ${requestType}`);
        }
        return removed;
    }

    /**
     * Add event listener with type safety
     */
    public addEventListener<K extends keyof IPCEvents>(event: K, listener: IPCEvents[K]): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(listener);
        this.eventEmitter.on(event, listener);
    }

    /**
     * Remove event listener
     */
    public removeEventListener<K extends keyof IPCEvents>(event: K, listener: IPCEvents[K]): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(listener);
            this.eventEmitter.off(event, listener);
        }
    }

    /**
     * Process incoming data buffer
     */
    public processData(data: Buffer): void {
        this.logger.debug(`[App] Received data buffer: ${data.length} bytes`);
        
        // Add incoming data to buffer
        this.messageBuffer = Buffer.concat([this.messageBuffer, data]);
        
        // Process complete messages
        this.processMessageBuffer();
    }

    /**
     * Process message buffer with length prefix protocol
     */
    private processMessageBuffer(): void {
        while (this.messageBuffer.length >= 8) {
            // Read message length (8 hex chars)
            const lengthStr = this.messageBuffer.toString('utf8', 0, 8);
            const messageLength = parseInt(lengthStr, 16);
            
            if (isNaN(messageLength) || messageLength > MAX_MESSAGE_SIZE) {
                this.logger.error('Invalid message length:' + lengthStr);
                this.messageBuffer = Buffer.alloc(0);
                return;
            }

            const totalLength = 8 + messageLength;
            if (this.messageBuffer.length < totalLength) {
                break; // Incomplete message
            }

            // Extract and parse message
            const messageData = this.messageBuffer.slice(8, totalLength);
            try {
                const message = JSON.parse(messageData.toString('utf8')) as SidecarMessage;
                this.logger.debug(`[App] Parsed message: ${message.type}, ID: ${(message as any).id || 'N/A'}`);
                this.handleIncomingMessage(message);
            } catch (error) {
                this.logger.error('Failed to parse message:' + (error as Error).message);
            }

            // Remove processed message
            this.messageBuffer = Buffer.alloc(0);
        }
    }

    /**
     * Handle incoming message with enhanced routing
     */
    private async handleIncomingMessage(message: SidecarMessage): Promise<void> {
        this.logger.debug(`[App] Received message: ${message.type}`);
        
        // Emit general message event
        this.eventEmitter.emit('message', message);

        // Handle specific message types
        switch (message.type) {
            case 'ServiceRequest':
                this.eventEmitter.emit('serviceRequest', message);
                await this.handleServiceRequest(message as ServiceRequestMessage);
                break;
            case 'RuntimeResponse':
                this.logger.debug(`[App] Processing RuntimeResponse message: ${JSON.stringify(message)}`);
                this.eventEmitter.emit('runtimeResponse', message);
                await this.handleRuntimeResponse(message as RuntimeResponseMessage);
                break;
            case 'VersionResponse':
                this.eventEmitter.emit('versionResponse', message);
                break;
            case 'VersionCheck':
                await this.handleVersionCheck(message);
                break;
            default:
                this.logger.error('Unhandled message type:' + (message as any).type + ' ' + JSON.stringify(message));
        }
    }

    /**
     * Handle incoming service request messages
     */
    private async handleServiceRequest(request: ServiceRequestMessage): Promise<void> {
        const handler = this.messageHandlers.get(request.request_type);
        if (handler) {
            try {
                const response = await handler.handleMessage(request);
                if (response) {
                    // Send response back through the connection
                    this.eventEmitter.emit('sendMessage', response);
                }
            } catch (error) {
                this.logger.error(`Handler error for ${request.request_type}:` + (error as Error).message);
                // Send error response
                const errorResponse: ServiceResponseMessage<never> = {
                    type: 'ServiceResponse',
                    id: request.id,
                    success: false as false,
                    error: (error as Error).message
                };
                this.eventEmitter.emit('sendMessage', errorResponse);
            }
        } else {
            const errorResponse: ServiceResponseMessage<never> = {
                type: 'ServiceResponse',
                id: request.id,
                success: false as false,
                error: `No handler registered for service request type: ${request.request_type}`
            };
            this.eventEmitter.emit('sendMessage', errorResponse);

            this.logger.error(`No handler registered for service request type: ${request.request_type}`);
        }
    }

    /**
     * Handle incoming runtime response messages
     */
    private async handleRuntimeResponse(response: RuntimeResponseMessage): Promise<void> {
        this.logger.debug(`[App] Received runtime response: ${response.id}, success: ${response.success}`);
        
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
            this.logger.debug(`[App] Found pending request for ID: ${response.id}`);
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(response.id);
            
            if (response.success) {
                this.logger.debug(`[App] Resolving request ${response.id} with success`);
                pending.resolve(response);
            } else {
                const errorMessage = 'error' in response ? response.error : 'Runtime request failed';
                this.logger.debug(`[App] Rejecting request ${response.id} with error: ${errorMessage}`);
                pending.reject(new Error(errorMessage));
            }
        } else {
            this.logger.warn(`[App] No pending request found for runtime response ID: ${response.id}`);
            this.logger.debug(`[App] Available pending request IDs: ${Array.from(this.pendingRequests.keys()).join(', ')}`);
        }
    }

    /**
     * Handle version check messages
     */
    private async handleVersionCheck(message: any): Promise<void> {
        const { IPC_PROTOCOL_VERSION } = await import('../../constants');
        const versionResponse = {
            type: 'VersionResponse',
            version: IPC_PROTOCOL_VERSION,
            compatible: message.version === IPC_PROTOCOL_VERSION
        };
        this.eventEmitter.emit('sendMessage', versionResponse);
    }

    /**
     * Add pending request
     */
    public addPendingRequest(id: string, request: { resolve: Function; reject: Function; timeout: NodeJS.Timeout }): void {
        this.pendingRequests.set(id, request);
    }

    /**
     * Remove pending request
     */
    public removePendingRequest(id: string): void {
        this.pendingRequests.delete(id);
    }

    /**
     * Clear all pending requests
     */
    public clearPendingRequests(): void {
        this.pendingRequests.forEach(({ reject, timeout }) => {
            clearTimeout(timeout);
            reject(new Error('Connection closed'));
        });
        this.pendingRequests.clear();
    }

    /**
     * Get pending request count
     */
    public getPendingRequestCount(): number {
        return this.pendingRequests.size;
    }

    /**
     * Get registered handler count
     */
    public getRegisteredHandlerCount(): number {
        return this.messageHandlers.size;
    }

    /**
     * Setup default message handlers
     */
    private setupDefaultHandlers(): void {
        // Register default handlers for common request types
        this.registerHandler("sidecar:ping", {
            handleMessage: async (message) => {
                return {
                    type: 'ServiceResponse',
                    id: (message as ServiceRequestMessage).id,
                    success: true,
                    data: Date.now()
                } as ServiceResponseMessage;
            }
        });
    }
}
