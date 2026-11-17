export interface BookRef { pageStart?: number; pageEnd?: number }
export interface Region { id: string; name: string; slug: string; description?: string; sectionIds: string[]; bookReference?: BookRef }
export interface Section { id: string; regionId: string; name: string; order: number; description?: string | null; needleIds: string[]; bookReference?: BookRef }
export interface BookReference { page: number; type: 'description' | 'route' | 'illustration' | 'photograph'; note?: string }
export interface ImageReference { id: string; filename: string; caption?: string; author?: string; date?: string; source?: string; license?: string; type: 'photograph' | 'historical' | 'drawing' | 'panorama' | 'map' }
export interface Needle {
	id: string; name: string; alternativeNames: string[]; regionId: string; sectionId: string;
	/** Number on Ramon de Semir's plan, as cited by the book (unverified OCR until reviewed). */
	semirRef?: string;
	description?: string; normalRoute?: string; otherRoutes?: string[];
	location?: { latitude: number; longitude: number; elevation?: number; accuracy?: 'verified' | 'approximate' | 'unknown'; source?: string };
	images: ImageReference[]; bookReferences: BookReference[]; historicalNotes?: string[];
	metadata: { extractionStatus: 'verified' | 'reviewed' | 'unreviewed'; extractionNote?: string; lastUpdated?: string };
}
export interface Dataset { regions: Region[]; sections: Section[]; needles: Needle[] }
