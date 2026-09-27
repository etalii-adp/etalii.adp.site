# Screenshots

The images the root readme shows, and how each was taken (a test copy of the standalone readme's format).

## The shared setup, for every image

- **Source material**: only documents from `src/examples/` appear in any image.
- **Browser**: headless Chrome, viewport **1600×900 CSS px, device pixel ratio 1, 100% zoom**, full-viewport crop, no browser chrome.
- **Theme**: the app's default (dark). Nothing toggled.
- **Known artefact of that**: a build that bypassed the sign-in renders a quiet `developer
  session` marker at the right-hand end of the header, which a user of a release build never
  sees. To retake without it, start the backend with
  `LocalAuthenticator__DeveloperSessionDisabled=true` and let the script sign in.
- **Format and budget**: PNG; each image ≤ 300 KB, the workspace overview ≤ 1 MB.

The whole procedure is executable: [`capture.mjs`](capture.mjs).

## The images

| Image | Document opened | What must be visible |
|---|---|---|
| `workspace.png` | `diagrams/c4/industrial-plant/architecture/` → `bottling-mes.mes-containers.adp` | The whole workspace in one shot: explorer expanded to the document, the container diagram rendered in its tab. Nothing selected. |
| `mindmap.png` | `diagrams/mindmap/example 1/` → `mindmap.mm` → `mindmap.adp` | The mindmap laid out left-to-right in its tab; Toolbox showing the Node entry. Nothing selected. |
| `timeline.png` | `diagrams/timeline/example-2/` → `roadmap.tml` → `roadmap.adp` | Periods and moments on rows, the year ruler along the bottom, connections drawn. Nothing selected. |
| `wardley-map.png` | `diagrams/wardley-map/example 1/` → `tea.owm` → `tea.adp` | The bounded map: both axes labelled, the four evolution bands named along the bottom. Nothing selected. |

Each diagram capture clicks **Fit to View** after opening.
