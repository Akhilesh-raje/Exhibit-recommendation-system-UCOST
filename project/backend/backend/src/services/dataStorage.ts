import { PrismaClient, Exhibit } from '@prisma/client';
import { ExcelExportService, ExcelExportOptions } from './excelExport';
import path from 'path';
import fs from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import archiver from 'archiver';

export interface DataBackupOptions {
  includeImages?: boolean;
  includeAnalytics?: boolean;
  backupPath?: string;
  compress?: boolean;
}

export interface DataImportOptions {
  validateData?: boolean;
  updateExisting?: boolean;
  createBackup?: boolean;
}

export class DataStorageService {
  private prisma: PrismaClient;
  private excelService: ExcelExportService;
  private backupDir: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.excelService = new ExcelExportService();
    this.backupDir = path.join(process.cwd(), 'backups');
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create comprehensive data backup
   */
  async createDataBackup(options: DataBackupOptions = {}): Promise<string> {
    const {
      includeImages = true,
      includeAnalytics = true,
      backupPath,
      compress = true
    } = options;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `ucost_backup_${timestamp}`;
    const backupDir = path.join(this.backupDir, backupName);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    try {
      // 1. Export all exhibits to Excel
      const exhibits = await this.prisma.exhibit.findMany();
      const excelPath = path.join(backupDir, 'exhibits_data_sheet.xlsx');
      
      await this.excelService.saveToFile(exhibits, excelPath, {
        includeAnalytics,
        format: 'xlsx'
      });

      // 2. Export database schema
      const schemaPath = path.join(backupDir, 'database_schema.sql');
      await this.exportDatabaseSchema(schemaPath);

      // 3. Export raw data as JSON
      const jsonPath = path.join(backupDir, 'exhibits_raw_data.json');
      await this.exportRawData(jsonPath, exhibits);

      // 4. Include images if requested
      if (includeImages) {
        const imagesDir = path.join(backupDir, 'images');
        await this.backupImages(imagesDir);
      }

      // 5. Create backup manifest
      const manifestPath = path.join(backupDir, 'backup_manifest.json');
      await this.createBackupManifest(manifestPath, {
        timestamp: new Date().toISOString(),
        exhibitCount: exhibits.length,
        includeImages,
        includeAnalytics,
        backupSize: await this.calculateBackupSize(backupDir)
      });

      // 6. Compress if requested
      if (compress) {
        const compressedPath = await this.compressBackup(backupDir, backupName);
        // Clean up uncompressed directory
        fs.rmSync(backupDir, { recursive: true, force: true });
        return compressedPath;
      }

      return backupDir;
    } catch (error) {
      // Clean up on error
      if (fs.existsSync(backupDir)) {
        fs.rmSync(backupDir, { recursive: true, force: true });
      }
      throw new Error(`Backup failed: ${error}`);
    }
  }

  /**
   * Export database schema
   */
  private async exportDatabaseSchema(schemaPath: string): Promise<void> {
    try {
      // For SQLite, we'll export the schema using PRAGMA
      const schema = await this.prisma.$queryRaw`PRAGMA table_info(exhibits)`;
      fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    } catch (error) {
      console.warn('Could not export schema:', error);
      // Create a basic schema file
      const basicSchema = {
        tables: ['exhibits', 'users', 'tours', 'tour_exhibits', 'exhibit_analyses'],
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync(schemaPath, JSON.stringify(basicSchema, null, 2));
    }
  }

  /**
   * Export raw data as JSON
   */
  private async exportRawData(jsonPath: string, exhibits: Exhibit[]): Promise<void> {
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalExhibits: exhibits.length,
        version: '1.0.0'
      },
      exhibits: exhibits.map(exhibit => ({
        ...exhibit,
        // Convert dates to ISO strings for JSON compatibility
        createdAt: exhibit.createdAt.toISOString(),
        updatedAt: exhibit.updatedAt.toISOString(),
        lastMaintenance: exhibit.lastMaintenance?.toISOString() || null,
        nextMaintenance: exhibit.nextMaintenance?.toISOString() || null,
        warrantyExpiry: exhibit.warrantyExpiry?.toISOString() || null
      }))
    };

    fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2));
  }

  /**
   * Backup exhibit images
   */
  private async backupImages(imagesDir: string): Promise<void> {
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'exhibits');
    if (fs.existsSync(uploadsDir)) {
      await this.copyDirectory(uploadsDir, imagesDir);
    }
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Create backup manifest
   */
  private async createBackupManifest(manifestPath: string, metadata: any): Promise<void> {
    fs.writeFileSync(manifestPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Calculate backup size
   */
  private async calculateBackupSize(backupDir: string): Promise<string> {
    const calculateSize = (dir: string): number => {
      let size = 0;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          size += calculateSize(fullPath);
        } else {
          size += fs.statSync(fullPath).size;
        }
      }
      return size;
    };

    const bytes = calculateSize(backupDir);
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    return `${mb} MB`;
  }

  /**
   * Compress backup directory
   */
  private async compressBackup(backupDir: string, backupName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(this.backupDir, `${backupName}.zip`);
      const output = createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        resolve(outputPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(backupDir, false);
      archive.finalize();
    });
  }

  /**
   * Generate Excel data sheet
   */
  async generateExcelSheet(
    options: ExcelExportOptions = {}
  ): Promise<{ buffer: Buffer; filename: string }> {
    const exhibits = await this.prisma.exhibit.findMany();
    const buffer = await this.excelService.generateExhibitDataSheet(exhibits, options);
    const filename = this.excelService.generateFilename('ucost_exhibits');
    
    return { buffer, filename };
  }

  /**
   * Save Excel sheet to file
   */
  async saveExcelSheet(
    filePath: string,
    options: ExcelExportOptions = {}
  ): Promise<string> {
    const exhibits = await this.prisma.exhibit.findMany();
    return await this.excelService.saveToFile(exhibits, filePath, options);
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: string;
    lastBackup: string | null;
    backupList: Array<{
      name: string;
      size: string;
      date: string;
      type: 'directory' | 'compressed';
    }>;
  }> {
    if (!fs.existsSync(this.backupDir)) {
      return {
        totalBackups: 0,
        totalSize: '0 MB',
        lastBackup: null,
        backupList: []
      };
    }

    const entries = fs.readdirSync(this.backupDir, { withFileTypes: true });
    const backupList: Array<{ name: string; size: string; date: string; type: 'directory' | 'compressed' }> = entries
      .filter(entry => entry.isDirectory() || entry.name.endsWith('.zip'))
      .map(entry => {
        const fullPath = path.join(this.backupDir, entry.name);
        const stats = fs.statSync(fullPath);
        const size = (stats.size / (1024 * 1024)).toFixed(2);
        
        return {
          name: entry.name,
          size: `${size} MB`,
          date: stats.mtime.toISOString(),
          type: entry.isDirectory() ? 'directory' as const : 'compressed' as const
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalSize = backupList.reduce((sum, backup) => {
      const size = parseFloat(backup.size.replace(' MB', ''));
      return sum + size;
    }, 0);

    return {
      totalBackups: backupList.length,
      totalSize: `${totalSize.toFixed(2)} MB`,
      lastBackup: backupList.length > 0 ? backupList[0].date : null,
      backupList
    };
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(keepDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);
    
    const stats = await this.getBackupStats();
    let deletedCount = 0;

    for (const backup of stats.backupList) {
      const backupDate = new Date(backup.date);
      if (backupDate < cutoffDate) {
        const backupPath = path.join(this.backupDir, backup.name);
        try {
          if (backup.type === 'compressed') {
            fs.unlinkSync(backupPath);
          } else {
            fs.rmSync(backupPath, { recursive: true, force: true });
          }
          deletedCount++;
        } catch (error) {
          console.warn(`Failed to delete backup ${backup.name}:`, error);
        }
      }
    }

    return deletedCount;
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    // Implementation for backup restoration
    // This would involve parsing the backup and restoring data
    // For now, we'll just validate the backup exists
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup not found');
    }
    
    // TODO: Implement backup restoration logic
    throw new Error('Backup restoration not yet implemented');
  }
} 