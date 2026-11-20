import regions from '../../../data/regions.json';
import sections from '../../../data/sections.json';
import needles from '../../../data/needles.json';
import decisions from '../../../data/review/decisions.json';
import { applyReview, type Decision } from './review';
import locations from '../../../data/locations.json';
import { applyLocations, type LocationRecord } from './merge';
import structure from '../../../data/review/structure.json';
import additions from '../../../data/review/additions.json';
import kinds from '../../../data/review/kinds.json';
import { applyKinds } from './kinds';
import altNames from '../../../data/review/alt-names.json';
import { applyAltNames } from './alt-names';
import fixes from '../../../data/review/fixes.json';
import { applyFixes } from './fixes';
import { applyAdditions } from './additions';
import { applyStructure, type Structure } from './structure';
import type { Dataset, Needle, Region, Section } from './types';

export const dataset = applyAltNames(applyKinds(applyLocations(applyStructure(applyReview(applyFixes(applyAdditions({ regions, sections, needles } as unknown as Dataset, additions as unknown as Needle[]), fixes as Record<string, { name?: string; semirRef?: string }>), decisions as Decision[]), structure as Structure), locations as LocationRecord[]), kinds as Record<string, string>), altNames as Record<string, string[]>);
export const getRegion = (slug: string): Region | undefined => dataset.regions.find((r) => r.slug === slug);
export const getSection = (id: string): Section | undefined => dataset.sections.find((s) => s.id === id);
export const getNeedle = (id: string): Needle | undefined => dataset.needles.find((n) => n.id === id);
export const needlesOf = (s: Section): Needle[] => s.needleIds.map((id) => getNeedle(id)!).filter(Boolean);
export const needleCount = (r: Region): number => r.sectionIds.reduce((t, id) => t + (getSection(id)?.needleIds.length ?? 0), 0);

