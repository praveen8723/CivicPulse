import { Building2, ExternalLink, Mail, Phone } from "lucide-react";
import { publicContacts, suggestedTrafficStation } from "@/lib/responsibility";
import { IssueCategory } from "@/types/civic";

export function OfficialContact({
  category,
  department,
  address,
}: {
  category: IssueCategory;
  department: string;
  address: string;
}) {
  const contact = publicContacts[category];
  const station =
    category === "Traffic Signal" || category === "Traffic / Congestion"
      ? suggestedTrafficStation(address)
      : undefined;
  return (
    <section
      className="panel official-contact"
      aria-labelledby="official-contact-title"
    >
      <div className="official-contact-heading">
        <span className="official-contact-icon">
          <Building2 size={23} />
        </span>
        <div>
          <span className="eyebrow">WHO HANDLES THIS ISSUE</span>
          <h2 id="official-contact-title">Responsible public office</h2>
        </div>
      </div>
      <div className="official-contact-grid">
        <div>
          <span className="official-contact-label">Likely authority</span>
          <strong>{contact.authority}</strong>
          <span className="official-contact-team">
            Relevant team: {contact.team}
          </span>
          <span className="official-contact-team">
            CivicPulse routing: {department}
          </span>
          {station && (
            <span className="official-contact-team">
              Suggested local contact: {station.name}
            </span>
          )}
        </div>
        <div>
          <span className="official-contact-label">
            Contact the public office
          </span>
          <div className="official-contact-actions">
            {contact.phone && (
              <a className="button primary" href={`tel:${contact.phone}`}>
                <Phone size={15} /> Call {contact.phone}
              </a>
            )}
            {station && (
              <a className="button primary" href={`tel:${station.phone}`}>
                <Phone size={15} /> Call {station.phone}
              </a>
            )}
            <a
              className="button secondary"
              href={contact.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={15} /> Official complaint site
            </a>
            {contact.email && (
              <a
                className="official-contact-text-link"
                href={`mailto:${contact.email}`}
              >
                <Mail size={15} /> {contact.email}
              </a>
            )}
            {contact.directoryUrl && (
              <a
                className="official-contact-text-link"
                href={contact.directoryUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={15} /> {contact.directoryLabel}
              </a>
            )}
          </div>
        </div>
      </div>
      <p className="official-contact-note">
        {contact.note}{" "}
        {station &&
          "Station suggestion uses the area name; confirm jurisdiction for the exact junction. "}
        CivicPulse has not filed this case with the agency or assigned a named
        officer.
      </p>
    </section>
  );
}
