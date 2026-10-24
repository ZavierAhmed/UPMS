import { company } from "./company";

export const pageMeta = {
  "/": {
    title: "Plastic Packaging Manufacturer in Karachi",
    description:
      "Unique Plastic Industry manufactures plastic buckets, lubricant cans, plastic cans and custom packaging in Karachi, Pakistan. Established in 2018.",
  },
  "/about": {
    title: "About Us",
    description:
      "Learn about Unique Plastic Industry, manufacturing plastic packaging in Karachi since 2018 with a focus on quality, customization and service.",
  },
  "/products": {
    title: "Plastic Packaging Products",
    description:
      "Explore plastic buckets, lubricant cans, plastic cans and custom packaging. Find a category and discuss your requirements.",
  },
  "/manufacturing": {
    title: "Plastic Molding & Manufacturing",
    description:
      "Explore our approach to plastic molding, raw-material checks, product samples, design, delivery and customer support.",
  },
  "/industries": {
    title: "Industries We Serve",
    description:
      "Plastic packaging for lubricants and oils, chemicals, and industrial or commercial applications. Discuss your packaging needs with Unique Plastic Industry.",
  },
  "/contact": {
    title: "Contact Us",
    description:
      `Contact ${company.name} in ${company.address}. Call 0342-2743901 or email uniqueplastic56@gmail.com for packaging inquiries.`,
  },
};
export const notFoundMeta = {
  title: "Page Not Found",
  description:
    "This page is not available. Explore Unique Plastic Industry products or contact our packaging team.",
};
export const values = [
  {
    title: "Quality from the beginning",
    text: "Raw-material inspection and product samples help establish requirements before an order moves forward.",
  },
  {
    title: "Ideas made practical",
    text: "We welcome design discussions and customization, taking time to understand what your packaging needs to do.",
  },
  {
    title: "Service that continues",
    text: "Dependable delivery planning and after-sales support are part of our approach to long-term customer care.",
  },
];
export const process = [
  {
    title: "Understand the requirement",
    text: "We begin with the product, packaging format and business requirements. References and design ideas help shape the conversation.",
  },
  {
    title: "Discuss design & molding",
    text: "Our capabilities cover plastic molding for buckets, lubricant cans, plastic cans and other containers, with tailored solutions discussed for each project.",
  },
  {
    title: "Check raw materials",
    text: "The brochure describes raw-material inspection as part of a quality-focused approach from the beginning of production.",
  },
  {
    title: "Review product samples",
    text: "Samples help customers assess the product before placing an order. Discuss the checks relevant to your intended application with our team.",
  },
  {
    title: "Plan production & delivery",
    text: "Modern manufacturing technology supports product consistency. Delivery arrangements are discussed around order requirements and practical feasibility.",
  },
  {
    title: "Continue the conversation",
    text: "After-sales service supports customer care beyond the initial order. Our team remains available to discuss packaging needs and future requirements.",
  },
];
export const industryDetails = [
  {
    id: "lubricants",
    title: "Lubricants & oils",
    intro: "Packaging shaped around the product and the way it is handled.",
    text: "Our brochure shows lubricant cans and plastic buckets for the lubricant sector. Share the product type, preferred container format and order requirements to explore a suitable starting point.",
    ids: ["cans", "buckets"],
    questions:
      "Discuss container format, required size, closure needs and sampling.",
  },
  {
    id: "chemicals",
    title: "Chemical packaging",
    intro: "Start with the contents. Discuss the packaging requirements.",
    text: "Chemical applications can have specific compatibility and handling requirements. Our plastic containers are a starting point for discussion; suitability must be confirmed for your particular contents and intended use.",
    ids: ["containers", "buckets"],
    questions:
      "Tell us about the contents, handling conditions and any application-specific checks you require.",
  },
  {
    id: "commercial",
    title: "Industrial & commercial applications",
    intro: "Flexible packaging conversations for different business needs.",
    text: "Buckets, smaller containers and tailored packaging offer options to explore for commercial and industrial products. We work with your brief rather than assuming a single format fits every application.",
    ids: ["buckets", "containers", "custom"],
    questions:
      "Share your product, packaging brief, target quantity and delivery requirements.",
  },
];
