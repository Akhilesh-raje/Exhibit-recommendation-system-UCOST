import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Upload, 
  Database, 
  FileSpreadsheet, 
  Archive, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  HardDrive,
  Calendar,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BackupStats {
  totalBackups: number;
  totalSize: string;
  lastBackup: string | null;
  backupList: Array<{
    name: string;
    size: string;
    date: string;
    type: 'directory' | 'compressed';
  }>;
}

interface StorageStats {
  backup: string;
  uploads: string;
  total: string;
}

interface ExportStats {
  backup: BackupStats;
  storage: StorageStats;
  lastExport: string;
}

export default function DataExportPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [exportStats, setExportStats] = useState<ExportStats | null>(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadExportStats();
  }, []);

  const loadExportStats = async () => {
    try {
      const response = await fetch('/api/export/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setExportStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load export stats:', error);
    }
  };

  const downloadExcelSheet = async (includeAnalytics: boolean = true, format: 'xlsx' | 'csv' = 'xlsx') => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/export/excel?includeAnalytics=${includeAnalytics}&format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ucost_exhibits_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Excel Sheet Downloaded!",
          description: `Exhibit data sheet has been downloaded successfully in ${format.toUpperCase()} format.`,
        });
      } else {
        throw new Error('Failed to download Excel sheet');
      }
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download Excel sheet",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createBackup = async (includeImages: boolean = true, includeAnalytics: boolean = true) => {
    try {
      setIsCreatingBackup(true);
      setBackupProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/export/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          includeImages,
          includeAnalytics,
          compress: true
        })
      });

      clearInterval(progressInterval);
      setBackupProgress(100);

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Backup Created!",
          description: `Backup created successfully: ${data.backupPath}`,
        });
        
        // Reload stats
        setTimeout(() => {
          loadExportStats();
          setBackupProgress(0);
        }, 1000);
      } else {
        throw new Error('Failed to create backup');
      }
    } catch (error: any) {
      toast({
        title: "Backup Failed",
        description: error.message || "Failed to create backup",
        variant: "destructive"
      });
      setBackupProgress(0);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const downloadBackup = async (filename: string) => {
    try {
      const response = await fetch(`/api/export/backup/${filename}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Backup Downloaded!",
          description: `Backup file has been downloaded successfully.`,
        });
      } else {
        throw new Error('Failed to download backup');
      }
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download backup",
        variant: "destructive"
      });
    }
  };

  const deleteBackup = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete backup: ${filename}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/export/backup/${filename}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: "Backup Deleted!",
          description: `Backup file has been deleted successfully.`,
        });
        loadExportStats();
      } else {
        throw new Error('Failed to delete backup');
      }
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete backup",
        variant: "destructive"
      });
    }
  };

  const cleanupOldBackups = async () => {
    try {
      const response = await fetch('/api/export/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ keepDays: 30 })
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Cleanup Completed!",
          description: `${data.deletedCount} old backups have been cleaned up.`,
        });
        loadExportStats();
      } else {
        throw new Error('Failed to cleanup old backups');
      }
    } catch (error: any) {
      toast({
        title: "Cleanup Failed",
        description: error.message || "Failed to cleanup old backups",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Data Export & Backup</h2>
        <Button onClick={loadExportStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Excel Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel Data Sheet Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate comprehensive Excel data sheets for all exhibits with detailed information.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => downloadExcelSheet(true, 'xlsx')}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Excel (.xlsx)
            </Button>
            
            <Button 
              onClick={() => downloadExcelSheet(true, 'csv')}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
            
            <Button 
              onClick={() => downloadExcelSheet(false, 'xlsx')}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Basic Excel (No Analytics)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Data Backup & Recovery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create comprehensive backups of all exhibit data, images, and analytics.
          </p>

          {isCreatingBackup && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Creating backup...</span>
                <span>{backupProgress}%</span>
              </div>
              <Progress value={backupProgress} className="w-full" />
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => createBackup(true, true)}
              disabled={isCreatingBackup}
              className="flex items-center gap-2"
            >
              <Archive className="h-4 w-4" />
              Full Backup (Images + Analytics)
            </Button>
            
            <Button 
              onClick={() => createBackup(false, true)}
              disabled={isCreatingBackup}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Archive className="h-4 w-4" />
              Data Only Backup
            </Button>
            
            <Button 
              onClick={cleanupOldBackups}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Cleanup Old Backups
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Section */}
      {exportStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {exportStats.backup.totalBackups}
                </div>
                <div className="text-sm text-muted-foreground">Total Backups</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {exportStats.storage.total}
                </div>
                <div className="text-sm text-muted-foreground">Total Storage</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {exportStats.backup.totalSize}
                </div>
                <div className="text-sm text-muted-foreground">Backup Size</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-semibold">Storage Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Backups:</span>
                  <Badge variant="secondary">{exportStats.storage.backup}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Uploads:</span>
                  <Badge variant="secondary">{exportStats.storage.uploads}</Badge>
                </div>
              </div>
            </div>

            {exportStats.backup.lastBackup && (
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Last Backup:</span>
                  <Badge variant="outline">
                    {formatDate(exportStats.backup.lastBackup)}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Backup List */}
      {exportStats && exportStats.backup.backupList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Available Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exportStats.backup.backupList.map((backup, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={backup.type === 'compressed' ? 'default' : 'secondary'}>
                        {backup.type === 'compressed' ? 'ZIP' : 'DIR'}
                      </Badge>
                      <span className="font-mono text-sm">{backup.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {backup.size} • {formatDate(backup.date)}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => downloadBackup(backup.name)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => deleteBackup(backup.name)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 