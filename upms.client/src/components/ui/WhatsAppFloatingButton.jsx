import WhatsAppIcon from "./WhatsAppIcon";
import { buildWhatsAppLink, defaultWhatsAppMessage } from "../../utils/whatsapp";

export default function WhatsAppFloatingButton() {
  return (
    <a
      className="whatsapp-floating"
      href={buildWhatsAppLink(defaultWhatsAppMessage)}
      aria-label="Contact Unique Plastic Industry on WhatsApp"
      target="_blank"
      rel="noopener noreferrer"
    >
      <WhatsAppIcon />
    </a>
  );
}
