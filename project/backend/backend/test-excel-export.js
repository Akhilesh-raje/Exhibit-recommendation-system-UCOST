const { ExcelExportService } = require('./src/services/excelExport');

async function testExcelExport() {
  try {
    console.log('🧪 Testing Excel Export Service...');
    
    // Create sample exhibit data
    const sampleExhibits = [
      {
        id: 'exhibit-001',
        name: 'Interactive Physics Lab',
        description: 'Hands-on physics experiments for students',
        category: 'physics',
        location: 'Ground Floor - Lab A',
        isActive: true,
        exhibitCode: 'PHY-001',
        scientificName: 'Physics Laboratory',
        ageRange: 'students',
        exhibitType: 'interactive',
        environment: 'indoor',
        duration: 45,
        difficulty: 'medium',
        language: 'English',
        accessibility: 'Wheelchair accessible, Audio guides available',
        maintenanceNotes: 'Check electrical connections monthly',
        safetyNotes: 'Safety goggles required, adult supervision recommended',
        educationalValue: 'Understanding of basic physics principles',
        curriculumLinks: 'Grade 9-12 Physics Curriculum',
        materials: 'Metal, Plastic, Electronic components',
        dimensions: '3m x 2m x 1.5m',
        weight: 150.5,
        powerRequirements: '220V AC, 2kW max',
        temperatureRange: '18-25°C',
        humidityRange: '40-60%',
        cost: 25000.00,
        sponsor: 'UCOST Foundation',
        designer: 'Dr. Physics Expert',
        manufacturer: 'Science Equipment Co.',
        visitorCount: 1250,
        averageTime: 35,
        rating: 4.5,
        feedbackCount: 89,
        images: JSON.stringify(['image1.jpg', 'image2.jpg']),
        videos: JSON.stringify(['demo.mp4']),
        audioGuides: JSON.stringify(['guide1.mp3', 'guide2.mp3']),
        interactiveFeatures: JSON.stringify(['Touch Screen', 'Motion Sensors']),
        virtualTour: 'https://virtual.ucost.org/physics-lab',
        floor: 'ground',
        coordinates: JSON.stringify({ x: 100, y: 200 }),
        nearbyFacilities: JSON.stringify(['Cafeteria', 'Restroom']),
        routeInstructions: 'From main entrance, turn right, lab is on the left',
        createdAt: new Date('2025-01-15'),
        updatedAt: new Date('2025-01-15')
      },
      {
        id: 'exhibit-002',
        name: 'Chemistry Discovery Center',
        description: 'Interactive chemistry experiments and demonstrations',
        category: 'chemistry',
        location: 'First Floor - Lab B',
        isActive: true,
        exhibitCode: 'CHEM-001',
        scientificName: 'Chemistry Laboratory',
        ageRange: 'families',
        exhibitType: 'hands-on',
        environment: 'indoor',
        duration: 60,
        difficulty: 'easy',
        language: 'English',
        accessibility: 'Wheelchair accessible, Braille labels',
        maintenanceNotes: 'Clean glassware weekly, check chemical storage',
        safetyNotes: 'Lab coats required, no food or drink',
        educationalValue: 'Introduction to chemical reactions',
        curriculumLinks: 'Grade 7-12 Chemistry Curriculum',
        materials: 'Glass, Chemicals, Safety equipment',
        dimensions: '4m x 3m x 2m',
        weight: 200.0,
        powerRequirements: '110V AC, 1.5kW max',
        temperatureRange: '20-22°C',
        humidityRange: '30-50%',
        cost: 35000.00,
        sponsor: 'Chemical Industries Ltd.',
        designer: 'Prof. Chemistry Master',
        manufacturer: 'Lab Equipment Pro',
        visitorCount: 980,
        averageTime: 50,
        rating: 4.8,
        feedbackCount: 67,
        images: JSON.stringify(['chem1.jpg', 'chem2.jpg', 'chem3.jpg']),
        videos: JSON.stringify(['reaction.mp4', 'safety.mp4']),
        audioGuides: JSON.stringify(['chem_guide.mp3']),
        interactiveFeatures: JSON.stringify(['Chemical Mixing', 'Temperature Control']),
        virtualTour: 'https://virtual.ucost.org/chemistry-center',
        floor: 'first',
        coordinates: JSON.stringify({ x: 150, y: 300 }),
        nearbyFacilities: JSON.stringify(['Library', 'Conference Room']),
        routeInstructions: 'Take elevator to first floor, follow signs to Lab B',
        createdAt: new Date('2025-01-10'),
        updatedAt: new Date('2025-01-12')
      }
    ];

    console.log('📊 Sample exhibits created:', sampleExhibits.length);

    // Test Excel export service
    const excelService = new ExcelExportService();
    
    console.log('📋 Generating Excel data sheet...');
    const buffer = await excelService.generateExhibitDataSheet(sampleExhibits, {
      includeAnalytics: true,
      format: 'xlsx'
    });

    console.log('✅ Excel buffer generated successfully!');
    console.log('📏 Buffer size:', (buffer.length / 1024).toFixed(2), 'KB');

    // Test saving to file
    const testFilePath = './test_exhibits_data_sheet.xlsx';
    console.log('💾 Saving to file:', testFilePath);
    
    await excelService.saveToFile(sampleExhibits, testFilePath, {
      includeAnalytics: true,
      format: 'xlsx'
    });

    console.log('✅ Excel file saved successfully!');
    console.log('📁 File path:', testFilePath);

    // Test CSV export
    console.log('📊 Generating CSV format...');
    const csvBuffer = await excelService.generateExhibitDataSheet(sampleExhibits, {
      includeAnalytics: true,
      format: 'csv'
    });

    console.log('✅ CSV buffer generated successfully!');
    console.log('📏 CSV buffer size:', (csvBuffer.length / 1024).toFixed(2), 'KB');

    // Test filename generation
    const filename = excelService.generateFilename('test_exhibits');
    console.log('📝 Generated filename:', filename);

    console.log('\n🎉 All tests passed successfully!');
    console.log('\n📋 What was tested:');
    console.log('  ✅ Excel export service creation');
    console.log('  ✅ Sample data generation');
    console.log('  ✅ Excel buffer generation');
    console.log('  ✅ File saving functionality');
    console.log('  ✅ CSV format support');
    console.log('  ✅ Filename generation');
    console.log('\n📁 Generated files:');
    console.log('  📊 Excel:', testFilePath);
    console.log('  📏 Buffer sizes: Excel', (buffer.length / 1024).toFixed(2), 'KB, CSV', (csvBuffer.length / 1024).toFixed(2), 'KB');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testExcelExport(); 