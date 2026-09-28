import { existsSync, readFileSync } from 'node:fs';
import type { HostAvailability, HostId, StateId } from './types.ts';

/**
 * The site-wide state set (data-model § State, research D3). The mapping from source states is not here: it is
 * spec 004's `procedures/config/states.json`, shared with the refresh procedures.
 */
export const stateIds: readonly StateId[] = ['not-planned', 'idea', 'planned', 'in-progress', 'prototype', 'implemented', 'available'];

export const states: Record<StateId, { label: string; rank: number; usable: boolean }> = {
	'not-planned': { label: 'Not planned', rank: 0, usable: false },
	idea: { label: 'Idea', rank: 1, usable: false },
	planned: { label: 'Planned', rank: 2, usable: false },
	'in-progress': { label: 'In progress', rank: 3, usable: false },
	prototype: { label: 'Prototype', rank: 4, usable: true },
	implemented: { label: 'Not yet released', rank: 5, usable: true },
	available: { label: 'Available', rank: 6, usable: true },
};

/** The states with a facet page (contracts/site-addresses.md): ideas are listed on the overview only, and "not planned" is never a membership. */
export const facetStates: readonly StateId[] = ['planned', 'in-progress', 'prototype', 'implemented', 'available'];

export const defaultStatesConfig = 'procedures/config/states.json';

/** `procedures/config/states.json`: the site states and, per host, source state label → site state. */
export interface StateMapping {
	siteStates: StateId[];
	hostStates: string[];
	mappings: Partial<Record<HostId, Record<string, string>>>;
}

export class UnmappedStateError extends Error {
	host: HostId;
	label: string;
	constructor(host: HostId, label: string) {
		super(`The source state "${label}" in ${host} has no site state in procedures/config/states.json; add it under mappings.${host}.`);
		this.name = 'UnmappedStateError';
		this.host = host;
		this.label = label;
	}
}

/** Reads the state configuration and fails unless `siteStates` is exactly the seven states, in order. */
export function loadMapping(configPath: string = defaultStatesConfig): StateMapping {
	if (!existsSync(configPath)) throw new Error(`${configPath}: the state configuration is missing.`);
	const config = JSON.parse(readFileSync(configPath, 'utf8')) as StateMapping;
	if (JSON.stringify(config.siteStates) !== JSON.stringify(stateIds)) {
		throw new Error(`${configPath}: siteStates must be ${stateIds.join(', ')}; found ${(config.siteStates ?? []).join(', ') || 'nothing'}.`);
	}
	for (const [host, map] of Object.entries(config.mappings ?? {})) {
		for (const [label, state] of Object.entries(map ?? {})) {
			if (!stateIds.includes(state as StateId)) throw new Error(`${configPath}: mappings.${host}.${label} is "${state}", which is not a site state.`);
		}
	}
	return config;
}

/** A source label without its leading emoji and whitespace: `⚗️ Prototype` → `Prototype`. */
export function bareLabel(label: string): string {
	return label.replace(/^[^\p{L}\p{N}]+/u, '').trim();
}

/** Maps a source state label (with or without its emoji) to a site state, or throws UnmappedStateError. */
export function mapSourceState(mapping: StateMapping, host: HostId, label: string): StateId {
	const state = mapping.mappings[host]?.[bareLabel(label)];
	if (!state) throw new UnmappedStateError(host, label);
	return state as StateId;
}

/** A designer's best state: the highest rank over its hosts. */
export function bestState(hosts: Record<HostId, Pick<HostAvailability, 'state'>>): StateId {
	return Object.values(hosts).reduce<StateId>((best, { state }) => (states[state].rank > states[best].rank ? state : best), 'not-planned');
}

/** Whether a visitor can use the designer in some form: prototype, implemented or available. */
export function isUsable(state: StateId): boolean {
	return states[state].usable;
}

/**
 * Whether a designer in this state shows its screenshots (FR-007, amended 2026-09-28): from "In progress" up. A
 * designer in progress is not usable yet, so its screenshots are marked as work in progress.
 */
export function showsScreenshots(state: StateId): boolean {
	return states[state].rank >= states['in-progress'].rank;
}
