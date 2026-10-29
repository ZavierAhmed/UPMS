import {catalogGalleries} from "./catalog";
export const company = {
  name: "Unique Plastic Industry",
  email: "uniqueplastic56@gmail.com",
  whatsappNumber: "923142113472",
  // Company owner confirmed this premises address in W03.3.
  address: "F-260/A, Wali Road, Metroville, S.I.T.E., Karachi 75700, Pakistan",
  phones: [
    { label: "0314-2113472", href: "tel:+923142113472" },
  ],
  map: "https://maps.app.goo.gl/KJGy7zo7cQhsFwsF6",
  // Pin coordinates from the supplied destination, not its map viewport center.
  directions: "https://www.google.com/maps/dir/?api=1&destination=24.9054755%2C66.9876346",
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
    text: "Plastic buckets for industrial and commercial packaging, with brochure sizes of 8L, 10L, 16L and 20L.",
    image: catalogGalleries.buckets[0].src,
    alt: "Orange and black plastic buckets with lids, from the company brochure",
    capacities: ["8L", "10L", "16L", "20L"],
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
    source: "Bucket.pdf pages 1–2",
  },
  {
    id: "cans",
    title: "Lubricant Cans",
    group: "Containers",
    text: "Plastic can designs for lubricant packaging. Discuss the shape and packaging requirements of your product.",
    image: catalogGalleries.cans[0].src,
    alt: "A range of unbranded plastic lubricant cans shown in the company brochure",
    capacities: ["700ml", "1L", "3L", "4L", "5L"],
    capacityNote:
      "Designs and capacities shown in our company catalog. Contact us to confirm current sizes, colors and specifications.",
    description:
      "The brochure shows a variety of plastic cans for lubricant packaging. We work with businesses to understand their product and packaging requirements before discussing an appropriate container.",
    uses: ["Lubricant packaging", "Oil packaging"],
    discussion: [
      "Product and handling requirements",
      "Preferred container design",
      "Required quantity",
      "Sampling and delivery needs",
    ],
    source: "Company_Profile_New_HD_Bottles (1).pdf pages 2–25",
  },
  {
    id: "containers",
    title: "Plastic Cans",
    group: "Containers",
    text: "Jerrycan-style plastic containers in 20L and 30L designs shown in our company catalog.",
    image: catalogGalleries.containers[0].src,
    alt: "Grey, yellow and black buckets pictured together in the company brochure",
    capacities: ["20L", "30L"],
    capacityNote:
      "Dimensions and capacities depend on the selected design. Contact the team to confirm an appropriate format.",
    description:
      "Industrial packaging starts with understanding the product and its practical requirements. The new bucket catalog illustrates 20L and 30L jerrycan-style containers as a distinct packaging format.",
    uses: ["Industrial applications", "Commercial packaging"],
    discussion: [
      "Application and contents",
      "Required packaging format",
      "Quantity and sampling",
      "Delivery arrangements",
    ],
    source: "Bucket.pdf page 3",
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
].map(product=>{
 const gallery=product.id==='containers'?[...catalogGalleries.containers].reverse():catalogGalleries[product.id]||[];
 return {...product,gallery,catalogImage:gallery[0]||null,hoverImage:gallery[1]||null,image:gallery[0]?.src||product.image,alt:gallery[0]?.alt||product.alt};
});
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
