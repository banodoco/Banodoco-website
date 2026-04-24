// WHY: Keep the author-facing prompt aligned with the server-enforced bundle allowlist.
const ALLOWED_EXTENSIONS = '.html .css .js .mjs .json .png .jpg .jpeg .webp .gif .svg .ico .mp4 .webm .mp3 .wav .woff .woff2 .ttf .otf .wasm';

export function buildAgentPrompt({ postTitle }: { postTitle: string }): string {
  return `Hard rules (enforced server-side - violating any of these rejects the upload):
- The zip must contain \`post.json\` and \`index.html\` at the root. Everything else is relative assets.
- Max 20 MB compressed, 20 MB uncompressed total, 10 MB per file, 500 entries, 50:1 expansion ratio ceiling.
- No \`..\`, absolute paths, or symlinks in the archive.
- File extensions limited to: ${ALLOWED_EXTENSIONS}.
- No server code. The bundle is static.
- Only same-origin fetches are allowed by default (CSP \`connect-src 'self'\`). If you need external endpoints, declare them in \`post.json.external_origins\` as an array of origin strings.
- The iframe sandbox grants \`allow-scripts\` only by default. Do not rely on form submission, top-navigation, or same-origin-with-parent.

Required \`post.json\` shape:
\`\`\`json
{
  "schemaVersion": 1,
  "title": "${postTitle}",
  "summary": "plain text, 0-200 chars, used for meta description and SEO",
  "entry": "index.html",
  "layout": {
    "mode": "inline-auto",          // or "inline-fixed" with "height": <px|string like 60vh>, or "fullscreen"
    "minHeight": 320,
    "maxHeight": 1600
  },
  "capabilities": {
    "scripts": true,
    "popups": false,                // set true only if you open new tabs
    "pointerLock": false            // set true only if you need pointer lock
  }
}
\`\`\`

If \`layout.mode === "inline-auto"\`, the host resizes the iframe to fit content. Your page MUST post a message to the parent whenever its height changes:
\`\`\`js
window.parent.postMessage({ type: 'banodoco:resize', v: 1, height: document.documentElement.scrollHeight }, '*');
\`\`\`
Fire this on load and on every content resize (use ResizeObserver on \`document.documentElement\`).

If \`layout.mode === "fullscreen"\`, the parent renders a thin chrome bar with a back button and creator attribution. Your content should treat the viewport (minus ~48px top bar) as its canvas.

Build flow:
1. Start from the official starter template — clone it as your working directory:
   \`gh repo clone banodoco/bundle-starter <project-dir>\` (or \`git clone https://github.com/banodoco/bundle-starter.git <project-dir>\`).
   It already contains a valid \`post.json\` and an \`index.html\` with the postMessage resize snippet baked in. Edit those rather than writing them from scratch.
2. Replace \`index.html\` with your content. Edit \`post.json\` (title, summary, layout, capabilities). Add any images, fonts, audio, or scripts alongside.
3. If you use a bundler (Vite/Next static/Parcel), build to \`dist/\` and zip from there. Otherwise zip the project directory directly.
4. Zip the *contents* (not the directory itself - \`post.json\` and \`index.html\` must be at the zip root): \`zip -r bundle.zip post.json index.html README.md\` (add any other files you've included).
5. Keep the zip under 20 MB.

Your output should be a runnable project directory the author can edit, build, and zip. Start by cloning banodoco/bundle-starter; do NOT write \`post.json\` or the resize snippet from scratch.

The author's ask: {{INSERT AUTHOR PROMPT HERE}}`;
}
