import stickerIllustration from "../assets/products/stickers-illustration.svg";
import cartonIllustration from "../assets/products/cartons-illustration.svg";
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
    id: "stickers", title: "Stickers", group: "Labels & Cartons",
    text: "Stickers and labels for product packaging and brand presentation. Share your artwork, dimensions and quantity requirements.",
    image: stickerIllustration, alt: "Illustration of a packaging-label roll and arranged label shapes with orange accents",
    imageCaption: "Illustrative image only. Actual product photographs will be added when supplied.", capacities: [],
    capacityNote: "Share your size, material and finish preferences for discussion; availability and suitability must be confirmed.",
    description: "Discuss sticker and label requirements for your packaging, including dimensions, design references and intended application. Our team will review your brief before confirming any options.",
    uses: ["Product packaging labels", "Brand presentation requirements"],
    discussion: ["Required dimensions", "Artwork or logo", "Intended use", "Approximate quantity", "Any material or finish preference"],
    source: "Owner-approved category brief; temporary original illustration",
  },
  {
    id: "cartons", title: "Cartons", group: "Labels & Cartons",
    text: "Carton packaging for product presentation and handling. Discuss sizes, quantities and artwork requirements with our team.",
    image: cartonIllustration, alt: "Illustration of neatly arranged open and closed cardboard cartons with subtle orange tape",
    imageCaption: "Illustrative image only. Actual product photographs will be added when supplied.", capacities: [],
    capacityNote: "Discuss the dimensions and presentation your product needs. Specifications and suitability must be confirmed for your requirements.",
    description: "Explore carton packaging requirements based on your product, preferred dimensions and presentation needs. Share your brief so our team can discuss the appropriate next steps.",
    uses: ["Product presentation", "Handling and delivery requirements"],
    discussion: ["Product dimensions", "Carton size requirements", "Required quantity", "Printing or branding requirements", "Intended handling and delivery"],
    source: "Owner-approved category brief; temporary original illustration",
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
