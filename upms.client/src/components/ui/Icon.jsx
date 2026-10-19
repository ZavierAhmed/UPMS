const paths = {
  "Quality Assurance": "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6ZM8 12l3 3 5-6",
  "Modern Manufacturing": "M3 21V10l6 3V7l6 4V3h5v18ZM7 17h1m4 0h1m4 0h1",
  "Custom Packaging Solutions":
    "m4 16 12-12 4 4L8 20H4Zm9-9 4 4M4 4l4 4m8 8 4 4",
  "Efficient Delivery":
    "M3 5h11v12H3ZM14 10h4l3 4v3h-7M8 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm12 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  "After-Sales Service":
    "M4 13v-1a8 8 0 0 1 16 0v5l-4 4h-4M4 12H2v6h4v-6Zm14 0h4v6h-4Z",
};
export default function Icon({ name }) {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
