import ExcelJS from 'exceljs';
import { Exhibit } from '@prisma/client';
import path from 'path';
import fs from 'fs';

export interface ExcelExportOptions {
  includeImages?: boolean;
  includeAnalytics?: boolean;
  format?: 'xlsx' | 'csv';
  filename?: string;
}

export class ExcelExportService {
  private workbook: ExcelJS.Workbook;
  private worksheet: ExcelJS.Worksheet;

  constructor() {
    this.workbook = new ExcelJS.Workbook();
    this.worksheet = this.workbook.addWorksheet('Exhibits Data Sheet');
  }

  /**
   * Generate comprehensive Excel data sheet for exhibits
   */
  async generateExhibitDataSheet(
    exhibits: Exhibit[],
    options: ExcelExportOptions = {}
  ): Promise<Buffer> {
    const {
      includeImages = false,
      includeAnalytics = true,
      format = 'xlsx'
    } = options;

    // Set up worksheet styling
    this.setupWorksheetStyling();

    // Add headers
    this.addHeaders(includeAnalytics);

    // Add data rows
    this.addDataRows(exhibits, includeAnalytics);

    // Add summary statistics
    if (includeAnalytics) {
      this.addSummaryStatistics(exhibits);
    }

    // Auto-fit columns
    this.worksheet.columns.forEach(column => {
      if (column.width) {
        column.width = Math.min(column.width + 2, 50);
      }
    });

    // Generate buffer
    if (format === 'csv') {
      return this.generateCSVBuffer();
    } else {
      return this.generateXLSXBuffer();
    }
  }

  /**
   * Setup worksheet styling and formatting
   */
  private setupWorksheetStyling() {
    // Set up header row styling
    const headerRow = this.worksheet.getRow(1);
    headerRow.height = 30;
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' }
    };

