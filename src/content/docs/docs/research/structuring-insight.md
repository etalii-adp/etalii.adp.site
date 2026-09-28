---
title: When thinking outgrows the tool
description: What people complain about when their tools cannot hold the shape of their thinking, knowledge or information, from eleven domains, in seven patterns.
part: documentation
section: docs
---

What people complain about when the tools at hand cannot hold the shape of their thinking, knowledge or information. The cases come from eleven domains, from shuttle engineering to novel writing, and fall into seven recurring patterns. Each pattern ends with what it means for ADP.

This is background research, gathered with web searches on 28 September 2026. Several forum pages (Hacker News, Figma, Literature & Latte, GTD, EA Forum, LonM's blog) could not be opened from the research environment, so their descriptions come from search excerpts rather than a full read. The survey figures in the meetings case are vendor-reported and unverified.

## 1. The knowledge is a graph, the tool is a table or a tree

The most common complaint. People hold many-to-many relations (requirement to test, evidence to hypothesis, idea to several parents) and the tool offers rows or a strict hierarchy.

- **Systems engineering.** Requirements traceability kept in Excel breaks down with scale, loses who changed what, and needs every update copied by hand. One vendor put it bluntly: "traceability is a graph problem, and spreadsheets are a table tool." Sources: [SMAD Portal](https://www.extant2000.com/blog/requirements-traceability-spreadsheets), [Kualitee, "Death by Excel?"](https://www.kualitee.com/blog/test-management/requirements-traceability-matrix-death-by-excel-or-a-useful-tool/).
- **Mind mapping.** FigJam users ask for a child node to have two parents; mind maps force a tree. On the GTD forum, people describe large projects as "too complicated for mind maps" and move to concept maps. Sources: [Figma forum](https://forum.figma.com/suggest-a-feature-11/figjam-mind-maps-cannot-share-child-18526), [GTD forum](https://forum.gettingthingsdone.com/threads/mind-maps-vs-concept-maps-for-getting-overview-control-of-your-larger-projects.12934/).
- **Litigation.** Case chronologies live in spreadsheets, whiteboards and sticky notes. A judge or jury "can't see the gaps or feel the timing" in a spreadsheet, so a whole product category of timeline tools exists to fix it. Sources: [Opus 2](https://www.opus2.com/en-us/litigation-timeline-software/), [TrialLine](https://blog.trialline.net/interactive-legal-timelines-case-complexity/).
- **Investigative journalism.** Tracing people, companies and documents across leaks needed graph tooling; ICIJ built a Neo4j plug-in into Datashare because entity lists alone did not show the connections. Source: [ICIJ](https://www.icij.org/inside-icij/2024/02/datashares-new-plug-in-helps-investigative-journalists-connect-the-dots-with-graphs/).

**For ADP:** a diagram whose element and relation types are fixed by the domain (requirement, test, *verifies*) is exactly what these people improvise in a spreadsheet.

## 2. The format buries the one thing that mattered

A generic container (slides, templated notes, themes) imposes its own structure, and the critical signal ends up nested, truncated or drowned.

- **Space engineering.** The Columbia foam-strike assessment reached managers as a slide with 11 phrases across six levels of bullets. The key caveat, that the test foam was hundreds of times smaller than the real strike, sat at the bottom. The accident board concluded slides were unsuitable for engineering reporting. Sources: [Edward Tufte](https://www.edwardtufte.com/notebook/columbia-accident-investigation-board-the-boeing-powerpoint-slide/), ["The slide that killed seven people"](https://mcdreeamiemusings.com/blog/2019/4/13/gsux1h6bnt8lqjd7w2t2mtvfg81uhx).
- **Clinical care.** Clinicians complain of "note bloat": templates and copied blocks hide what matters, and after reading the chart they still do not know who the patient is. A JAMIA study found clinicians overdocument partly to pull information scattered across EHR screens into one place they can think from. Sources: [JAMIA 2023](https://academic.oup.com/jamia/article/30/5/797/7076268), [Addressing Note Bloat](https://pmc.ncbi.nlm.nih.gov/articles/PMC11852943/), [AMA Journal of Ethics](https://journalofethics.ama-assn.org/article/how-teach-good-ehr-documentation-and-deflate-bloated-chart-notes/2025-11).
- **UX research.** Synthesis into a handful of themes oversimplifies; nuance and individual needs are lost, and what survives ends up "buried in Slack threads and forgotten slide decks". Sources: [UXtweak](https://blog.uxtweak.com/ux-research-synthesis/), [Great Question](https://greatquestion.co/blog/ux-research-repository-guide).

**For ADP:** a designer can give the critical fields a fixed, prominent place, so a caveat cannot sink to bullet level six.

## 3. The "why" evaporates after the decision

Decisions are made in meetings, chats and workshops. The outcome survives in some form; the reasoning, the alternatives and the people's views do not.

- **Software architecture.** "Six months later someone asks why we did it this way", and nobody knows. Lost context leads to confident rewrites and slow onboarding. Even teams that adopt decision records report they get written and never read. Sources: [Capturing the Why](https://tomasjurasek.substack.com/p/architecture-decision-records-capturing), [Java Code Geeks](https://www.javacodegeeks.com/2026/05/the-reason-most-architecture-decision-records-get-written-and-never-read-is-architectural-not-cultural.html), [Ten ADR mistakes](https://ozimmer.ch/practices/2026/09/12/ADRMistakes.html).
- **Meetings.** Figures quoted widely (vendor-reported, treat with care): about two thirds of meetings end without documented action items and most content is forgotten within a day, leading to re-debated decisions. Sources: [MeetingToll](https://www.meetingtoll.com/blog/meeting-follow-ups-action-items-forgotten), [IdeaLift, decision decay](https://idealift.app/blog/49-state-of-decision-decay-2026).
- **Workshops.** A 25-person cross-organisation Miro workshop lost many sticky notes later that day: "just wasted 3 hours of valuable project time". Facilitators are told to back up boards during breaks. Source: [Miro community](https://community.miro.com/ask-the-community-45/sticky-notes-disappeared-lost-content-2990).
- **Technology assessment.** In participatory and constructive technology assessment, meeting minutes tend to capture one facet of the stakeholders' points of view rather than the spread of visions, and early stakeholders struggle to form views without concrete applications to react to. Sources: [Participatory TA, problems and directions](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3510418/), [EASST Review on CTA](https://easst.net/article/constructive-technology-assessment-sts-for-and-with-technology-actors/).

**For ADP:** text-first editors that keep the decision, its options and its rationale in a file next to the work, so the structure survives the meeting and diffs like code.

## 4. Generic canvases grow into unreadable hairballs

When the tool imposes no structure, people draw everything, and the result is as hard to read as the reality it models.

- **Military strategy.** The 2009 "Afghanistan Stability / COIN Dynamics" causal loop diagram drew General McChrystal's remark: "When we understand that slide, we'll have won the war." System dynamics practitioners replied that the method was fine; the presentation, one giant slide, was not. Sources: [Scholarly Kitchen](https://scholarlykitchen.sspnet.org/2010/05/19/get-the-picture-powerpoint-systems-dynamics-the-military-and-the-new-york-times/), [SD wise rebuttal](http://sdwise.com/2013/07/hey-new-york-times-a-causal-loop-diagram-is-not-a-powerpoint-fail/).
- **Public policy.** Systems maps of wicked problems become "spaghetti" webs, as unnavigable as the territory; the belief that "completeness equals comprehension" is named as the trap. Source: [SystemsWiki](https://systemswiki.substack.com/p/the-polycrisis-top-10-wicked-problems).
- **Personal knowledge.** A recurring Obsidian forum line: the graph view "looks great but is useless". Users of Logseq and Roam call their graphs "almost useless" except as a display. Sources: [Obsidian forum](https://forum.obsidian.md/t/you-all-say-the-graph-is-useless-let-me-show-you-how-to-use-it/116738), [Roam vs Logseq vs Obsidian](https://medium.com/alvistor/comparing-roamresearch-graph-view-with-logseq-and-obsidian-b0c1fd51c2ee).
- **Mind mapping.** Large generated mind maps open at 3% zoom with no readable text; users ask for collapsing and fit-to-content. Source: [SolomindLM issue #171](https://github.com/samintisar/SolomindLM/issues/171).

**For ADP:** this argues for focus, filtering and progressive disclosure (unfold one loop at a time, as Kumu does) as first-class diagram features rather than for bigger canvases.

## 5. Tools store material but do not help reason about it

People have somewhere to put things. What they lack is help with the step after: comparing, prioritising, spotting contradictions.

- **Qualitative research.** NVivo is described as slow and unintuitive; projects become "messy, bloated, and hard to interpret", and it "helped count themes but didn't prioritize them". A researcher's blog is titled "The pains of qualitative analysis with NVivo". Sources: [UserCall](https://www.usercall.co/post/nvivo-software-for-qualitative-research-what-it-does-well-where-it-struggles-and-how-teams-actually-use-it), [LonM's blog](https://lonm.vivaldi.net/2022/07/13/the-pains-of-qualitative-analysis-with-nvivo/).
- **Research repositories.** Dovetail, Condens, Marvin and similar are called "fundamentally passive storage"; synthesis stays the researcher's bottleneck. Source: [User Intuition](https://www.userintuition.ai/reference-guides/ux-research-repository-guide/).
- **Product management.** Feedback is spread over Slack, tickets, surveys, call notes and spreadsheets; product managers report spending 30 to 40% of their time gathering and synthesising it, and patterns stay invisible because nobody sees it side by side. Sources: [BuildBetter](https://blog.buildbetter.ai/how-to-consolidate-customer-feedback-slack-support-surveys/), [airfocus](https://airfocus.com/blog/customer-feedback-product-decisions//).
- **Academic literature.** Synthesising across papers is "a task largely left to users with minimal support"; it is hard to keep track of information scattered across papers or to know one's progress. Sources: [VitaLITy (arXiv)](https://arxiv.org/pdf/2108.03366), [Relatedly (arXiv)](https://arxiv.org/pdf/2302.06754).
- **Fiction writing.** Writers ask how to keep track of subplots across a novel. Scrivener's labels and collections isolate threads but do not show inconsistencies; many fall back to walls of sticky notes, and tools like Plottr exist to fill the gap. Sources: [Literature & Latte forum](https://forum.literatureandlatte.com/t/how-do-you-keep-track-of-sub-plots-in-a-book/140479), [Writers in the Storm](https://writersinthestormblog.com/2021/09/scrivener-or-plottr-how-to-outline-your-novel/).
- **Note-taking.** Hacker News threads ("Tired of note-taking apps", "Do notes apps help?") recur: widespread dissatisfaction, and a view that the value lies in writing, not in the pile of notes afterwards. Sources: [HN: Tired of note-taking apps](https://news.ycombinator.com/item?id=23888799), [HN: Do notes apps help?](https://news.ycombinator.com/item?id=36676153), [HN: tools for thought retrospective](https://news.ycombinator.com/item?id=40360606).

**For ADP:** a specialised view earns its keep by doing the comparison: a matrix that highlights conflicts, a timeline that shows gaps, a plot board that flags a character in two places at once.

## 6. Uncertainty and conflict have no place to live

Tools record conclusions. The evidence for and against, how sure someone is, and the competing explanations get flattened into one answer.

- **Intelligence analysis.** Analysis of Competing Hypotheses is usually run in a spreadsheet matrix. Studies found trained analysts skip steps, the method gives no way to update beliefs as evidence changes, and it is fixed to one point in time. Sources: [Dhami et al. 2019](https://onlinelibrary.wiley.com/doi/full/10.1002/acp.3550), [Wikipedia](https://en.wikipedia.org/wiki/Analysis_of_competing_hypotheses).
- **Genealogy.** A long-running split between "conclusion-based" software (one birth date per person) and "evidence-based" software that can hold conflicting sources with a confidence rating. Most mainstream tools are the former. Sources: [Planting the Seeds](https://michaelhait.wordpress.com/category/genealogy-software/), [Tucker, BYU FHTW 2008](https://fhtw.byu.edu/conf/2008/tucker-10-fhtw2008.pdf).
- **Incident review.** Postmortem templates with a single "root cause" field and five-whys chains force a linear story onto failures that come from several interacting conditions. Sources: [OneUptime](https://oneuptime.com/blog/post/2026-07-31-root-cause-vs-contributing-factors/view), [incident.io](https://incident.io/blog/sre-incident-postmortem-best-practices).
- **Argumentation.** Argument-mapping tools (Rationale, Kialo) are rarely used. Reasons given: people do not know them, maps lack quality content, and they read worse than prose. Source: [LessWrong / EA Forum](https://www.lesswrong.com/posts/bHXpbf6jXc4bgyrrp/why-is-argument-mapping-not-more-common-in-ea-rationality).

**For ADP:** the assessment use case: a hypothesis and evidence matrix or a contributing-factor diagram with confidence as a property of each relation. The argument-mapping failure is a warning that the text view must stay pleasant to read.

## 7. Agent work arrives as transcripts nobody can review

The newest variant. AI agents produce more than people can follow, in a shape made for a terminal.

- **Software teams.** "A terminal transcript is not a review artifact"; chat logs cannot be reused or compared against the final diff. Developers describe drowning in agent pull requests and verbose output on simple changes. Sources: [DEV Community](https://dev.to/speccoding/your-ai-agents-ship-code-faster-than-you-can-review-it-heres-the-workflow-that-fixes-that-4ied), [Builder.io](https://www.builder.io/blog/developers-drowning-in-ai-prs), [fullsend-ai issue #370](https://github.com/fullsend-ai/agents/issues/370).

**For ADP:** the human and agent collaboration use case: a structured view of what an agent decided, checked and changed, readable by both sides, instead of a scroll of text.

## What the complaints have in common

- **People improvise structure in the wrong tool.** Spreadsheets, slides, sticky notes and walls of paper are the workaround in almost every domain. The person knows the shape of the problem; the tool cannot hold it.
- **Specialised tools appear per domain, and each reinvents the same basics.** Litigation timelines, plot boards, traceability tools, ACH matrices and causal-loop editors each rebuild elements, relations, filtering and history from scratch.
- **Completeness does not equal clarity.** Both the tree-shaped tools and the free canvases fail; what works is a fixed vocabulary for the domain plus ways to focus.
- **The reasoning is the part that gets lost.** Rationale, alternatives, confidence and dissent are the first things a generic format drops.
- **Text still matters.** Argument maps and graph views lose to prose on readability. The complaints favour a view that pairs a readable text form with the visual one, rather than replacing it.
