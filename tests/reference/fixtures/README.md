# Reference test fixtures

These folders hold copies of the DEDL source for the unit tests and for development builds of the reference. They are never published: the published reference is built only from the snapshots under `src/content/reference/`, which `npm run reference:refresh` writes.

- `dedl-aaef333/dedl/0.1/` is `specifications/dedl/` of `etalii-adp/etalii.adp` at revision `aaef3334992b1b70bc6728b793d2f63bb71a40cb`, byte for byte (`.gitattributes` keeps git from converting its line endings). Its `source.json` has the licence `NOASSERTION`, because the source repository has no licence yet.

A development build reads a fixture instead of the snapshots when `REFERENCE_CONTENT_DIR` points at it:

```powershell
$env:REFERENCE_CONTENT_DIR = 'tests/reference/fixtures/dedl-aaef333'; npm run build
```
