import buckets from "../assets/products/buckets.jpg";
import cans from "../assets/products/cans.jpg";
import jars from "../assets/products/jars.jpg";
import containers from "../assets/products/containers.jpg";
export const company = {
  name: "Unique Plastic Industry",
  email: "uniqueplastic56@gmail.com",
  whatsappNumber: "923142113472",
  address: "F-260-A, S.I.T.E., Karachi, Pakistan",
  phones: [
    { label: "0342-2743901", href: "tel:+923422743901" },
    { label: "0314-2113472", href: "tel:+923142113472" },
  ],
  map: "https://www.google.com/maps/search/?api=1&query=F-260-A%2C%20S.I.T.E.%2C%20Karachi%2C%20Pakistan",
};
export const email =
  "mailto:uniqueplastic56@gmail.com?subject=Packaging%20inquiry";
export function productInquiry(title) {
  return `mailto:${company.email}?subject=${encodeURIComponent(`${title} inquiry`)}`;
}
export const navigation = [
  ["Home", "/"],
  ["About Us", "/about"],
  ["Products", "/products"],
  ["Manufacturing", "/manufacturing"],
  ["Industries We Serve", "/industries"],
  ["Contact", "/contact"],
];
export const products = [
  {
    id: "buckets",
    title: "Plastic Buckets",
    group: "Containers",
    text: "Plastic buckets for industrial and commercial packaging, with brochure sizes of 8L, 10L, 14L and 20L.",
    image: buckets,
    alt: "Orange and black plastic buckets with lids, from the company brochure",
    capacities: ["8L", "10L", "14L", "20L"],
    capacityNote:
      "Sizes illustrated in the brochure. Confirm the current options with our team.",
    description:
      "Our bucket range brings practical plastic packaging to industrial and commercial requirements. The brochure illustrates several sizes so you can start with the scale that suits your application.",
    uses: ["Industrial packaging", "Commercial packaging"],
    discussion: [
      "Required capacity and quantity",
      "Product to be packaged",
      "Lid and design requirements",
      "Delivery destination",
    ],
    source: "Brochure pages 2–3",
  },
  {
    id: "cans",
    title: "Lubricant Cans",
    group: "Containers",
    text: "Plastic can designs for lubricant packaging. Discuss the shape and packaging requirements of your product.",
    image: cans,
    alt: "A range of unbranded plastic lubricant cans shown in the company brochure",
    capacities: [],
    capacityNote:
      "Capacity specifications are available by inquiry; no verified capacity list is published for this category.",
    description:
      "The brochure shows a variety of plastic cans for lubricant packaging. We work with businesses to understand their product and packaging requirements before discussing an appropriate container.",
    uses: ["Lubricant packaging", "Oil packaging"],
    discussion: [
      "Product and handling requirements",
      "Preferred container design",
      "Required quantity",
      "Sampling and delivery needs",
    ],
    source: "Brochure page 3",
  },
  {
    id: "jars",
    title: "Plastic Jars",
    group: "Containers",
    text: "Smaller plastic packaging for commercial needs. Ask about the format that fits your application.",
    image: jars,
    alt: "Three small grey plastic containers pictured in the company brochure",
    capacities: [],
    capacityNote:
      "The brochure uses weight labels for the small containers. These are not treated as liquid capacities; confirm sizing with our team.",
    description:
      "Our smaller plastic containers provide another starting point for packaging discussions. Share your intended contents and size requirements so the team can help identify an appropriate option.",
    uses: ["Smaller-format packaging", "Commercial applications"],
    discussion: [
      "Contents and required volume",
      "Closure requirements",
      "Order quantity",
      "Sample requirements",
    ],
    source: "Brochure page 2",
  },
  {
    id: "containers",
    title: "Industrial Containers",
    group: "Containers",
    text: "Plastic containers for industrial and commercial applications, selected around your packaging needs.",
    image: containers,
    alt: "Grey, yellow and black buckets pictured together in the company brochure",
    capacities: [],
    capacityNote:
      "Dimensions and capacities depend on the selected design. Contact the team to confirm an appropriate format.",
    description:
      "Industrial packaging starts with understanding the product and its practical requirements. Our container capabilities include plastic buckets and other packaging formats shown in the brochure.",
    uses: ["Industrial applications", "Commercial packaging"],
    discussion: [
      "Application and contents",
      "Required packaging format",
      "Quantity and sampling",
      "Delivery arrangements",
    ],
    source: "Brochure page 5",
  },
  {
    id: "custom",
    title: "Custom Packaging",
    group: "Custom solutions",
    text: "Start with your brief. Explore tailored plastic molding and packaging designs with our team.",
    image: null,
    alt: null,
    capacities: [],
    capacityNote:
      "Design, sizing and feasibility are discussed for each project. No standard custom specification is claimed.",
    description:
      "Every business has its own packaging requirements. Our brochure describes a collaborative approach to tailored plastic molding, with design discussions shaped around product needs and brand requirements.",
    uses: ["Tailored plastic molding", "Brand-led packaging design"],
    discussion: [
      "A sketch, reference or packaging brief",
      "Contents and intended use",
      "Target dimensions and quantity",
      "Sample and timing requirements",
    ],
    source: "Brochure pages 3–4",
  },
];
export const features = [
  [
    "◇",
    "Quality Assurance",
    "From raw-material inspection to product samples, quality starts before your order.",
  ],
  [
    "⚙",
    "Modern Manufacturing",
    "Production technology focused on precision and consistent plastic products.",
  ],
  [
    "↗",
    "Custom Packaging Solutions",
    "A collaborative approach to your product needs and brand requirements.",
  ],
  [
    "→",
    "Efficient Delivery",
    "Delivery planning around your order and practical business requirements.",
  ],
  [
    "◎",
    "After-Sales Service",
    "Continued support with a focus on lasting customer relationships.",
  ],
];
export const industries = [
  "Lubricants & oils",
  "Chemicals",
  "Industrial & commercial packaging",
];
