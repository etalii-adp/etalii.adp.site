# Diagram Types

A test copy of the standalone catalogue's structure: an HTML table inside Markdown, with group headings in rows.

## Legend

| Icon | State | Meaning |
|---|---|---|
| 💡 | Identified | Recognized as a candidate diagram type; no spec yet |
| 📝 | Specified | A requirements/design spec exists |
| ⏸️ | To-do | Spec approved and queued for implementation |
| 🛠️ | Work-in-progress | Actively being implemented |
| ⚗️ | Prototype | Implemented as a working prototype |
| ✅ | Implemented | Shipped and usable in ADP |

---

<table>
  <thead>
    <tr><th>State</th><th>Origin</th><th>Diagram</th><th>Theory</th><th>Example</th></tr>
  </thead>
  <tbody>
    <tr><td colspan="5"><h3>1. UML — Unified Modeling Language</h3><p>Theory: <a href="https://www.omg.org/spec/UML/">OMG UML specification</a></p></td></tr>
    <tr><td colspan="5"><h4>1a. Structural diagrams</h4></td></tr>
    <tr><td style="white-space: nowrap;">💡&nbsp;Identified</td><td style="white-space: nowrap;"><code>uml/class</code></td><td>Class diagram</td><td><a href="https://www.uml-diagrams.org/class-diagrams-overview.html">uml-diagrams.org</a></td><td><a href="https://www.uml-diagrams.org/class-reference-uml-example.png">Example</a></td></tr>
    <tr><td colspan="5"><h3>2. The C4 Model</h3><p>Theory: <a href="https://c4model.com/">c4model.com</a></p></td></tr>
    <tr><td style="white-space: nowrap;">⚗️&nbsp;Prototype</td><td style="white-space: nowrap;"><code>c4/context</code></td><td>System Context</td><td><a href="https://c4model.com/diagrams/system-context">c4model.com</a></td><td>Everyone-facing overview</td></tr>
    <tr><td style="white-space: nowrap;">⚗️&nbsp;Prototype</td><td style="white-space: nowrap;"><code>c4/container</code></td><td>Container</td><td><a href="https://c4model.com/diagrams/container">c4model.com</a></td><td>Deployable/runnable units</td></tr>
    <tr><td style="white-space: nowrap;">📝&nbsp;Specified</td><td style="white-space: nowrap;"><code>c4/code</code></td><td>Code (optional)</td><td><a href="https://c4model.com/diagrams/code">c4model.com</a></td><td>Usually IDE-generated</td></tr>
    <tr><td colspan="5"><h3>9. Strategy &amp; landscape mapping</h3></td></tr>
    <tr><td style="white-space: nowrap;">✅&nbsp;Implemented</td><td style="white-space: nowrap;"><code>generic/timeline</code></td><td>Timeline diagram (<code>.tml</code> — Timeline Markup Language)</td><td>Distinct from <code>mermaid/gantt</code>: placement is authored on both axes</td><td>—</td></tr>
    <tr><td style="white-space: nowrap;">✅&nbsp;Implemented</td><td style="white-space: nowrap;"><code>generic/dependencies</code></td><td>Dependency graph (<code>.dgr</code>)</td><td>Follows the <code>generic/timeline</code> precedent</td><td>—</td></tr>
    <tr><td style="white-space: nowrap;">⚗️&nbsp;Prototype</td><td style="white-space: nowrap;"><code>azure-devops/pipeline</code></td><td>Azure DevOps pipeline diagram</td><td><a href="https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/">Azure Pipelines YAML schema</a> · <a href="https://learn.microsoft.com/en-us/azure/devops/pipelines/get-started/key-pipelines-concepts">Key pipelines concepts</a></td><td><a href="https://learn.microsoft.com/en-us/azure/devops/pipelines/process/stages">Stages, dependsOn and conditions</a></td></tr>
    <tr><td style="white-space: nowrap;">⚗️&nbsp;Prototype</td><td style="white-space: nowrap;"><code>wardley/map</code></td><td>Wardley Map</td><td><a href="https://learnwardleymapping.com/">learnwardleymapping.com</a></td><td><a href="https://onlinewardleymaps.com/">Online Wardley Maps editor</a></td></tr>
    <tr><td style="white-space: nowrap;">⚗️&nbsp;Prototype</td><td style="white-space: nowrap;"><code>etalii/functional-decomposition-graph</code></td><td>Functional decomposition graph (<code>.fdg</code>)</td><td>A notation defined by the user of this repository</td><td>—</td></tr>
    <tr><td style="white-space: nowrap;">🛠️&nbsp;Work-in-progress</td><td style="white-space: nowrap;"><code>gartner/hypecycle-graph</code></td><td>Gartner hype cycle graph</td><td><a href="https://en.wikipedia.org/wiki/Gartner_hype_cycle">Gartner hype cycle (Wikipedia)</a></td><td>—</td></tr>
    <tr><td colspan="5"><h3>10. Knowledge &amp; informal modeling</h3></td></tr>
    <tr><td style="white-space: nowrap;">⚗️&nbsp;Prototype</td><td style="white-space: nowrap;"><code>freeplane/mindmap</code></td><td>Mind map (radial/hierarchical, single central topic)</td><td><a href="https://www.freeplane.org/">Freeplane</a> · <code>.mm</code> file format</td><td><a href="https://www.freeplane.org/wiki/index.php/Gallery">Freeplane example maps</a></td></tr>
  </tbody>
</table>
