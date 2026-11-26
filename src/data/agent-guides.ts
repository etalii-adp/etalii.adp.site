/**
 * How an AI agent writes a tool's file, which its tool page explains and links to (Peter, 2026-11-26). Site-owned, like
 * example-exports.ts: the guide and the grammar live beside the tool's definition in etalii.adp, and nothing in the
 * catalogue sources says they exist. Keyed by the tool's origin.
 */
export interface AgentGuide {
	/** The file extension an agent writes. */
	extension: string;
	/** What the paragraph above the links says, in plain words for someone who uses an AI agent. */
	about: string;
	/** The guide to hand the agent: its title as a link reads, its address and what it holds. */
	guide: { title: string; href: string; about: string };
	/** The Lark grammar the file is written against: its file name as a link reads, its address and what it is for. */
	grammar: { title: string; href: string; about: string };
}

const definitions = 'https://github.com/etalii-adp/etalii.adp/blob/develop/definitions/diagrams';

export const agentGuides: Readonly<Record<string, AgentGuide>> = {
	'systems/causal-loop-diagram': {
		extension: '.cld',
		about:
			'A causal loop diagram is stored as a plain text .cld file, one statement per line, so an AI agent can write one for you. Describe the system you want to understand, give the agent the guide below, and ask it for a .cld file. The guide says what a file holds, its variables, the links between them with their polarity and the feedback loops they form, and the rules a valid file keeps, with a small example to start from. Open the file the agent writes in any host that has the tool: positions are not part of a .cld file, so the host lays the diagram out, and it reports anything the file gets wrong.',
		guide: {
			title: 'Writing a causal loop diagram with an LLM',
			href: `${definitions}/causal-loop-diagram/README.md`,
			about: 'the guide to hand an agent, with the rules, the grammar and an example in one page.',
		},
		grammar: {
			title: 'cld.lark',
			href: `${definitions}/causal-loop-diagram/cld.lark`,
			about:
				'the grammar of a .cld file in Lark, strict LALR(1). An agent or a script can check a file against it, or constrain what a model generates to it, with Lark in Python or the EtAlii Lark packages for Rust, TypeScript and C#.',
		},
	},
};
