const fs = require('fs');

let clientCode = fs.readFileSync('packages/sdk/src/client.ts', 'utf8');

// 1. Add _put
clientCode = clientCode.replace(
  /  \/\*\* \@internal \*\/\n  _patch<T>\(path: string, body\?: unknown, opts\?: RequestOptions\) \{\n    return this\._request<T>\("PATCH", path, body, opts\);\n  \}/,
  "  /** @internal */\n  _patch<T>(path: string, body?: unknown, opts?: RequestOptions) {\n    return this._request<T>(\"PATCH\", path, body, opts);\n  }\n  /** @internal */\n  _put<T>(path: string, body?: unknown, opts?: RequestOptions) {\n    return this._request<T>(\"PUT\", path, body, opts);\n  }"
);

// 2. Remove TenantsResourceListResponse and list() method
clientCode = clientCode.replace(
  /export type TenantsResourceListResponse[^\n]+\n/,
  ''
);

clientCode = clientCode.replace(
  /  list\(opts\?: RequestOptions\) \{\n    return this\.client\._get<TenantsResourceListResponse>\("\/tenants", opts\);\n  \}\n/,
  ''
);

fs.writeFileSync('packages/sdk/src/client.ts', clientCode, 'utf8');

console.log('Fixes applied.');
