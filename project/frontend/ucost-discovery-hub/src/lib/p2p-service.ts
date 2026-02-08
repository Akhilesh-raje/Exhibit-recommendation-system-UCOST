/**
 * Simple P2P Manager for UCOST Discovery Hub
 * Easy-to-use peer-to-peer sync system
 * Integrated with WebRTC for real-time data sync
 */

import { WebRTCConnection } from './p2p/WebRTCConnection';
import { PeerInfo } from './p2p/common';

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

const generateId = () => Math.random().toString(36).substring(2, 10);

export interface SimpleDevice {
    id: string;
    name: string;
    ip: string;
    port: number;
    isConnected: boolean;
    lastSync?: string;
    capabilities: string[];
    isAuthorized: boolean;
    softwareVersion: string;
    deviceType: 'kiosk' | 'mobile' | 'desktop';
}

export class SimpleP2PManager extends EventEmitter {
    private devices: Map<string, SimpleDevice> = new Map();
    private isEnabled: boolean = false;
    private myIP: string = '';
    private myPort: number = 5000;
    private scanInterval?: any; // Browser/Node compatible
    private readonly SOFTWARE_ID = 'UCOST_DISCOVERY_HUB';
    private readonly SOFTWARE_VERSION = '1.0.0';
    private readonly DEVICE_ID = generateId();

    // WebRTC Integration
    private webrtc: WebRTCConnection;

    constructor() {
        super();
        this.getMyIP();
        this.webrtc = new WebRTCConnection();
        this.setupWebRTCListeners();
    }

    private setupWebRTCListeners() {
        this.webrtc.on('peer-connected', (peerId: string) => {
            console.log(`[P2P] WebRTC connected to ${peerId}`);
            // Find device and mark as fully connected
            // In a real app, peerId would map to deviceId. For this MVP, we might need a lookup.
            // For now, if we connect via IP, we are connected.
        });

        this.webrtc.on('message', (peerId: string, message: any) => {
            console.log(`[P2P] Message from ${peerId}:`, message);
            // Handle sync responses here
            if (message.type === 'sync-response') {
                this.emit('syncProgress', {
                    device: peerId, // Ideally map back to name
                    progress: 100
                });
            }
        });
    }

