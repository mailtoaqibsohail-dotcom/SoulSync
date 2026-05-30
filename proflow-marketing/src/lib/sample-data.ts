import type { AgencyPaymentMethods } from "./types";

export const SAMPLE_CLIENTS = [
  {
    id: "c1",
    name: "Acme Solar",
    company_name: "Acme Solar LLC",
    primary_contact: "Jane Cooper",
    billing_email: "billing@acmesolar.example",
    monthly_fee: 1500,
  },
  {
    id: "c2",
    name: "Bluefield Energy",
    company_name: "Bluefield Energy Inc.",
    primary_contact: "Marcus Lee",
    billing_email: "ap@bluefield.example",
    monthly_fee: 2200,
  },
  {
    id: "c3",
    name: "GreenGrid Co.",
    company_name: "GreenGrid Co.",
    primary_contact: "Aisha Khan",
    billing_email: "finance@greengrid.example",
    monthly_fee: 1800,
  },
];

export const DEFAULT_PAYMENT_METHODS: AgencyPaymentMethods = {
  wise_enabled: true,
  wise_details: {
    account_holder: "Aqib Sohail",
    usd_account_number: "9600000123456",
    routing_ach: "084009519",
    swift: "TRWIUS35XXX",
    bank_name_address:
      "Wise US Inc., 30 W 26th Street, Floor 6, New York, NY 10010, USA",
    payment_link: "wise.com/pay/aqibsohail",
  },
  bank_enabled: false,
  bank_details: { currencies: ["USD"] },
  payoneer_enabled: false,
  payoneer_details: {},
  default_currency: "USD",
  method_order: ["wise", "bank", "payoneer"],
  recommended_method: "wise",
};

export const AGENCY_PROFILE = {
  name: "ProFlow Marketing",
  address: "Lahore, Pakistan",
  tagline: "Growth marketing for energy & sustainability brands",
};
