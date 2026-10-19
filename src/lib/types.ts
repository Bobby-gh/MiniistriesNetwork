// Domain model for the Diocese Network church management app.

export type ID = string;

export type PaymentType = "dues" | "donation" | "funeral" | "building" | "other";

export type PaymentMethod = "Cash" | "Mobile Money" | "Bank Transfer" | "Card" | "Cheque";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "Cash",
  "Mobile Money",
  "Bank Transfer",
  "Card",
  "Cheque",
];

export type ServiceType =
  | "Sunday Worship"
  | "Bible Study"
  | "Prayer Meeting"
  | "Youth Service"
  | "All Night"
  | "Special Service";

export const SERVICE_TYPES: ServiceType[] = [
  "Sunday Worship",
  "Bible Study",
  "Prayer Meeting",
  "Youth Service",
  "All Night",
  "Special Service",
];

export type MemberStatus = "active" | "inactive" | "transferred";

export type MemberRole =
  | "Pastor"
  | "Deacon"
  | "Member"
  | "Youth"
  | "Women's Fellowship"
  | "Men's Fellowship"
  | "Choir"
  | "Sunday School Teacher"
  | "Usher";

export const MEMBER_ROLES: MemberRole[] = [
  "Pastor",
  "Deacon",
  "Member",
  "Youth",
  "Women's Fellowship",
  "Men's Fellowship",
  "Choir",
  "Sunday School Teacher",
  "Usher",
];

export interface Parish {
  id: ID;
  name: string;
  location: string;
  priest: string;
  phone: string;
  founded: string; // YYYY-MM-DD
}

export interface Member {
  id: ID;
  membershipNo: string;
  firstName: string;
  lastName: string;
  gender: "Male" | "Female";
  phone: string;
  email: string;
  address: string;
  parishId: ID;
  role: MemberRole;
  joinDate: string; // YYYY-MM-DD
  dob: string; // YYYY-MM-DD
  occupation: string;
  status: MemberStatus;
  notes: string;
}

export interface AttendanceRecord {
  id: ID;
  memberId: ID;
  serviceDate: string; // YYYY-MM-DD
  service: ServiceType;
}

export interface Payment {
  id: ID;
  memberId: ID | ""; // "" = anonymous / offering basket
  type: PaymentType;
  amount: number;
  date: string; // YYYY-MM-DD
  method: PaymentMethod;
  reference: string;
  period?: string; // YYYY-MM — dues cycle the payment settles
  category: string; // free-form: fund, levy event, payment category...
  note: string;
  createdBy: string;
}

export interface Transfer {
  id: ID;
  memberId: ID;
  fromParishId: ID;
  toParishId: ID;
  date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
}

export type AlertKind = "payment" | "defaulter";
export type AlertChannel = "SMS" | "WhatsApp" | "Email" | "Print";

export const ALERT_CHANNELS: AlertChannel[] = ["SMS", "WhatsApp", "Email", "Print"];

export interface Alert {
  id: ID;
  kind: AlertKind;
  memberId: ID;
  title: string;
  message: string;
  channel: AlertChannel;
  date: string; // YYYY-MM-DD
  status: "queued" | "sent";
  sentAt?: string;
}

export interface Settings {
  dioceseName: string;
  dioceseSubtitle: string;
  currency: string;
  currencySymbol: string;
  duesMonthlyAmount: number;
  funeralLevyAmount: number;
  defaulterThresholdMonths: number;
  buildingFundName: string;
  buildingFundTarget: number;
  alertSender: string;
}

export interface DB {
  parishes: Parish[];
  members: Member[];
  attendance: AttendanceRecord[];
  payments: Payment[];
  transfers: Transfer[];
  alerts: Alert[];
  settings: Settings;
}

export const OTHER_PAYMENT_CATEGORIES = [
  "Event Fee",
  "Membership Subscription",
  "Hall Rental",
  "Refreshments",
  "Transport",
  "Welfare Contribution",
  "Penalty",
  "Other",
];

export const DONATION_FUNDS = [
  "General Fund",
  "Welfare",
  "Missions & Outreach",
  "Sunday School",
  "Choir & Media",
  "Building Project",
  "Benevolence",
];
