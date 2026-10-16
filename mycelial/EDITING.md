# Editing the deck

- **Copy:** The slide sections and their main narrative copy are in `index.html`, in order from slide 1 through slide 11. Search for the text you want to change. Some visuals and their labels are generated in the slide script named by the comments in the HTML.
- **Figures and links:** Slides 10–11's initiative data and links are in `flywheel.js`. Slide 8's illustrative people counter and timing are in `flowers.js`.
- **Slide 1 recipients:** Each `.vc-tile` has a `data-title` (`[Title] — [artist]`) and a `.vc-cap` caption (`[Title] · [artist]`). Replace both bracketed placeholders with the recipient title and artist; the captions are intentionally hidden while they remain placeholders.
- **Images and video:** Find the relevant `<img>` or `<video>` in the slide markup or its slide script. Change the image `src`, or the video's `data-src`, to the new file path. Set the video's `poster` to the still image to show before playback. Keep the files under `assets/` and use paths relative to the file that contains the reference.
- **Checks:** Start the local server with `PORT=8208 python3 serve.py` and run `node tools/deck/check-stress.mjs http://127.0.0.1:8208/mycelial/index.html`. Run `node tools/deck/check-firstload.mjs http://127.0.0.1:8208/mycelial/index.html` to check the first load.
- **Publish:** Follow [PUBLISH.md](../tools/deck/PUBLISH.md) to build a site copy, stamp its asset versions and set the absolute preview image URL for the deployment base.
