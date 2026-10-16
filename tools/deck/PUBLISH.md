1. Build or copy the complete site into a temporary folder, preserving `deck/` and `assets/`.
2. From this repository, get the short commit hash to publish: `git rev-parse --short HEAD`.
3. Stamp the temporary copy: `node tools/deck/stamp-versions.mjs /path/to/site-copy <hash>`.
4. Review the stamped diff in that temporary folder; the source checkout remains unstamped.
5. The tool versions local deck HTML, JavaScript, CSS and URLs to files under `deck/` or `assets/`.
6. It covers script, stylesheet, image, video, poster and font references, including CSS `url()`.
7. Existing query parameters and fragments are preserved; an existing `v` value is replaced.
8. Run the tool again with the same hash if needed; repeated runs do not add duplicate `v` values.
9. Serve the stamped copy and verify it before release.
10. Publish that reviewed folder manually after owner approval; this tool never publishes or pushes.
