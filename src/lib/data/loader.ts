import regions from '../../../data/regions.json';
import sections from '../../../data/sections.json';
import needles from '../../../data/needles.json';
import decisions from '../../../data/review/decisions.json';
import { applyReview, type Decision } from './review';
import locations from '../../../data/locations.json';
import { applyLocations, type LocationRecord } from './merge';
import panoramaData from '../../../data/panoramas.json';
import observationData from '../../../data/observations.json';
import type { ObservationPoint, Panorama } from './types';
import type { Dataset, Needle, Region, Section } from './types';

export const dataset = applyLocations(applyReview({ regions, sections, needles } as unknown as Dataset, decisions as Decision[]), locations as LocationRecord[]);
export const getRegion = (slug: string): Region | undefined => dataset.regions.find((r) => r.slug === slug);
export const getSection = (id: string): Section | undefined => dataset.sections.find((s) => s.id === id);
export const getNeedle = (id: string): Needle | undefined => dataset.needles.find((n) => n.id === id);
export const needlesOf = (s: Section): Needle[] => s.needleIds.map((id) => getNeedle(id)!).filter(Boolean);
export const needleCount = (r: Region): number => r.sectionIds.reduce((t, id) => t + (getSection(id)?.needleIds.length ?? 0), 0);

export const panoramas = panoramaData as unknown as Panorama[];
export const observations = observationData as unknown as ObservationPoint[];
export const getPanorama = (id: string): Panorama | undefined => panoramas.find((p) => p.id === id);
export const panoramasFor = (needleId: string): Panorama[] => panoramas.filter((p) => p.annotations.some((a) => a.needleId === needleId));
