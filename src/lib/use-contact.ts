import { useSyncExternalStore } from "react";
import {
  formatWhatsAppDisplay,
  getContactConfig,
  getWhatsAppNumber,
  getWhatsAppUrl,
  subscribeContact,
  whatsappLink,
} from "@/lib/contact";

export function useContact() {
  const config = useSyncExternalStore(subscribeContact, getContactConfig, getContactConfig);
  return {
    whatsappNumber: config.whatsappNumber || getWhatsAppNumber(),
    whatsappDisplay: config.whatsappDisplay || formatWhatsAppDisplay(getWhatsAppNumber()),
    whatsappUrl: getWhatsAppUrl(),
    whatsappLink,
  };
}