    /**
     * Verify if a device is running UCOST Discovery Hub software
     */
    private async verifyDevice(ip: string, port: number): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const response = await fetch(`http://${ip}:${port}/api/auth/verify-ucost`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-UCOST-Software-ID': this.SOFTWARE_ID,
                    'X-UCOST-Version': this.SOFTWARE_VERSION,
                    'X-UCOST-Device-ID': this.DEVICE_ID
                },
                body: JSON.stringify({
                    softwareId: this.SOFTWARE_ID,
                    version: this.SOFTWARE_VERSION,
                    deviceId: this.DEVICE_ID,
                    capabilities: ['exhibits', 'tours', 'analytics']
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                return data.isAuthorized === true;
            }
        } catch (error) {
            // console.log(`Device ${ip}:${port} unreachable`);
        }
        return false;
    }

    /**
     * Enable P2P sync
     */
    enable(): void {
        if (this.isEnabled) return;
        this.isEnabled = true;
        this.startScanning();
        this.emit('statusChanged', { enabled: true });
    }

    /**
     * Disable P2P sync
     */
    disable(): void {
        if (!this.isEnabled) return;
        this.isEnabled = false;
        this.stopScanning();
        this.disconnectAll();
        this.emit('statusChanged', { enabled: false });
    }

    /**
     * Start scanning for authorized devices only
     */
    startScanning(): void {
        if (!this.isEnabled) return;

        // Manual/Simulated Discovery Loop
        if (this.scanInterval) clearInterval(this.scanInterval);

        this.scanInterval = setInterval(async () => {
            if (this.isEnabled) {
                this.emit('scanning', { timestamp: Date.now() });

                // Scan locally known IPs (for demo/dev)
                const potentialIPs = ['127.0.0.1'];

                for (const ip of potentialIPs) {
                    // Don't auto-add localhost in product unless requested, 
                    // but for dev verified it acts as a "found" device.
                    // In real scenario, use mDNS results here.
                }

                // Verify connectivity of existing devices
                const devices = this.getDevices();
                for (const device of devices) {
                    const isStillAuthorized = await this.verifyDevice(device.ip, device.port);
                    if (!isStillAuthorized && device.isConnected) {
                        device.isConnected = false;
                        this.webrtc.disconnectPeer(device.id); // Valid cleanup
                        this.emit('deviceDisconnected', device);
                    }
                }
            }
        }, 15000);
    }

    /**
     * Stop scanning
     */
    stopScanning(): void {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = undefined;
        }
    }

    /**
     * Connect to an authorized device
     */
    async connectToDevice(deviceId: string): Promise<boolean> {
        const device = this.devices.get(deviceId);
        if (!device || !device.isAuthorized) {
            return false;
        }

        const isStillAuthorized = await this.verifyDevice(device.ip, device.port);
        if (!isStillAuthorized) {
            this.removeDevice(device.id);
            this.emit('deviceRemoved', device);
            return false;
        }

        // Establish WebRTC Connection
        const peerInfo: PeerInfo = {
            id: device.id,
            host: device.ip,
            port: device.port,
            type: 'manual', // or derive from device
            lastSeen: Date.now()
        };

        const rtcSuccess = await this.webrtc.connectToPeer(peerInfo);

        if (rtcSuccess) {
            device.isConnected = true;
            this.emit('deviceConnected', device);
            return true;
        } else {
            return false;
        }
    }

    /**
     * Disconnect from a device
     */
    disconnectFromDevice(deviceId: string): boolean {
        const device = this.devices.get(deviceId);
        if (!device) return false;

        device.isConnected = false;
        this.webrtc.disconnectPeer(deviceId);
        this.emit('deviceDisconnected', device);
        return true;
    }

    /**
     * Sync with all connected authorized devices
     */
    async syncAllDevices(): Promise<void> {
        const connectedDevices = this.getConnectedAuthorizedDevices();

        if (connectedDevices.length === 0) {
            this.emit('syncComplete', {
                success: false,
                message: 'No authorized devices connected'
            });
            return;
        }

        this.emit('syncStarted', { deviceCount: connectedDevices.length });

        // Trigger Sync via WebRTC for each device
        const promises = connectedDevices.map(async (device, index) => {
            this.emit('syncProgress', {
                device: device.name,
                progress: 10
            });

            // Send Sync Request
            const success = this.webrtc.requestSync(device.id, ['exhibits', 'tours']);

            if (success) {
                // In real logic, we wait for 'sync-response' event
                // For UI feedback now, we simulate completion after request sent
                await new Promise(r => setTimeout(r, 500));
                device.lastSync = new Date().toLocaleTimeString();
                this.emit('syncProgress', {
                    device: device.name,
                    progress: 100
                });
            }
        });

        await Promise.all(promises);

        this.emit('syncComplete', {
            success: true,
            deviceCount: connectedDevices.length
        });
    }

    /**
     * Add a device manually
     */
    async addManualDevice(ip: string, name?: string): Promise<SimpleDevice | null> {
        const isAuthorized = await this.verifyDevice(ip, 5000);

        if (!isAuthorized) {
            this.emit('deviceRejected', {
                ip,
                reason: 'Device unreachable or not running UCOST software'
            });
            return null;
        }

        const device: SimpleDevice = {
            id: `manual-${Date.now()}`,
            name: name || `Manual Device - ${ip}`,
            ip,
            port: 5000,
            isConnected: false,
            capabilities: ['exhibits', 'tours'],
            isAuthorized: true,
            softwareVersion: this.SOFTWARE_VERSION,
            deviceType: 'desktop'
        };

        this.addDevice(device);

        // Auto-connect
        this.connectToDevice(device.id);

        return device;
    }

    private getMyIP(): void {
        this.myIP = '127.0.0.1';
    }

    private addDevice(device: SimpleDevice): void {
        if (!this.devices.has(device.id)) {
            this.devices.set(device.id, device);
            this.emit('deviceAdded', device);
        }
    }

    private removeDevice(deviceId: string): void {
        const device = this.devices.get(deviceId);
        if (device) {
            this.devices.delete(deviceId);
            this.emit('deviceRemoved', device);
        }
    }

    getDevices(): SimpleDevice[] {
        return Array.from(this.devices.values());
    }

    getAuthorizedDevices(): SimpleDevice[] {
        return this.getDevices().filter(d => d.isAuthorized);
    }

    getConnectedAuthorizedDevices(): SimpleDevice[] {
        return this.getAuthorizedDevices().filter(d => d.isConnected);
    }

    isEnabledStatus(): boolean {
        return this.isEnabled;
    }

    disconnectAll(): void {
        this.devices.forEach(device => {
            device.isConnected = false;
        });
        this.webrtc.disconnectAll();
        this.emit('allDevicesDisconnected');
    }
}

export const p2pManager = new SimpleP2PManager();
