import { products } from "../../data/company";
export const emptyInquiry = {
  customerName: "",
  companyName: "",
  email: "",
  phone: "",
  productCategory: "",
  quantity: "",
  capacity: "",
  message: "",
  website: "",
};
export function validateInquiry(input) {
  const errors = {};
  const required = {
    customerName: "Enter your name.",
    email: "Enter your email address.",
    phone: "Enter your phone number.",
    productCategory: "Choose a product category.",
    message: "Tell us about your packaging requirements.",
  };
  const limits = {
    customerName: 100,
    companyName: 150,
    email: 254,
    phone: 40,
    productCategory: 30,
    quantity: 80,
    capacity: 80,
    message: 4000,
  };
  for (const [name, max] of Object.entries(limits)) {
    const value = input[name].trim();
    if (required[name] && !value) errors[name] = required[name];
    else if (value.length > max)
      errors[name] = `Use no more than ${max} characters.`;
    else if (
      [...value].some((char) => {
        const code = char.charCodeAt(0);
        return (
          (code < 32 || (code >= 127 && code <= 159)) &&
          !(name === "message" && [9, 10, 13].includes(code))
        );
      })
    )
      errors[name] = "Remove unsupported control characters.";
  }
  if (
    input.email.trim() &&
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(input.email.trim())
  )
    errors.email = "Enter a valid email address.";
  const digits = input.phone.replace(/[^0-9]/g, "");
  if (
    input.phone.trim() &&
    (!/^[0-9+().\-\s]+$/.test(input.phone) ||
      digits.length < 7 ||
      digits.length > 20)
  )
    errors.phone = "Enter a phone number with 7–20 digits.";
  if (
    input.productCategory &&
    !products.some((p) => p.id === input.productCategory)
  )
    errors.productCategory = "Choose a listed product category.";
  if (input.message.trim() && input.message.trim().length < 10)
    errors.message = "Include at least 10 characters about your requirements.";
  return errors;
}
