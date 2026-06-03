import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "Standard",
      description:
        "Documentation for the Standard SCF-Based Assessment Platform — security, compliance, and maturity assessments powered by AI agents.",
      logo: {
        dark: "./src/assets/logo-dark.svg",
        light: "./src/assets/logo-light.svg",
        replacesTitle: false,
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/resper1965/standard-api",
        },
      ],
      favicon: "/favicon.svg",
      head: [
        {
          tag: "link",
          attrs: {
            rel: "preconnect",
            href: "https://fonts.googleapis.com",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "preconnect",
            href: "https://fonts.gstatic.com",
            crossorigin: "",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
          },
        },
      ],
      customCss: ["./src/styles/custom.css"],
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
      },
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Quick Start", slug: "getting-started" },
            { label: "Authentication", slug: "api/authentication" },
          ],
        },
        {
          label: "Architecture",
          collapsed: false,
          autogenerate: { directory: "architecture" },
        },
        {
          label: "API Reference",
          collapsed: false,
          items: [
            { label: "API Guide", slug: "api/guide" },
            { label: "API Reference", slug: "api/api-reference" },
            { label: "Public API Guidelines", slug: "api/public-api-guidelines" },
            { label: "Cookbook", slug: "api/cookbook" },
          ],
        },
        {
          label: "Integrations",
          items: [
            { label: "B2B Integration", slug: "api/b2b-integration-guide" },
            { label: "MCP Integration", slug: "api/mcp-integration-guide" },
            { label: "Privacy & ROPA SDK", slug: "api/privacy-ropa-sdk" },
          ],
        },
        {
          label: "Agents",
          collapsed: true,
          autogenerate: { directory: "agents" },
        },
        {
          label: "Decisions (ADR)",
          collapsed: true,
          autogenerate: { directory: "decisions" },
        },
        {
          label: "Security",
          collapsed: true,
          autogenerate: { directory: "security" },
        },
        {
          label: "Guides",
          collapsed: true,
          autogenerate: { directory: "guides" },
        },
        {
          label: "Operations",
          collapsed: true,
          items: [
            {
              label: "Runbooks",
              autogenerate: { directory: "runbooks" },
            },
            {
              label: "Releases",
              autogenerate: { directory: "releases" },
            },
          ],
        },
      ],
      editLink: {
        baseUrl:
          "https://github.com/resper1965/standard-api/edit/main/docs/",
      },
      lastUpdated: true,
    }),
  ],
});
