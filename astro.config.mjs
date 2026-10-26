import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";

export default defineConfig({
  output: "server",
  adapter: cloudflare({ imageService: "passthrough" }),
  integrations: [react()],
  // This site does not use Astro sessions; false removes the unused KV binding so deployment needs no extra setup.
  session: false,
  site: "https://chernet-tariku.com",
});
