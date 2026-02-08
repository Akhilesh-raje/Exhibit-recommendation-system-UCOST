export interface PeerInfo {
    id: string;
    host: string;
    port: number;
    type: 'lan' | 'internet' | 'manual';
    lastSeen: number;
    capabilities?: string[];
    publicKey?: string;
    isServer?: boolean;
}

export interface WebRTCMessage {
    type: 'file-update' | 'ai-report' | 'sync-request' | 'sync-response' | 'ping' | 'pong';
    data: any;
    timestamp: number;
    messageId: string;
}

export interface ConnectionState {
    peerId: string;
    state: 'connecting' | 'connected' | 'disconnected' | 'failed';
    lastPing?: number;
    latency?: number;
}
