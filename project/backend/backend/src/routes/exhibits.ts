import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Map exhibit type to default time in minutes
function computeDurationFromType(exhibitType?: string): number | null {
	const t = (exhibitType || '').toLowerCase().trim();
	if (t === 'interactive') return 6; // Interactive: 6 minutes
	if (t === 'passive' || t === 'observational' || t === 'passive/observational') return 3; // Passive/Observational: 3 minutes
	if (t === 'hands-on' || t === 'hands on' || t === 'handson') return 8; // Hands-on: 8 minutes
	return null;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const uploadDir = path.join(process.cwd(), 'uploads');
		if (!require('fs').existsSync(uploadDir)) {
			require('fs').mkdirSync(uploadDir, { recursive: true });
		}
		cb(null, uploadDir);
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
		const ext = path.extname(file.originalname);
		cb(null, `exhibit-${uniqueSuffix}${ext}`);
	}
});

const upload = multer({
	storage,
	limits: {
		// Increase supported file size to 50MB per image
		fileSize: 50 * 1024 * 1024,
		files: 5
	},
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith('image/')) {
			cb(null, true);
		} else {
			cb(new Error('Only image files are allowed'));
		}
	}
});

async function optimizeImage(filePath: string, originalName: string): Promise<void> {
	try {
		const ext = path.extname(originalName).toLowerCase();
		let pipeline = sharp(filePath).rotate().resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true });
		if (ext === '.jpg' || ext === '.jpeg') {
			pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
		} else if (ext === '.png') {
			pipeline = pipeline.png({ compressionLevel: 9 });
		} else if (ext === '.webp') {
			pipeline = pipeline.webp({ quality: 80 });
		}
		const buffer = await pipeline.toBuffer();
		await fs.promises.writeFile(filePath, buffer);
	} catch (err) {
		// If optimization fails, keep original file without blocking upload
		console.warn('Image optimization failed for', originalName, err);
	}
}

// GET /api/exhibits - Get all exhibits
router.get('/', async (req, res) => {
	try {
		const exhibits = await prisma.exhibit.findMany({
			where: { isActive: true },
			orderBy: { createdAt: 'desc' }
		});
		
		res.json({ 
			success: true, 
			exhibits: exhibits.map(exhibit => ({
				...exhibit,
				images: exhibit.images ? JSON.parse(exhibit.images) : [],
				features: (exhibit as any).interactiveFeatures ? JSON.parse((exhibit as any).interactiveFeatures) : [],
				mapLocation: (exhibit as any).coordinates ? JSON.parse((exhibit as any).coordinates) : null,
				type: (exhibit as any).exhibitType || null
			}))
		});
	} catch (error: any) {
		console.error('Error fetching exhibits:', error);
		res.status(500).json({ success: false, message: error.message });
	}
});

// GET /api/exhibits/:id - Get single exhibit
router.get('/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const exhibit = await prisma.exhibit.findUnique({
			where: { id }
		});
		
		if (!exhibit) {
			return res.status(404).json({ 
				success: false, 
				message: 'Exhibit not found' 
			});
		}
		
		res.json({ 
			success: true, 
			exhibit: {
				...exhibit,
				images: exhibit.images ? JSON.parse(exhibit.images) : [],
				features: (exhibit as any).interactiveFeatures ? JSON.parse((exhibit as any).interactiveFeatures) : [],
				mapLocation: (exhibit as any).coordinates ? JSON.parse((exhibit as any).coordinates) : null,
				type: (exhibit as any).exhibitType || null
			}
		});
	} catch (error: any) {
		console.error('Error fetching exhibit:', error);
		res.status(500).json({ success: false, message: error.message });
	}
});

// POST /api/exhibits - Create new exhibit (no auth required)
router.post('/', upload.array('images', 5), async (req, res) => {
	try {
		const {
			name,
			category,
			location,
			description,
			ageRange,
			type,
			environment,
			features,
			mapLocation
		} = req.body;

		// Process uploaded images
		const images: string[] = [];
		if (req.files && (req.files as Express.Multer.File[]).length > 0) {
			for (const file of (req.files as Express.Multer.File[])) {
				const filePath = path.join(process.cwd(), 'uploads', file.filename);
				await optimizeImage(filePath, file.originalname);
				images.push(file.filename);
			}
		}

		// Create exhibit in database
		const defaultDuration = computeDurationFromType(type || '');
		const newExhibit = await prisma.exhibit.create({
			data: {
				name,
				category,
				location,
				description: description || '',
				ageRange: ageRange || 'families',
				exhibitType: type || 'passive',
				environment: environment || 'indoor',
				interactiveFeatures: features ? JSON.stringify(JSON.parse(features)) : JSON.stringify([]),
				images: JSON.stringify(images),
				coordinates: mapLocation ? JSON.stringify(JSON.parse(mapLocation)) : JSON.stringify({}),
				visitorCount: 0,
				// duration = per-exhibit recommended time; averageTime keeps analytics-compatible field
				duration: defaultDuration ?? null,
				averageTime: defaultDuration ?? 0,
				rating: 0.0,
				feedbackCount: 0,
				isActive: true,
			}
		});

		res.status(201).json({
			success: true,
			message: 'Exhibit created successfully',
			exhibit: {
				...newExhibit,
				images,
				features: features ? JSON.parse(features) : [],
				mapLocation: mapLocation ? JSON.parse(mapLocation) : null
			}
		});
	} catch (error: any) {
		console.error('Error creating exhibit:', error);
		res.status(500).json({ success: false, message: error.message });
	}
});

// PUT /api/exhibits/:id - Update exhibit (no auth required)
router.put('/:id', upload.array('images', 5), async (req, res) => {
	try {
		const { id } = req.params;
		const updateData: any = { ...req.body };

		// Process uploaded images if any
		if (req.files && (req.files as Express.Multer.File[]).length > 0) {
			const newImages = (req.files as Express.Multer.File[]).map(file => file.filename);
			updateData.images = JSON.stringify(newImages);
		}

		// Map and parse JSON fields if they exist
		if (updateData.features) {
			updateData.interactiveFeatures = JSON.stringify(JSON.parse(updateData.features));
			delete updateData.features;
		}
		if (updateData.mapLocation) {
			updateData.coordinates = JSON.stringify(JSON.parse(updateData.mapLocation));
			delete updateData.mapLocation;
		}
		if (updateData.type) {
			updateData.exhibitType = updateData.type;
			// Auto-recalculate duration and averageTime when type changes
			const computed = computeDurationFromType(updateData.type);
			if (computed !== null) {
				updateData.duration = computed;
				updateData.averageTime = computed;
			}
			delete updateData.type;
		}

		const updatedExhibit = await prisma.exhibit.update({
			where: { id },
			data: updateData
		});

		res.json({
			success: true,
			message: 'Exhibit updated successfully',
			exhibit: updatedExhibit
		});
	} catch (error: any) {
		console.error('Error updating exhibit:', error);
		res.status(500).json({ success: false, message: error.message });
	}
});

// DELETE /api/exhibits/:id - Soft delete (no auth required)
router.delete('/:id', async (req, res) => {
	try {
		const { id } = req.params;
		
		await prisma.exhibit.update({
			where: { id },
			data: { isActive: false }
		});

		res.json({
			success: true,
			message: 'Exhibit deleted successfully'
		});
	} catch (error: any) {
		console.error('Error deleting exhibit:', error);
		res.status(500).json({ success: false, message: error.message });
	}
});

export default router; 