    // Set up alternating row colors
    this.worksheet.addRow = function(values: any) {
      const row = this.addRow(values);
      if (row.number > 1 && row.number % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F2F2F2' }
        };
      }
      return row;
    };
  }

  /**
   * Add comprehensive headers for the data sheet
   */
  private addHeaders(includeAnalytics: boolean) {
    const headers = [
      // Basic Information
      'Exhibit ID',
      'Exhibit Code',
      'Name',
      'Scientific Name',
      'Category',
      'Description',
      'Location',
      'Floor',
      
      // Target Audience
      'Age Range',
      'Exhibit Type',
      'Environment',
      'Difficulty',
      'Duration (min)',
      'Language',
      
      // Technical Specifications
      'Materials',
      'Dimensions',
      'Weight (kg)',
      'Power Requirements',
      'Temperature Range',
      'Humidity Range',
      
      // Educational Content
      'Educational Value',
      'Curriculum Links',
      'Accessibility Features',
      
      // Maintenance & Safety
      'Maintenance Notes',
      'Safety Notes',
      'Last Maintenance',
      'Next Maintenance',
      'Risk Assessment',
      
      // Business Information
      'Cost',
      'Sponsor',
      'Designer',
      'Manufacturer',
      'Warranty Expiry',
      'Insurance Info',
      'Emergency Contact',
      
      // Media & Features
      'Images Count',
      'Videos Count',
      'Audio Guides Count',
      'Interactive Features',
      'Virtual Tour URL',
      
      // Location Details
      'Coordinates',
      'Nearby Facilities',
      'Route Instructions'
    ];

    if (includeAnalytics) {
      headers.push(
        'Visitor Count',
        'Average Time (min)',
        'Rating',
        'Feedback Count'
      );
    }

    headers.push('Created Date', 'Updated Date');

    this.worksheet.addRow(headers);
  }

  /**
   * Add data rows with all exhibit information
   */
  private addDataRows(exhibits: Exhibit[], includeAnalytics: boolean) {
    exhibits.forEach(exhibit => {
      const rowData = [
        // Basic Information
        exhibit.id,
        exhibit.exhibitCode || '',
        exhibit.name,
        exhibit.scientificName || '',
        exhibit.category || '',
        exhibit.description || '',
        exhibit.location || '',
        exhibit.floor || '',
        
        // Target Audience
        exhibit.ageRange || '',
        exhibit.exhibitType || '',
        exhibit.environment || '',
        exhibit.difficulty || '',
        exhibit.duration || '',
        exhibit.language || '',
        
        // Technical Specifications
        exhibit.materials || '',
        exhibit.dimensions || '',
        exhibit.weight || '',
        exhibit.powerRequirements || '',
        exhibit.temperatureRange || '',
        exhibit.humidityRange || '',
        
        // Educational Content
        exhibit.educationalValue || '',
        exhibit.curriculumLinks || '',
        exhibit.accessibility || '',
        
        // Maintenance & Safety
        exhibit.maintenanceNotes || '',
        exhibit.safetyNotes || '',
        this.formatDate(exhibit.lastMaintenance),
        this.formatDate(exhibit.nextMaintenance),
        exhibit.riskAssessment || '',
        
        // Business Information
        exhibit.cost || '',
        exhibit.sponsor || '',
        exhibit.designer || '',
        exhibit.manufacturer || '',
        this.formatDate(exhibit.warrantyExpiry),
        exhibit.insuranceInfo || '',
        exhibit.emergencyContact || '',
        
        // Media & Features
        this.getArrayLength(exhibit.images),
        this.getArrayLength(exhibit.videos),
        this.getArrayLength(exhibit.audioGuides),
        exhibit.interactiveFeatures || '',
        exhibit.virtualTour || '',
        
        // Location Details
        exhibit.coordinates || '',
        exhibit.nearbyFacilities || '',
        exhibit.routeInstructions || ''
      ];

      if (includeAnalytics) {
        rowData.push(
          exhibit.visitorCount,
          exhibit.averageTime,
          exhibit.rating,
          exhibit.feedbackCount
        );
      }

      rowData.push(
        this.formatDate(exhibit.createdAt),
        this.formatDate(exhibit.updatedAt)
      );

      this.worksheet.addRow(rowData);
    });
  }

  /**
   * Add summary statistics at the bottom
   */
  private addSummaryStatistics(exhibits: Exhibit[]) {
    // Add empty row
    this.worksheet.addRow([]);
    
    // Summary section header
    const summaryHeader = this.worksheet.addRow(['EXHIBIT SUMMARY STATISTICS']);
    summaryHeader.font = { bold: true, size: 14 };
    summaryHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD700' }
    };

    // Calculate statistics
    const totalExhibits = exhibits.length;
    const activeExhibits = exhibits.filter(e => e.isActive).length;
    const totalCost = exhibits.reduce((sum, e) => sum + (e.cost || 0), 0);
    const totalVisitors = exhibits.reduce((sum, e) => sum + e.visitorCount, 0);
    const avgRating = exhibits.length > 0 
      ? exhibits.reduce((sum, e) => sum + e.rating, 0) / exhibits.length 
      : 0;

    const categoryCounts = exhibits.reduce((acc, e) => {
      const cat = e.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statistics = [
      ['Total Exhibits', totalExhibits],
      ['Active Exhibits', activeExhibits],
      ['Total Cost', `$${totalCost.toFixed(2)}`],
      ['Total Visitors', totalVisitors],
      ['Average Rating', avgRating.toFixed(2)],
      ['', ''],
      ['Category Distribution:', ''],
      ...Object.entries(categoryCounts).map(([cat, count]) => [cat, count])
    ];

    statistics.forEach(([label, value]) => {
      const row = this.worksheet.addRow([label, value]);
      if (label === 'Category Distribution:') {
        row.font = { bold: true };
      }
    });
  }

  /**
   * Generate XLSX buffer
   */
  private async generateXLSXBuffer(): Promise<Buffer> {
    const arrayBuffer = await this.workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer as ArrayBuffer);
  }

  /**
   * Generate CSV buffer
   */
  private async generateCSVBuffer(): Promise<Buffer> {
    const arrayBuffer = await this.workbook.csv.writeBuffer();
    return Buffer.from(arrayBuffer as ArrayBuffer);
  }

  /**
   * Helper method to format dates
   */
  private formatDate(date: Date | null): string {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Helper method to get array length from JSON string
   */
  private getArrayLength(jsonString: string | null): number {
    if (!jsonString) return 0;
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Save file to disk
   */
  async saveToFile(
    exhibits: Exhibit[],
    filePath: string,
    options: ExcelExportOptions = {}
  ): Promise<string> {
    const buffer = await this.generateExhibitDataSheet(exhibits, options);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  /**
   * Generate filename with timestamp
   */
  generateFilename(prefix: string = 'exhibits'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}_${timestamp}.xlsx`;
  }
} 