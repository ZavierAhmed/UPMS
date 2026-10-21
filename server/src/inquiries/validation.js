export const categories = Object.freeze({
  buckets: "Plastic Buckets",
  cans: "Lubricant Cans",
  jars: "Plastic Jars",
  containers: "Industrial Containers",
  custom: "Custom Packaging",
});
export const fields = [
  "customerName",
  "companyName",
  "email",
  "phone",
  "productCategory",
  "quantity",
  "capacity",
  "message",
  "website",
];
export function isEmail(value) {
  if (value.length > 254 || /[\s<>\x00-\x1f\x7f-\x9f]/.test(value))
    return false;
  const split = value.lastIndexOf("@");
  if (split <= 0 || split === value.length - 1) return false;
  const local = value.slice(0, split),
    domain = value.slice(split + 1);
  const quoted = /^"(?:[^"\\]|\\.)+"$/.test(local);
  if (
    !quoted &&
    (/[()\[\],:;@"\\]/.test(local) ||
      local.startsWith(".") ||
      local.includes(".."))
  )
    return false;
  return (
    !/[()\[\],:;@"\\]/.test(domain) &&
    !domain.startsWith(".") &&
    !domain.includes("..")
  );
}
export function normalize(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("invalid");
  const result = {};
  // System.Text.Json Web property matching is case insensitive; ignore unknown fields.
  for (const field of fields) {
    const key = Object.keys(value).findLast(
      (k) => k.toLowerCase() === field.toLowerCase(),
    );
    const v = key === undefined ? "" : value[key];
    if (v !== null && typeof v !== "string") throw new Error("invalid");
    result[field] = (v || "").trim();
  }
  return result;
}
export function validate(request) {
  const errors = {};
  for (const [key, min, max] of [
    ["customerName", 1, 100],
    ["companyName", 0, 150],
    ["email", 1, 254],
    ["phone", 1, 40],
    ["productCategory", 1, 30],
    ["quantity", 0, 80],
    ["capacity", 0, 80],
    ["message", 10, 4000],
  ]) {
    const value = request[key];
    if (value.length < min) errors[key] = ["Please complete this field."];
    else if (value.length > max)
      errors[key] = [`Use no more than ${max} characters.`];
    else if (
      (key === "message"
        ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/
        : /[\x00-\x1f\x7f-\x9f]/
      ).test(value)
    )
      errors[key] = ["Remove unsupported control characters."];
  }
  if (!errors.email && !isEmail(request.email))
    errors.email = ["Enter a valid email address."];
  const digits = (request.phone.match(/[0-9]/g) || []).length;
  if (
    !errors.phone &&
    (!/^[0-9+().\-\s]+$/.test(request.phone) || digits < 7 || digits > 20)
  )
    errors.phone = [
      "Enter a phone number with 7–20 digits; spaces, +, -, dots and parentheses are allowed.",
    ];
  if (!Object.hasOwn(categories, request.productCategory))
    errors.productCategory = ["Choose a listed product category."];
  if (request.message.length > 0 && request.message.length < 10)
    errors.message = [
      "Include at least 10 characters about your packaging requirements.",
    ];
  return errors;
}
