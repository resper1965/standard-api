const extensionPattern = /\.([a-z0-9]+)$/i;

export const sanitizeFilename = (filename: string): string =>
  filename
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\.+/g, ".")
    .replace(/^\.*/, "")
    .slice(0, 120)
    .toLowerCase() || "document";

export const getExtension = (filename: string): string => {
  const match = filename.match(extensionPattern);
  return match?.[1]?.toLowerCase() ?? "";
};

export const buildStorageKey = (input: {
  organizationId: string;
  assessmentId: string;
  documentId: string;
  safeFilename: string;
}): string =>
  `tenants/${input.organizationId}/organizations/${input.organizationId}/assessments/${input.assessmentId}/documents/${input.documentId}/${input.safeFilename}`;
