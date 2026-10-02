# Cube Gallery

A gallery I designed myself, with a twist of gameplay. Explore, play, and discover it now.

## Run locally

```bash
npm install
npm run dev
```

## Use the gallery

- Drag the cube to turn a face or orbit the view.
- Click the cube, or choose **Open cube**, to unfold the six faces into a gallery plane.
- Select any empty pocket to upload an image. Select a filled pocket to view it, or use its remove control to replace it later.
- Uploaded images are saved as files in `public/gallery/`, indexed by `public/gallery/manifest.json`, and appear on their matching cube stickers.
- Keep the `public/gallery/` files and manifest when sharing or committing the project; Vite includes them in the production build.

Uploads and removals write to the local project through the Vite development server, so run `npm run dev` while editing the gallery. A built/static deployment can display bundled gallery images but needs a writable server to accept new uploads.

## Technology

- React and Vite
- React Three Fiber and Three.js
- IndexedDB for local image storage