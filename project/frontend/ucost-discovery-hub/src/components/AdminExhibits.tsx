import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ArrowLeft, ArrowRight, Image as ImageIcon, RefreshCw, Search, Trash2, MapPin } from 'lucide-react';
import { PinMarker } from './ui/PinMarker';
import { AspectRatio } from './ui/aspect-ratio';

// Import the actual map images
import outsideMap from './maps/outside.png';
import groundMap from './maps/ground.png';
import firstFloorMap from './maps/1st-floor.png';
import { getApiUrl } from '@/lib/desktop-config';

const API_BASE_URL = getApiUrl();
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

interface ExhibitListItem {
	id: string;
	name: string;
	description?: string;
	category?: string;
	location?: string;
	ageRange?: string;
	type?: string;
	environment?: string;
	images?: string[];
	features?: string[];
	mapLocation?: any;
}

interface AdminExhibitsProps {
	onBack: () => void;
}

export default function AdminExhibits({ onBack }: AdminExhibitsProps) {
	const [exhibits, setExhibits] = useState<ExhibitListItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [query, setQuery] = useState('');
	const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

	const loadExhibits = async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`${API_BASE_URL}/exhibits`);
			if (!res.ok) throw new Error(`Failed to load exhibits (${res.status})`);
			const data = await res.json();
			setExhibits(data.exhibits || []);
		} catch (e: any) {
			setError(e.message || 'Failed to load exhibits');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadExhibits();
	}, []);

	const deleteExhibit = async (id: string) => {
		if (!id) return;
		if (!confirm('Delete this exhibit? This will hide it from listings.')) return;
		setDeletingIds(prev => new Set(prev).add(id));
		try {
			const res = await fetch(`${API_BASE_URL}/exhibits/${id}`, { method: 'DELETE' });
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || `Failed to delete (${res.status})`);
			}
			await loadExhibits();
		} catch (e: any) {
			setError(e.message || 'Failed to delete');
		} finally {
			setDeletingIds(prev => {
				const next = new Set(prev);
				next.delete(id);
				return next;
			});
		}
	};

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return exhibits;
		return exhibits.filter((ex) =>
			(ex.name || '').toLowerCase().includes(q) ||
			(ex.category || '').toLowerCase().includes(q) ||
			(ex.location || '').toLowerCase().includes(q)
		);
	}, [exhibits, query]);

	if (selectedId) {
		return (
			<AdminExhibitDetail id={selectedId} onBack={() => setSelectedId(null)} onDeleted={async () => { setSelectedId(null); await loadExhibits(); }} />
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
			<div className="max-w-7xl mx-auto">
				<div className="flex items-center justify-between mb-4">
					<Button variant="outline" onClick={onBack} className="text-white border-gray-600 hover:bg-gray-800">
						<ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Panel
					</Button>
					<div className="flex gap-2">
						<Button variant="outline" onClick={loadExhibits} disabled={loading} className="text-white border-gray-600 hover:bg-gray-800">
							<RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
						</Button>
					</div>
				</div>

				<Card className="bg-gray-900/90 border-gray-700">
					<CardHeader>
						<CardTitle className="text-white flex items-center justify-between">
							<span>All Exhibits</span>
							<div className="flex items-center gap-2 w-64">
								<Search className="h-4 w-4 text-gray-400" />
								<Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, category, location" className="h-9 bg-gray-800 border-gray-700 text-white placeholder-gray-400" />
							</div>
						</CardTitle>
					</CardHeader>
					<CardContent>
						{error && <div className="text-red-400 mb-3">{error}</div>}
						{loading ? (
							<div className="text-gray-300">Loading exhibits...</div>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
								{filtered.map((exhibit) => {
									const image = (exhibit.images && exhibit.images[0]) ? `${SERVER_BASE_URL}/uploads/${exhibit.images[0]}` : null;
									return (
										<Card key={exhibit.id} className="bg-gray-800 border-gray-700 overflow-hidden cursor-pointer hover:shadow-lg relative" onClick={() => setSelectedId(exhibit.id)}>
											{/* Delete button */}
											<Button
												variant="outline"
												size="sm"
												className="absolute top-2 right-2 h-8 px-2 bg-gray-900/70 border-gray-700 text-red-400 hover:text-red-300"
												onClick={(e) => { e.stopPropagation(); deleteExhibit(exhibit.id); }}
												disabled={deletingIds.has(exhibit.id)}
											>
												<Trash2 className={`h-4 w-4 ${deletingIds.has(exhibit.id) ? 'animate-pulse' : ''}`} />
											</Button>
											<div className="h-40 bg-gray-900 flex items-center justify-center">
												{image ? (
													<img src={image} alt={exhibit.name} className="w-full h-full object-cover" />
												) : (
													<div className="flex items-center justify-center text-gray-500">
														<ImageIcon className="h-10 w-10" />
													</div>
												)}
											</div>
											<CardContent className="p-4">
												<h3 className="text-white font-semibold truncate" title={exhibit.name}>{exhibit.name}</h3>
												<div className="text-gray-400 text-sm truncate">{exhibit.category || 'Uncategorized'}</div>
											</CardContent>
										</Card>
									);
								})}
								{!loading && filtered.length === 0 && (
									<div className="text-gray-400">No exhibits found.</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

// Single Exhibit Map Component
function SingleExhibitMap({ exhibit }: { exhibit: ExhibitListItem }) {
	const floorOptions = [
		{ value: 'outside', label: 'Outside Area', map: outsideMap },
		{ value: 'ground', label: 'Ground Floor', map: groundMap },
		{ value: 'first', label: '1st Floor', map: firstFloorMap },
	];

	const exhibitFloor = exhibit.mapLocation?.floor || 'ground';
	const currentMap = floorOptions.find(f => f.value === exhibitFloor)?.map || groundMap;

	if (!exhibit.mapLocation || !exhibit.mapLocation.x || !exhibit.mapLocation.y) {
		return (
			<div className="bg-gray-800 border border-gray-700 rounded-md h-64 flex items-center justify-center">
				<div className="text-center text-gray-400">
					<MapPin className="h-8 w-8 mx-auto mb-2" />
					<p>No location data available</p>
				</div>
			</div>
		);
	}

	const x = Math.max(0, Math.min(100, Number(exhibit.mapLocation.x)));
	const y = Math.max(0, Math.min(100, Number(exhibit.mapLocation.y)));

	return (
		<div className="bg-gray-800 border border-gray-700 rounded-md overflow-hidden">
			<div className="p-3 border-b border-gray-700">
				<div className="flex items-center justify-between">
					<h3 className="text-white font-semibold flex items-center gap-2">
						<MapPin className="h-4 w-4" />
						Exhibit Location
					</h3>
					<span className="text-gray-400 text-sm capitalize">{exhibitFloor} Floor</span>
				</div>
			</div>
			<div className="relative w-full">
				<AspectRatio ratio={exhibitFloor === 'outside' ? 8 / 5 : 1}>
					<div className="relative w-full h-full">
						{/* Map Background */}
						<div className="absolute inset-0">
							<img
								src={currentMap}
								alt={`${exhibitFloor} floor map`}
								className="w-full h-full object-contain bg-gray-700"
							/>
						</div>

						{/* Exhibit Location Pin */}
						<div
							className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
							style={{ left: `${x}%`, top: `${y}%` }}
						>
							<PinMarker
								category={exhibit.category}
								label={exhibit.name}
								sizePx={48}
								showLabel={true}
							/>
						</div>
					</div>
				</AspectRatio>
			</div>
		</div>
	);
}

function AdminExhibitDetail({ id, onBack, onDeleted }: { id: string; onBack: () => void; onDeleted: () => void }) {
	const [exhibit, setExhibit] = useState<ExhibitListItem | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		let mounted = true;
		(async () => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch(`${API_BASE_URL}/exhibits/${id}`);
				if (!res.ok) throw new Error(`Failed to load exhibit (${res.status})`);
				const data = await res.json();
				if (mounted) setExhibit(data.exhibit);
			} catch (e: any) {
				if (mounted) setError(e.message || 'Failed to load exhibit');
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => { mounted = false; };
	}, [id]);

	const images = exhibit?.images || [];

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
			<div className="max-w-5xl mx-auto">
				<div className="flex items-center justify-between mb-4">
					<Button variant="outline" onClick={onBack} className="text-white border-gray-600 hover:bg-gray-800">
						<ArrowLeft className="mr-2 h-4 w-4" /> Back to Exhibits
					</Button>
					<Button
						variant="outline"
						className="text-red-400 border-gray-600 hover:bg-gray-800"
						disabled={deleting}
						onClick={async () => {
							if (!id) return;
							if (!confirm('Delete this exhibit? This will hide it from listings.')) return;
							setDeleting(true);
							try {
								const res = await fetch(`${API_BASE_URL}/exhibits/${id}`, { method: 'DELETE' });
								if (!res.ok) {
									const err = await res.json().catch(() => ({}));
									throw new Error(err.message || `Failed to delete (${res.status})`);
								}
								onDeleted();
							} catch (e: any) {
								setError(e.message || 'Failed to delete');
							} finally {
								setDeleting(false);
							}
						}}
					>
						<Trash2 className={`mr-2 h-4 w-4 ${deleting ? 'animate-pulse' : ''}`} /> Delete
					</Button>
				</div>

				<Card className="bg-gray-900/90 border-gray-700">
					<CardHeader>
						<CardTitle className="text-white flex items-center justify-between">
							<span>Exhibit Details</span>
							<span className="text-gray-400 text-sm">ID: {id}</span>
						</CardTitle>
					</CardHeader>
					<CardContent>
						{error && <div className="text-red-400 mb-3">{error}</div>}
						{loading || !exhibit ? (
							<div className="text-gray-300">Loading...</div>
						) : (
							<div className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div className="md:col-span-2 bg-gray-800 border border-gray-700 rounded-md h-64 flex items-center justify-center overflow-hidden">
										{images.length > 0 ? (
											<img src={`${SERVER_BASE_URL}/uploads/${images[0]}`} alt={exhibit.name} className="w-full h-full object-cover" />
										) : (
											<div className="text-gray-500 flex items-center gap-2"><ImageIcon className="h-5 w-5" /> No image</div>
										)}
									</div>
									<div className="space-y-2">
										<div className="text-2xl font-semibold text-white">{exhibit.name}</div>
										<div className="text-gray-300">{exhibit.description || 'No description'}</div>
										<div className="grid grid-cols-2 gap-2 text-sm text-gray-300 mt-2">
											<div><span className="text-gray-400">Category:</span> {exhibit.category || '-'}</div>
											<div><span className="text-gray-400">Location:</span> {exhibit.location || '-'}</div>
											<div><span className="text-gray-400">Age Range:</span> {exhibit.ageRange || '-'}</div>
											<div><span className="text-gray-400">Type:</span> {exhibit.type || '-'}</div>
											<div><span className="text-gray-400">Environment:</span> {exhibit.environment || '-'}</div>
										</div>
									</div>
								</div>

								{exhibit.features && exhibit.features.length > 0 && (
									<div>
										<div className="text-white font-semibold mb-2">Features</div>
										<div className="flex flex-wrap gap-2">
											{exhibit.features.map((f, idx) => (
												<span key={idx} className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-200">{f}</span>
											))}
										</div>
									</div>
								)}

								{images.length > 1 && (
									<div>
										<div className="text-white font-semibold mb-2">Gallery</div>
										<div className="grid grid-cols-2 md:grid-cols-4 gap-2">
											{images.slice(1).map((img, idx) => (
												<img key={idx} src={`${SERVER_BASE_URL}/uploads/${img}`} className="w-full h-28 object-cover rounded border border-gray-700" />
											))}
										</div>
									</div>
								)}

								{/* Exhibit Location Map */}
								<div>
									<SingleExhibitMap exhibit={exhibit} />
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

