# Versioning Policy

Standard GRC guarantees non-breaking evolution of the `/api/v1/` REST API and Webhook event payload schema. 

## Semantic Rules
Standard follows a variation of Stripe's API versioning policy.

### Non-Breaking Changes (Backwards Compatible)
The following changes may be introduced to `/api/v1/` without bumping the API version:
- Adding new endpoints.
- Adding new optional request parameters to existing endpoints.
- Adding new properties to existing API responses.
- Adding new event types to Webhooks.
- Changing the order of properties in API responses.
- Changing the length or format of opaque strings (e.g., internal IDs, except where prefix constraints are explicitly documented).

**Important:** Your code must be resilient to new fields appearing in JSON responses. If you use strict parsers (e.g., `zod` without `.passthrough()`), ensure you do not break when new fields arrive.

### Breaking Changes
The following changes will result in a **new API version** (e.g., `/api/v2/`):
- Removing an endpoint.
- Removing or renaming a property in a JSON response.
- Changing the data type of a property in a JSON response.
- Making a previously optional request parameter mandatory.
- Changing the authentication or authorization mechanics.

## Sunsetting Endpoints
When an endpoint is marked for deprecation, it will be annotated in the OpenAPI specification as `deprecated: true`. 
Standard guarantees that the endpoint will remain functional for at least **90 days** from the deprecation notice.
Deprecation warnings may also be communicated via HTTP Headers (`Deprecation: true`).
