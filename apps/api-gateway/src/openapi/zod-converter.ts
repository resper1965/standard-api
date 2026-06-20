export function convertZodToOpenApi(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;

  // If it's a Zod schema with 'def'
  if (schema.def) {
    const def = schema.def;
    let result: any = {};

    switch (def.type) {
      case "object": {
        result.type = "object";
        result.properties = {};
        const required: string[] = [];

        if (def.shape) {
          for (const [key, propSchema] of Object.entries(def.shape)) {
            const convertedProp = convertZodToOpenApi(propSchema);
            // Handle optional
            if (
              (propSchema as any).def?.type === "optional" ||
              (propSchema as any).def?.type === "default"
            ) {
              // Not required
            } else {
              required.push(key);
            }
            result.properties[key] = convertedProp;
          }
        }
        if (required.length > 0) result.required = required;
        break;
      }

      case "string":
        result.type = "string";
        if (def.checks) {
          for (const check of def.checks) {
            if (check.kind === "format" || check.format) {
              result.format = check.format || check.kind;
            } else if (check.kind === "uuid") {
              result.format = "uuid";
            } else if (check.kind === "email") {
              result.format = "email";
            }
          }
        }
        break;

      case "enum":
        result.type = "string";
        result.enum = Array.isArray(def.entries)
          ? def.entries
          : Object.keys(def.entries || {});
        break;

      case "optional":
        return convertZodToOpenApi(def.innerType);

      case "ZodArray": {
        const itemType = convertZodToOpenApi({ def: def.type });
        result = { type: "array", items: itemType };
        break;
      }

      case "array":
        result.type = "array";
        result.items = convertZodToOpenApi(def.element || def.type);
        break;

      case "nullable":
        result = convertZodToOpenApi(def.innerType);
        result.nullable = true;
        break;

      case "number":
        result.type = "number";
        if (def.checks) {
          for (const check of def.checks) {
            if (check.kind === "min" || check.minValue !== undefined)
              result.minimum = check.value ?? check.minValue;
            if (check.kind === "max" || check.maxValue !== undefined)
              result.maximum = check.value ?? check.maxValue;
          }
        }
        break;

      case "default":
        result = convertZodToOpenApi(def.innerType);
        result.default =
          def.defaultValue !== undefined ? def.defaultValue : def.value;
        break;

      case "record":
        result.type = "object";
        result.additionalProperties = convertZodToOpenApi(
          def.valueType || def.element,
        );
        break;

      case "union":
        result.oneOf = (def.options || []).map(convertZodToOpenApi);
        break;

      case "boolean":
        result.type = "boolean";
        break;

      case "any":
      case "unknown":
        result = {};
        break;

      case "date":
        result.type = "string";
        result.format = "date-time";
        break;

      default:
        // fallback
        result.type = def.type;
        break;
    }
    return result;
  }

  // If it's a regular object, traverse it
  if (Array.isArray(schema)) {
    return schema.map((s) => convertZodToOpenApi(s));
  }

  const result: any = {};
  for (const [key, value] of Object.entries(schema)) {
    result[key] = convertZodToOpenApi(value);
  }
  return result;
}
