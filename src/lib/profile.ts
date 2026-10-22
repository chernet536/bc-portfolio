// Your personal details. Edit the text here; the site picks it up automatically.
// The profile PHOTO is not stored here: upload it from /admin > Profile photo.
export type Role = {
  title: string;
  company: string;
  period: string;
  summary: string;
  bullets: string[];
};

export const profile = {
  name: "Chernet Tariku",
  headline: "Dynamics 365 Business Central consultant",
  intro: "I design and implement Business Central solutions: AL development, integrations, master data and reporting.",
  email: "chernet.tariku12@gmail.com",
  linkedin: "https://www.linkedin.com/in/chernet-tariku-15823019a/",
  // GitHub is hidden for now. To show it again, add:  github: "https://github.com/your-username",
  // and add a GitHub link next to LinkedIn in src/layouts/Base.astro.
  startedErp: { year: 2023, month: 3 }, // used to calculate "years of ERP experience"
  expertise: ["AL development", "ERP implementation", "Integrations", "Master data management", "Reporting (RDLC)", "Process automation"],
  certifications: [
    "MB-820: Microsoft Dynamics 365 Business Central Developer Associate",
    "MB-800: Microsoft Dynamics 365 Business Central Functional Consultant Associate",
  ],
  highlights: [
    "Led ERP implementation and enhancement as the primary ERP authority across Finance, Sales, Purchasing, Inventory and Warehouse.",
    "Built custom Business Central extensions in AL for sales, logistics and production.",
    "Cut manual data entry by 30% through API integrations with external systems.",
    "Trained managers and end-users, driving system adoption across departments.",
  ],
  experience: [
    {
      title: "ERP Master Data Administrator",
      company: "BGI Ethiopia",
      period: "Feb 2025 – Present",
      summary: "Primary ERP authority across Finance, Sales, Purchasing, Inventory and Warehouse, leading implementation and system enhancement.",
      bullets: [
        "Led the ERP project lifecycle: requirements, design, testing, deployment and post-go-live support, with on-time delivery and stakeholder alignment.",
        "Govern master data (customers, vendors, items, chart of accounts) with compliance protocols and data-security standards, reducing inconsistencies and improving G/L and operational reporting integrity.",
        "Lead and mentor ERP project teams and functional staff, coordinating with IT managers to align ERP capabilities with business processes.",
        "Partner with finance, supply chain and logistics teams to streamline end-to-end processes and recommend ERP-driven solutions.",
        "Configure logistics and warehouse data (locations, bins, transport tariffs, routes, shipping agents), supporting disaster recovery and business continuity readiness.",
        "Train managers and end-users to drive adoption; work with vendors and consultants on enhancements, licensing and support; monitor performance and implement upgrades.",
      ],
    },
    {
      title: "ERP Developer / Business Central Developer",
      company: "EthioChicken",
      period: "Mar 2023 – Feb 2025",
      summary: "Business Central developer responsible for customization, integration and functional support across production, sales and logistics.",
      bullets: [
        "Designed and built custom Business Central extensions in AL for sales, logistics and production at enterprise scale.",
        "Developed and maintained API integrations with external systems, reducing manual data entry by 30% and improving cross-system data consistency.",
        "Managed user access, permissions and activity monitoring to enforce data-security standards and operational compliance.",
        "Served as the primary ERP escalation contact, guiding functional staff and users across inventory and manufacturing.",
        "Translated business requirements into scalable ERP solutions from requirements gathering through deployment, UAT and post-go-live optimization.",
        "Administered Chart of Accounts, posting groups, sales/purchasing and inventory/warehouse setups; customized RDLC reports for financial and operational reporting.",
      ],
    },
  ] as Role[],
};

/** Whole years of ERP experience, calculated from `startedErp`. */
export function erpYears(now = new Date()) {
  const m = (now.getFullYear() - profile.startedErp.year) * 12 + (now.getMonth() + 1 - profile.startedErp.month);
  return Math.max(0, Math.floor(m / 12));
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
