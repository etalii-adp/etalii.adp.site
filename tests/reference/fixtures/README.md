# Reference test fixtures

These folders hold copies of the DISL and DID sources, and of the DEDL source they replaced, for the unit tests, for development builds of the reference and for the check that the old DEDL addresses redirect. They are never published: the published reference is built only from the snapshots under `src/content/reference/`, which `npm run reference:refresh` writes.

- `disl-c2623d4/disl/0.1/` and `disl-c2623d4/did/0.1/` are `specifications/disl/` and `specifications/did/` of `etalii-adp/etalii.adp` at revision `c2623d4e3835a995520febd95ea39b545aa0a42d`, byte for byte, written by `refresh()` of `scripts/reference/refresh.ts` with `NOASSERTION` as the licence, as for DEDL. The CI reference build and the versioning fixture use them.
- `dedl-aaef333/dedl/0.1/` is `specifications/dedl/` of `etalii-adp/etalii.adp` at revision `aaef3334992b1b70bc6728b793d2f63bb71a40cb`, byte for byte (`.gitattributes` keeps git from converting its line endings). Its `source.json` has the licence `NOASSERTION`, because the source repository has no licence yet.

A development build reads a fixture instead of the snapshots when `REFERENCE_CONTENT_DIR` points at it:

```powershell
$env:REFERENCE_CONTENT_DIR = 'tests/reference/fixtures/dedl-aaef333'; npm run build
```
