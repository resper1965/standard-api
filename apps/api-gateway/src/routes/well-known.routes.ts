import type { RouteDefinition } from "../http";

const SECURITY_TXT = `Contact: mailto:security@bekaa.eu
Expires: 2027-12-31T23:59:00.000Z
Preferred-Languages: en, pt
Canonical: https://standard.bekaa.eu/.well-known/security.txt
Policy: https://github.com/resper1965/standard-api/blob/main/SECURITY.md
`;

const ROBOTS_TXT = `User-agent: *
Disallow: /api/
Allow: /.well-known/
Allow: /health
`;

export const wellKnownRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/.well-known/security.txt",
    handler: async () => {
      return new Response(SECURITY_TXT, {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "public, max-age=86400",
        },
      });
    },
  },
  {
    method: "GET",
    path: "/security.txt",
    handler: async () => {
      return new Response(SECURITY_TXT, {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "public, max-age=86400",
        },
      });
    },
  },
  {
    method: "GET",
    path: "/robots.txt",
    handler: async () => {
      return new Response(ROBOTS_TXT, {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "public, max-age=86400",
        },
      });
    },
  },
];
