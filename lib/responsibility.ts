import { IssueCategory } from "@/types/civic";

export interface PublicContact {
  authority: string;
  team: string;
  phone?: string;
  email?: string;
  url: string;
  directoryUrl?: string;
  directoryLabel?: string;
  note: string;
}

const gba = (team: string): PublicContact => ({
  authority: "Greater Bengaluru Authority / local city corporation",
  team,
  phone: "1533",
  email: "comm@bbmp.gov.in",
  url: "https://bbmp.gov.in/",
  directoryUrl: "https://www.bbmp.gov.in/KnowYourNewCorporation/",
  directoryLabel: "Find the current corporation and ward",
  note: "Use the public grievance helpline. The current corporation and ward team must confirm jurisdiction.",
});
const bwssb = (team: string): PublicContact => ({
  authority: "Bangalore Water Supply and Sewerage Board (BWSSB)",
  team,
  phone: "1916",
  url: "https://bwssb.gov.in/complaint",
  directoryUrl: "https://bwssb.gov.in/service-stations_kanada",
  directoryLabel: "BWSSB service station contacts",
  note: "24/7 public helpline. BWSSB must confirm whether the asset is theirs.",
});

export const publicContacts: Record<IssueCategory, PublicContact> = {
  Pothole: gba("Road maintenance / engineering"),
  "Road Damage": gba("Road maintenance / engineering"),
  "Garbage / Waste": gba("Solid waste management"),
  "Water Leakage": bwssb("Water supply"),
  Waterlogging: gba("Storm water drains / flood response"),
  "Drainage / Sewage": bwssb("Sewerage; GBA for roadside storm drains"),
  "Broken Streetlight": gba("Electrical / street lighting"),
  "Fallen Tree": gba("Urban forestry / parks"),
  "Traffic Signal": {
    authority: "Bengaluru Traffic Police",
    team: "Traffic signal maintenance / junction operations",
    url: "https://btp.gov.in/",
    directoryUrl: "https://btp.gov.in/images/TWO%20Note%20English.pdf",
    directoryLabel: "BTP station phone list (verify current)",
    note: "Use the official Traffic Police complaints channel. The jurisdictional traffic station should confirm signal ownership.",
  },
  "Traffic / Congestion": {
    authority: "Bengaluru Traffic Police",
    team: "Jurisdictional traffic station / traffic management",
    url: "https://btp.gov.in/",
    directoryUrl: "https://btp.gov.in/images/TWO%20Note%20English.pdf",
    directoryLabel: "BTP station phone list (verify current)",
    note: "Use the official Traffic Police complaints channel. The station should confirm jurisdiction for the exact road segment.",
  },
  "Public Property Damage": gba("Municipal maintenance"),
  Other: gba("Public grievance desk"),
};

const trafficStations = [
  {
    pattern: /electronic city/i,
    name: "Electronic City Traffic Police Station",
    phone: "9480801832",
  },
  {
    pattern: /hsr layout/i,
    name: "HSR Layout Traffic Police Station",
    phone: "9448878220",
  },
  {
    pattern: /whitefield/i,
    name: "Whitefield Traffic Police Station",
    phone: "9480801831",
  },
  {
    pattern: /jayanagar/i,
    name: "Jayanagar Traffic Police Station",
    phone: "9480801927",
  },
  {
    pattern: /malleshwaram/i,
    name: "Malleshwaram Traffic Police Station",
    phone: "9480801922",
  },
  {
    pattern: /indiranagar/i,
    name: "Jeevan Bhima Nagar Traffic Police Station",
    phone: "9480801816",
  },
  {
    pattern: /trinity|mg road/i,
    name: "Halasuru Traffic Police Station",
    phone: "9480801815",
  },
  {
    pattern: /silk board|btm layout/i,
    name: "Madiwala Traffic Police Station",
    phone: "9480801824",
  },
  {
    pattern: /koramangala/i,
    name: "Adugodi Traffic Police Station",
    phone: "9480801822",
  },
] as const;

export function suggestedTrafficStation(address: string) {
  return trafficStations.find(({ pattern }) => pattern.test(address));
}
