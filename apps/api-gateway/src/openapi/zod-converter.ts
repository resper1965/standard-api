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

      case "nullable": {
        const inner = convertZodToOpenApi(def.innerType);
        result = { ...inner };
        // In OpenAPI 3.0, nullable MUST be used with type. If there's no type (e.g. z.any()), it already allows null.
        if (result.type) {
          result.nullable = true;
        }
        break;
      }

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

      case "intersection":
        result.allOf = [
          convertZodToOpenApi(def.left),
          convertZodToOpenApi(def.right),
        ];
        break;

      case "effects":
        return convertZodToOpenApi(def.schema);

      case "lazy":
        return convertZodToOpenApi(def.getter());

      case "literal": {
        const litVal =
          def.value !== undefined
            ? def.value
            : def.values && def.values.length > 0
              ? def.values[0]
              : null;
        if (litVal === null) {
          result.nullable = true;
          // Do not emit type="string" and enum=[null] as that violates OAS 3.0 type constraints
        } else {
          result.type = typeof litVal;
          result.enum = [litVal];
        }
        break;
      }

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

  if (result.nullable === true && !result.type) {
    delete result.nullable;
  }

  return result;
}
