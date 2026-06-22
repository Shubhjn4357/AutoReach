import * as ExpoContacts from "expo-contacts";
import { Contact, ContactField } from "expo-contacts";
import { getLocalLeads, createLocalLeadsBatch } from "../services/db";
import { Lead } from "../shared/types";

interface UseContactsOptions {
  showCustomAlert: (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error"
  ) => void;
  invalidateAll: () => Promise<void>;
}

export function useContacts({ showCustomAlert, invalidateAll }: UseContactsOptions) {
  const handleImportDeviceContacts = async () => {
    try {
      showCustomAlert("Syncing Contacts", "Checking permissions...", "info");
      const { status } = await ExpoContacts.requestPermissionsAsync();
      if (status !== "granted") {
        showCustomAlert(
          "Permission Denied",
          "AutoReach needs contacts permission to sync phone numbers.",
          "error"
        );
        return;
      }

      // New SDK 56 API: Contact.getAllDetails with ContactField enum
      const contactsList = await Contact.getAllDetails([
        ContactField.FULL_NAME,
        ContactField.PHONES,
        ContactField.EMAILS,
      ]);

      if (!contactsList || contactsList.length === 0) {
        showCustomAlert(
          "No Contacts Found",
          "No contacts fetched from your device.",
          "info"
        );
        return;
      }

      // Load current leads to check for duplicates
      const currentLeads = await getLocalLeads();
      const existingPhones = new Set(
        currentLeads
          .map((l) => l.phone?.replace(/[^0-9]/g, ""))
          .filter(Boolean)
      );
      const existingNames = new Set(
        currentLeads.map((l) => l.name.toLowerCase().trim())
      );

      const newLeadsToInsert: Lead[] = [];

      for (const contact of contactsList) {
        const name = contact.fullName || "";
        if (!name) continue;

        const phone = contact.phones?.[0]?.number || null;
        const email = contact.emails?.[0]?.address || null;

        // Skip if no phone number
        if (!phone) continue;

        const cleanPhone = phone.replace(/[^0-9]/g, "");

        // Deduplicate
        if (
          existingPhones.has(cleanPhone) ||
          existingNames.has(name.toLowerCase().trim())
        ) {
          continue;
        }

        const newLead: Lead = {
          id: `contact_${contact.id || Math.random().toString(36).substring(2, 10)}`,
          userId: "u_dev_user",
          name: name,
          email: email,
          phone: phone,
          status: "NEW",
          value: 0,
          notes: "Imported from device contacts.",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        newLeadsToInsert.push(newLead);
      }

      if (newLeadsToInsert.length > 0) {
        await createLocalLeadsBatch(newLeadsToInsert);
      }

      await invalidateAll();
      showCustomAlert(
        "Sync Completed",
        `Successfully imported ${newLeadsToInsert.length} new contacts from your device!`,
        "success"
      );
    } catch (err: any) {
      console.warn("Contact import error", err);
      showCustomAlert(
        "Import Error",
        err.message || "Could not fetch device contacts.",
        "error"
      );
    }
  };

  return {
    handleImportDeviceContacts,
  };
}
