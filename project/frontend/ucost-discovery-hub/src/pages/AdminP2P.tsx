import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wifi, WifiOff, UploadCloud, RefreshCw, Monitor, Smartphone, Tablet } from 'lucide-react';
import { p2pManager, SimpleDevice } from '@/lib/p2p-service';

export default function AdminP2P() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [devices, setDevices] = useState<SimpleDevice[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [manualIp, setManualIp] = useState('');
    const [syncStatus, setSyncStatus] = useState<string>('');
    const [syncProgress, setSyncProgress] = useState(0);

    useEffect(() => {
        // Initial state
        setIsEnabled(p2pManager.isEnabledStatus());
        setDevices(p2pManager.getDevices());

        // Event listeners
        const handleStatusChanged = ({ enabled }: { enabled: boolean }) => {
            setIsEnabled(enabled);
            if (enabled) setIsScanning(true);
            else setIsScanning(false);
        };

        const handleDevicesFound = (foundDevices: SimpleDevice[]) => {
            setDevices(foundDevices);
            setIsScanning(false);
        };

        const handleDeviceAdded = () => setDevices([...p2pManager.getDevices()]);
        const handleDeviceRemoved = () => setDevices([...p2pManager.getDevices()]);

        const handleSyncStarted = () => {
            setSyncStatus('Syncing...');
            setSyncProgress(0);
        };

        const handleSyncProgress = ({ progress }: { progress: number }) => {
            setSyncProgress(progress);
        };

        const handleSyncComplete = ({ success, message }: { success: boolean, message?: string }) => {
            setSyncStatus(success ? 'Sync Complete!' : `Failed: ${message}`);
            setSyncProgress(success ? 100 : 0);
            setTimeout(() => setSyncStatus(''), 3000);
        };

        p2pManager.on('statusChanged', handleStatusChanged);
        p2pManager.on('devicesFound', handleDevicesFound);
        p2pManager.on('deviceAdded', handleDeviceAdded);
        p2pManager.on('deviceRemoved', handleDeviceRemoved);
        p2pManager.on('syncStarted', handleSyncStarted);
        p2pManager.on('syncProgress', handleSyncProgress);
        p2pManager.on('syncComplete', handleSyncComplete);

        return () => {
            p2pManager.removeAllListeners();
        };
    }, []);

    const toggleP2P = () => {
        if (isEnabled) {
            p2pManager.disable();
        } else {
            p2pManager.enable();
            setIsScanning(true);
        }
    };

    const handleManualAdd = async () => {
        if (!manualIp) return;
        setIsScanning(true);
        const device = await p2pManager.addManualDevice(manualIp);
        setIsScanning(false);
        if (!device) {
            alert('Could not verify device at ' + manualIp);
        } else {
            setManualIp('');
        }
    };

    const startSync = async () => {
        await p2pManager.syncAllDevices();
    };

    const getDeviceIcon = (type: string) => {
        switch (type) {
            case 'mobile': return <Smartphone className="h-5 w-5" />;
            case 'kiosk': return <Monitor className="h-5 w-5" />;
            default: return <Tablet className="h-5 w-5" />;
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">P2P Network Sync</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage peer-to-peer synchronization with local UCOST devices.
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-card border px-4 py-2 rounded-lg shadow-sm">
                    <div className={`h-3 w-3 rounded-full ${isEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="font-medium">{isEnabled ? 'P2P Active' : 'P2P Offline'}</span>
                    <Button
                        variant={isEnabled ? "destructive" : "default"}
                        onClick={toggleP2P}
                        size="sm"
                    >
                        {isEnabled ? 'Disable' : 'Enable System'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Connection Panel */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Connected Devices
                            {isScanning && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </CardTitle>
                        <CardDescription>
                            Authorized devices discovered on the local network (Port 5000)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {devices.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                                <WifiOff className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                <h3 className="font-semibold text-lg">No Devices Found</h3>
                                <p className="text-muted-foreground">Enable P2P to scan for devices or add manually.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {devices.map(device => (
                                    <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-primary/10 rounded-full text-primary">
                                                {getDeviceIcon(device.deviceType)}
                                            </div>
                                            <div>
                                                <h4 className="font-medium">{device.name}</h4>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{device.ip}</span>
                                                    <span>•</span>
                                                    <span className={device.isConnected ? "text-green-500" : "text-yellow-500"}>
                                                        {device.isConnected ? 'Connected' : 'Pending'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {device.isConnected && (
                                            <Badge variant="secondary" className="text-xs">
                                                v{device.softwareVersion}
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Action Panel */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Manual Connection</CardTitle>
                            <CardDescription>Add a device by IP address</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="192.168.1.XXX"
                                    value={manualIp}
                                    onChange={(e) => setManualIp(e.target.value)}
                                    disabled={!isEnabled}
                                />
                                <Button onClick={handleManualAdd} disabled={!isEnabled || isScanning}>
                                    Add
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={isEnabled ? "border-primary/50 bg-primary/5" : "opacity-50"}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UploadCloud className="h-5 w-5" />
                                Sync Operations
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button
                                className="w-full"
                                size="lg"
                                onClick={startSync}
                                disabled={!isEnabled || devices.length === 0 || !!syncStatus}
                            >
                                {syncStatus || 'Sync All Data Now'}
                            </Button>

                            {syncProgress > 0 && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span>Progress</span>
                                        <span>{Math.round(syncProgress)}%</span>
                                    </div>
                                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-300"
                                            style={{ width: `${syncProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
