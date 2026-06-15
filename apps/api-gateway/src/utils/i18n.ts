// @ts-nocheck -- Zod v4 CI type compat
/**
 * Internal i18n utility to traverse arbitrary objects and flatten `_i18n` suffixes.
 * E.g., `name_i18n: { pt: "CÃ£o", en: "Dog" }` becomes `name: "CÃ£o"` if locale="pt".
 */
export const flattenI18n = <T>(obj: T, locale: string): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => flattenI18n(item, locale));
  }

  if (typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.endsWith("_i18n") && typeof value === "object" && value !== null) {
        // Find the matching locale, or fallback to the first locale found, or keep raw if missing
        const newKey = key.replace(/_i18n$/, "");
        const matchedStr = value[locale] ?? Object.values(value)[0] ?? undefined;
        if (matchedStr !== undefined) {
          result[newKey] = matchedStr;
        } else {
          result[key] = value; // fallback
        }
      } else {
        result[key] = flattenI18n(value, locale);
      }
    }
    return result;
  }

  return obj;
};

