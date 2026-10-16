1. Build or copy the complete site into a temporary folder, preserving `deck/` and `assets/`.
2. From this repository, get the short commit hash to publish: `git rev-parse --short HEAD`.
3. Stamp the temporary copy and supply the public site base URL: `node tools/deck/stamp-versions.mjs /path/to/site-copy <hash> https://banodoco.github.io/Banodoco-website/`. Use the deployed site's base path, including any repository subpath and ending slash.
4. Review the stamped diff in that temporary folder; the source checkout remains unstamped.
5. The tool fills the Open Graph image placeholder with an absolute URL to `deck/mycelial-og.jpg` under that base, including the commit version query. The source HTML keeps a placeholder so it works on any deployment path.
6. The tool versions local deck HTML, JavaScript, CSS and URLs to files under `deck/` or `assets/`.
7. It covers script, stylesheet, image, video, poster and font references, including CSS `url()`.
8. Existing query parameters and fragments are preserved; an existing `v` value is replaced.
9. Run the tool again with the same hash if needed; repeated runs do not add duplicate `v` values.
10. Serve the stamped copy and verify it before release.
11. Publish that reviewed folder manually after owner approval; this tool never publishes or pushes.
