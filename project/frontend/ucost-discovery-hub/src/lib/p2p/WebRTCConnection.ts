/**
 * UC Discovery Hub - WebRTC Connection Manager
 * Handles P2P communication across different networks (Browser Version)
 */

import { EncryptionManager } from './EncryptionManager';
import { PeerInfo, WebRTCMessage, ConnectionState } from './common';

// Simple browser-compatible EventEmitter
class EventEmitter {
    private events: { [key: string]: Function[] } = {};

    on(event: string, listener: Function): this {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(listener);
        return this;
    }

    emit(event: string, ...args: any[]): boolean {
        if (!this.events[event]) return false;
        this.events[event].forEach(listener => listener(...args));
        return true;
    }

    removeListener(event: string, listener: Function): this {
        if (!this.events[event]) return this;
        this.events[event] = this.events[event].filter(l => l !== listener);
        return this;
    }

    removeAllListeners(event?: string): this {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
        return this;
    }
}

export class WebRTCConnection extends EventEmitter {
    private peerConnections: Map<string, RTCPeerConnection> = new Map();
    private dataChannels: Map<string, RTCDataChannel> = new Map();
    private connectionStates: Map<string, ConnectionState> = new Map();
    private encryption: EncryptionManager;
    private pingIntervals: Map<string, any> = new Map(); // using any for timeout type compat

    constructor() {
        super();
        this.encryption = new EncryptionManager();
    }

    /**
     * Connect to a peer using WebRTC
     */
    async connectToPeer(peerInfo: PeerInfo): Promise<boolean> {
        try {
            console.log(`Attempting WebRTC connection to ${peerInfo.host}:${peerInfo.port}`);

            const peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            this.setupConnectionHandlers(peerConnection, peerInfo.id);

            const dataChannel = peerConnection.createDataChannel('sync', {
                ordered: true,
                maxRetransmits: 3
            });

            this.setupDataChannel(dataChannel, peerInfo.id);

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            this.peerConnections.set(peerInfo.id, peerConnection);
            this.connectionStates.set(peerInfo.id, {
                peerId: peerInfo.id,
                state: 'connecting'
            });

            // Send offer (Mock signaling)
            await this.sendOffer(peerInfo, offer);

            return true;
        } catch (error) {
            console.error(`Failed to connect to peer ${peerInfo.id}:`, error);
            this.connectionStates.set(peerInfo.id, {
                peerId: peerInfo.id,
                state: 'failed'
            });
            return false;
        }
    }

    private setupConnectionHandlers(peerConnection: RTCPeerConnection, peerId: string): void {
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendIceCandidate(peerId, event.candidate);
            }
        };

        peerConnection.oniceconnectionstatechange = () => {
            const state = peerConnection.iceConnectionState;
            // console.log(`ICE connection state for ${peerId}: ${state}`);

            const connectionState = this.connectionStates.get(peerId);
            if (connectionState) {
                if (state === 'connected' || state === 'completed') {
                    connectionState.state = 'connected';
                    this.startPingInterval(peerId);
                } else if (state === 'disconnected' || state === 'failed') {
                    connectionState.state = 'disconnected';
                    this.stopPingInterval(peerId);
                }
            }
        };

        peerConnection.ondatachannel = (event) => {
            this.setupDataChannel(event.channel, peerId);
        };
    }

    private setupDataChannel(dataChannel: RTCDataChannel, peerId: string): void {
        dataChannel.onopen = () => {
            console.log(`Data channel opened with ${peerId}`);
            this.connectionStates.set(peerId, {
                peerId,
                state: 'connected'
            });
            this.emit('peer-connected', peerId);
            this.startPingInterval(peerId);
        };

        dataChannel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(peerId, message);
            } catch (error) {
                console.error(`Failed to parse message from ${peerId}:`, error);
            }
        };

        dataChannel.onclose = () => {
            this.connectionStates.set(peerId, {
                peerId,
                state: 'disconnected'
            });
            this.emit('peer-disconnected', peerId);
            this.stopPingInterval(peerId);
            this.cleanupConnection(peerId);
        };

        this.dataChannels.set(peerId, dataChannel);
    }

    private handleMessage(peerId: string, message: WebRTCMessage): void {
        // console.log(`Received message from ${peerId}:`, message.type);

        switch (message.type) {
            case 'ping':
                this.handlePing(peerId, message);
                break;
            case 'pong':
                this.handlePong(peerId, message);
                break;
            default:
                // Pass other messages up
                break;
        }

        this.emit('message', peerId, message);
    }

    private handlePing(peerId: string, message: WebRTCMessage): void {
        this.sendToPeer(peerId, {
            type: 'pong',
            data: { timestamp: message.timestamp },
            timestamp: Date.now(),
            messageId: `msg_${Date.now()}`
        });
    }

    private handlePong(peerId: string, message: WebRTCMessage): void {
        const connectionState = this.connectionStates.get(peerId);
        if (connectionState) {
            connectionState.latency = Date.now() - message.data.timestamp;
            connectionState.lastPing = Date.now();
        }
    }

    sendToPeer(peerId: string, message: WebRTCMessage): boolean {
        const dataChannel = this.dataChannels.get(peerId);
        if (dataChannel && dataChannel.readyState === 'open') {
            try {
                // Simple serialization for MVP, real encryption integration usage
                const payload = JSON.stringify(message);
                // We could encrypt here: this.encryption.encryptMessage(payload, peerId);
                // But for WebRTC data channels, DTLS is already providing encryption in transit.
                // The additional encryption is for E2E application security if needed.
                dataChannel.send(payload);
                return true;
            } catch (error) {
                console.error(`Failed to send message to ${peerId}:`, error);
                return false;
            }
        }
        return false;
    }

    private startPingInterval(peerId: string): void {
        this.stopPingInterval(peerId); // Clear existing
        const interval = setInterval(() => {
            this.sendToPeer(peerId, {
                type: 'ping',
                data: { timestamp: Date.now() },
                timestamp: Date.now(),
                messageId: `ping_${Date.now()}`
            });
        }, 10000); // 10s ping

        this.pingIntervals.set(peerId, interval);
    }

    private stopPingInterval(peerId: string): void {
        const interval = this.pingIntervals.get(peerId);
        if (interval) {
            clearInterval(interval);
            this.pingIntervals.delete(peerId);
        }
    }

    private cleanupConnection(peerId: string): void {
        this.stopPingInterval(peerId);
        this.dataChannels.delete(peerId);
        this.peerConnections.delete(peerId);
        this.connectionStates.delete(peerId);
    }

    // --- STUBS for Signaling (Manual/Simulated) ---

    private async sendOffer(peerInfo: PeerInfo, offer: RTCSessionDescriptionInit): Promise<void> {
        // In a real app, send this via WebSocket/HTTP to signaling server.
        // For manual P2P, we might copy-paste this or send it to the known HTTP endpoint of peer.
        console.log(`[SIGNALING] Offer for ${peerInfo.id} created.`);
    }

    private sendIceCandidate(peerId: string, candidate: RTCIceCandidate): void {
        // Send via signaling channel
    }
}
