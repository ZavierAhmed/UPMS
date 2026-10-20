import { company } from "../data/company";

export const defaultWhatsAppMessage = `Hello ${company.name}, I would like to know more about your plastic packaging products.`;
export function buildWhatsAppLink(message = "") {
  const base = `https://wa.me/${company.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
export function productWhatsAppMessage(title) {
  return `Hello ${company.name}, I am interested in your ${title}. Please share details about available sizes, minimum order quantity and pricing.`;
}
