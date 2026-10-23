import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Creates the app icons in public/ from public/icon.svg.
// Run once with `npm run generate-icons` after changing the icon.
const background = { background: '#0F6E56' };

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: background },
    apple: { ...minimal2023Preset.apple, resizeOptions: background },
  },
  images: ['public/icon.svg'],
});
