/**
 * IPC Connectivity Test
 * 
 * Tests the connection between TypeScript client and Rust server
 */

const { EventEmitter } = require('events');
const net = require('net');
const path = require('path');
const os = require('os');

// Simple logger for testing
class TestLogger {
    info(message, ...args) {
        console.log(`[INFO] ${message}`, ...args);
    }
    
    warn(message, ...args) {
        console.warn(`[WARN] ${message}`, ...args);
    }
    
    error(message, ...args) {
        console.error(`[ERROR] ${message}`, ...args);
    }
    
    debug(message, ...args) {
        console.debug(`[DEBUG] ${message}`, ...args);
    }
}

// Test IPC Client (simplified version for testing)
class TestIPCClient extends EventEmitter {
    constructor(socketName, logger) {
        super();
        this.socketPath = this.getSocketPath(socketName);
        this.logger = logger;
        this.client = null;
        this.connected = false;
        this.messageBuffer = Buffer.alloc(0);
        this.messageIdCounter = 0;
    }

    getSocketPath(socketName) {
        const platform = os.platform();
        if (platform === 'win32') {
            return `\\\\.\\pipe\\${socketName}`;
        } else {
            const tmpDir = os.tmpdir();
            return path.join(tmpDir, `${socketName}.sock`);
        }
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.client = net.connect(this.socketPath, () => {
                this.logger.info(`Connected to: ${this.socketPath}`);
                this.connected = true;
                this.emit('connected');
                resolve();
            });

            this.client.on('data', (data) => {
                this.messageBuffer = Buffer.concat([this.messageBuffer, data]);
                this.processMessageBuffer();
            });

            this.client.on('close', () => {
                this.connected = false;
                this.emit('disconnected');
            });

            this.client.on('error', (error) => {
                this.logger.error('Connection error:', error.message);
                reject(error);
            });
        });
    }

    processMessageBuffer() {
        while (this.messageBuffer.length >= 8) {
            const lengthStr = this.messageBuffer.toString('utf8', 0, 8);
            const messageLength = parseInt(lengthStr, 16);
            
            if (isNaN(messageLength) || messageLength > 1024 * 1024) {
                this.logger.error('Invalid message length:', lengthStr);
                this.messageBuffer = Buffer.alloc(0);
                return;
            }

            const totalLength = 8 + messageLength;
            if (this.messageBuffer.length < totalLength) {
                break;
            }

            const messageData = this.messageBuffer.slice(8, totalLength);
            try {
                const message = JSON.parse(messageData.toString('utf8'));
                this.handleMessage(message);
            } catch (error) {
                this.logger.error('Failed to parse message:', error.message);
            }

            this.messageBuffer = this.messageBuffer.slice(totalLength);
        }
    }

    handleMessage(message) {
        this.logger.info(`Received message: ${message.type}`);
        this.emit('message', message);
        
        switch (message.type) {
            case 'Ping':
                this.sendPong(message.timestamp);
                break;
            case 'VersionCheck':
                this.sendVersionResponse(message.version);
                break;
            case 'Connected':
                this.logger.info('Connection confirmed by server');
                break;
        }
    }

    send(message) {
        if (!this.connected || !this.client) {
            this.logger.error('Not connected');
            return false;
        }

        try {
            const jsonString = JSON.stringify(message);
            const messageBuffer = Buffer.from(jsonString, 'utf8');
            const lengthHex = messageBuffer.length.toString(16).padStart(8, '0');
            const lengthBuffer = Buffer.from(lengthHex, 'utf8');
            
            this.client.write(lengthBuffer);
            this.client.write(messageBuffer);
            
            this.logger.debug(`Sent: ${message.type} (${messageBuffer.length} bytes)`);
            return true;
        } catch (error) {
            this.logger.error('Failed to send message:', error.message);
            return false;
        }
    }

    sendPing() {
        const ping = {
            type: 'Ping',
            timestamp: Date.now()
        };
        return this.send(ping);
    }

    sendPong(timestamp) {
        const pong = {
            type: 'Pong',
            timestamp: timestamp
        };
        return this.send(pong);
    }

    sendVersionCheck() {
        const versionCheck = {
            type: 'VersionCheck',
            version: 1
        };
        return this.send(versionCheck);
    }

    sendVersionResponse(version) {
        const versionResponse = {
            type: 'VersionResponse',
            version: 1,
            compatible: version === 1
        };
        return this.send(versionResponse);
    }

    sendRequest(requestType, payload, token = '') {
        const requestId = (++this.messageIdCounter).toString();
        const request = {
            type: 'Request',
            id: requestId,
            request_type: requestType,
            payload: payload,
            token: token
        };
        return this.send(request);
    }

    async close() {
        if (this.client) {
            this.client.destroy();
            this.client = null;
        }
        this.connected = false;
    }
}

// Test function
async function runTest() {
    const logger = new TestLogger();
    const client = new TestIPCClient('narraleaf-ipc', logger);

    logger.info('Starting IPC connectivity test...');

    // Set up event listeners
    client.on('connected', () => {
        logger.info('✅ Connected to Rust server');
        
        // Send initial messages
        setTimeout(() => {
            logger.info('Sending ping...');
            client.sendPing();
        }, 100);

        setTimeout(() => {
            logger.info('Sending version check...');
            client.sendVersionCheck();
        }, 200);

        setTimeout(() => {
            logger.info('Sending test request...');
            client.sendRequest('test_action', { message: 'Hello from JavaScript!' }, 'test_token');
        }, 300);
    });

    client.on('disconnected', () => {
        logger.info('❌ Disconnected from server');
    });

    client.on('message', (message) => {
        logger.info(`📨 Message received: ${JSON.stringify(message, null, 2)}`);
    });

    try {
        // Try to connect
        logger.info('Attempting to connect...');
        await client.connect();
        
        // Keep connection alive for testing
        logger.info('Connection established. Keeping alive for 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
    } catch (error) {
        logger.error('❌ Connection failed:', error.message);
        logger.error('Make sure the Rust server is running!');
        process.exit(1);
    } finally {
        logger.info('Closing connection...');
        await client.close();
        logger.info('Test completed.');
    }
}

// Run the test
if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = { TestIPCClient, TestLogger };

