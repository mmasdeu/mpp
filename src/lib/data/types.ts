export interface BookRef { pageStart?: number; pageEnd?: number }
export interface Region { id: string; name: string; slug: string; description?: string; sectionIds: string[]; bookReference?: BookRef }
export interface Section { id: string; regionId: string; name: string; order: number; description?: string | null; needleIds: string[]; bookReference?: BookRef }
export interface BookReference { page: number; type: 'description' | 'route' | 'illustration' | 'photograph'; note?: string }
export interface ImageReference { id: string; filename: string; caption?: string; author?: string; date?: string; source?: string; license?: string; type: 'photograph' | 'historical' | 'drawing' | 'map' }
export interface Needle {
	id: string; name: string; alternativeNames: string[]; regionId: string; sectionId: string;
	/** Number on Ramon de Semir's plan, as cited by the book (unverified OCR until reviewed). */
	semirRef?: string;
	description?: string; normalRoute?: string; otherRoutes?: string[];
	location?: { latitude: number; longitude: number; elevation?: number; accuracy?: 'verified' | 'approximate' | 'unknown'; source?: string };
	images: ImageReference[]; bookReferences: BookReference[]; historicalNotes?: string[];
	/** what kind of entry this is: absent = needle/rock; 'cova' = cave, 'avenc' = pit/shaft (also listed in the book, data/review/kinds.json + additions) */
	kind?: 'cova' | 'avenc';
	/** only for reviewer-added needles (data/review/additions.json): id of the needle they follow in book order */
	after?: string;
	metadata: { extractionStatus: 'verified' | 'reviewed' | 'unreviewed'; extractionNote?: string; lastUpdated?: string };
	/** entries merged into this one by the review (data/review/decisions.json, action «merge»), with their first book page and any
	 *  reviewed text; the page shows their text after/before this needle's own, in book order */
	mergedParts?: MergedPart[];
	/** the reviewed description already covers the text of the merged entries (it was saved after the merge) */
	descriptionIncludesMerged?: boolean;
}
export interface MergedPart { id: string; name: string; page: number; description?: string }
/** Unreviewed OCR of a needle's text (data/ocr/descriptions.json; git-ignored because the book is copyrighted). */
export interface OcrText { text: string; pages: number[]; headingFound: boolean; endFound: boolean; meanConf: number; status: 'ocr-unreviewed' }
export interface Dataset { regions: Region[]; sections: Section[]; needles: Needle[] }

/** Unreviewed OCR of a section's or region's introduction (data/ocr/intros.json; git-ignored: copyrighted). */
export interface Intro { text: string; pages: number[]; meanConf: number; status: 'ocr-unreviewed' | 'reviewed'; reviewer?: string; date?: string }

/** A panoramic view printed in the book, shown on its region's page (data/book-panoramas.json; image static/images/drawings/pano-<id>.webp, git-ignored: copyrighted). */
export interface BookPanorama { id: string; regionId: string; title: string; pages: number[] }
