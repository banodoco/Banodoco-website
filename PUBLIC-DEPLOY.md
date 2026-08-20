# Public deployment boundary

Railway serves a generated directory, not the repository checkout. The public
classification is recorded in `deploy/public-files.json`; `tools/package-public.py`
is the only build step that populates that directory.

`tools/check.sh` exercises that packager on every safe aggregate check. It
verifies the exact allowlisted file set, representative required URLs,
forbidden paths, artifact-only `ORIGIN` substitution, a deployed revision
marker, and a byte-for-byte roundtrip against the source checkout after that
substitution.
`tools/release.sh` invokes that artifact/scene check once after the developer
aggregate and before commit, so the reviewed tree is verified through the same
packaging path that Railway runs after push; release does not perform a second
artifact build.

The allowlist contains the browser entry files and runtime trees for assets,
content, the journey, the organism, ownership, static captures/baked geometry,
and the locally hosted Three.js modules. `ownership/reasons.js` is generated
runtime data and is public even though lint correctly classifies it as generated.
The Three.js tree is public vendor code and remains excluded from application
lint/scanning.

Repository material is outside the boundary. In particular, `archive/`,
`journey-v6-plan/`, `docs/`, `tools/`, `deploy/`, `.desloppify/`, caches,
developer dependencies, capture `_check` output, and source artwork are not
copied. The capture comparison manifest is QA metadata and is omitted too.
Adding a new top-level runtime file or a new runtime file type requires
an intentional manifest change; the packager also verifies representative
required URLs and forbidden top-level paths.

To inspect the artifact locally without modifying the checkout:

```sh
artifact="$(mktemp -d /tmp/banodoco-public.XXXXXX)"
python3 tools/package-public.py "$artifact" \
  --origin https://www.banodoco.ai --revision "$(git rev-parse HEAD)"
(cd "$artifact" && PORT=8137 python3 serve.py)
```

Remove that temporary directory after inspection. Local source development is
unchanged: `python3 serve.py` still serves the repository checkout on port 8137.
Railway creates the same artifact with `RAILWAY_GIT_COMMIT_SHA`, normalizes tar
metadata, and serves `release-revision.txt`; the release poll requires that
marker to equal the exact pushed commit before reporting success.
