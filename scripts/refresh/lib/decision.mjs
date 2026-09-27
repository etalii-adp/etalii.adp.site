// A question a run cannot answer from its sources (research R9). A procedure throws it from its apply or afterApply
// step; the runner writes it to .refresh/decision.json and ends with `needs-decision` (exit 3).
export class NeedsDecision extends Error {
	/**
	 * @param {{ question: string, subject: string, options: string[], writeTo: string, key?: string[], answerWith?: string[] }} decision
	 * `key` is the path of property names inside `writeTo` (an array, because file names contain dots). A decision
	 * answered by another command than refresh:decide gives its steps as `answerWith` instead.
	 */
	constructor(decision) {
		super(decision.question);
		this.decision = decision;
	}
}
