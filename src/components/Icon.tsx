import * as React from "react";

type Props = React.SVGProps<SVGSVGElement> & { name: IconName; size?: number };

export type IconName =
  | "dashboard" | "leads" | "contacts" | "companies" | "activities"
  | "search" | "bell" | "logout" | "globe" | "plus" | "sparkles"
  | "trend-up" | "trend-down" | "users" | "building" | "briefcase"
  | "phone" | "mail" | "whatsapp" | "calendar" | "menu" | "check"
  | "chevron-right" | "chevron-left" | "filter" | "lightning" | "zap" | "kanban"
  | "tasks" | "quote" | "campaign" | "product" | "settings"
  | "target" | "x" | "edit" | "trash" | "send" | "clock";

const paths: Record<IconName, React.ReactNode> = {
  dashboard: (<><rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/></>),
  leads: (<><path d="M12 2l2.39 4.84L20 8l-4 3.9L17.18 18 12 15.27 6.82 18 8 11.9 4 8l5.61-1.16z"/></>),
  contacts: (<><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></>),
  companies: (<><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/></>),
  activities: (<><path d="M4 4h16v4H4z"/><path d="M4 12h10v4H4z"/><path d="M4 20h7"/></>),
  search: (<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>),
  bell: (<><path d="M6 8a6 6 0 0112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 004 0"/></>),
  logout: (<><path d="M15 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h12"/></>),
  globe: (<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></>),
  plus: (<><path d="M12 5v14M5 12h14"/></>),
  sparkles: (<><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>),
  "trend-up": (<><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></>),
  "trend-down": (<><path d="M3 7l6 6 4-4 8 8"/><path d="M14 17h7v-7"/></>),
  users: (<><circle cx="9" cy="8" r="4"/><path d="M2 21c1-4 4-6 7-6s6 2 7 6"/><circle cx="17" cy="9" r="3"/><path d="M22 19c-.7-2.6-2.6-4-5-4"/></>),
  building: (<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h6"/></>),
  briefcase: (<><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/></>),
  phone: (<><path d="M22 16.9v3a2 2 0 01-2.2 2 19 19 0 01-8.3-3 19 19 0 01-6-6 19 19 0 01-3-8.4A2 2 0 014.5 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.4 2.1L8.1 9.9a16 16 0 006 6l1.5-1.5a2 2 0 012.1-.5c.8.3 1.7.5 2.6.6a2 2 0 011.7 2z"/></>),
  mail: (<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></>),
  whatsapp: (<><path d="M20.5 11.5a8.5 8.5 0 11-15.6 4.6L3 21l5-1.4a8.5 8.5 0 0012.5-8.1z"/><path d="M9 10.5c.5 2 2.5 4 4.5 4.5l1.5-1.5 2 1c0 1-1 2-2.5 2-3.5 0-7-3.5-7-7 0-1.5 1-2.5 2-2.5l1 2-1.5 1.5z"/></>),
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/></>),
  menu: (<><path d="M4 6h16M4 12h16M4 18h16"/></>),
  check: (<><path d="M5 12l5 5L20 7"/></>),
  "chevron-right": (<><path d="M9 6l6 6-6 6"/></>),
  "chevron-left": (<><path d="M15 6l-6 6 6 6"/></>),
  filter: (<><path d="M3 5h18l-7 9v6l-4-2v-4z"/></>),
  lightning: (<><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></>),
  kanban: (<><rect x="3" y="3" width="6" height="14" rx="2"/><rect x="11" y="3" width="6" height="9" rx="2"/><rect x="19" y="3" width="2" height="6" rx="1"/></>),
  tasks: (<><path d="M9 11l3 3 8-8"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>),
  quote: (<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/></>),
  campaign: (<><path d="M3 11l18-7v16L3 13z"/><path d="M11 13v6"/></>),
  product: (<><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12l8.73-5.04M12 22V12"/></>),
  settings: (<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1.04 1.56V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1.11-1.56 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.56-1.04H3a2 2 0 110-4h.09A1.7 1.7 0 004.65 9a1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34H9a1.7 1.7 0 001.04-1.56V3a2 2 0 114 0v.09a1.7 1.7 0 001.04 1.56 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87V9a1.7 1.7 0 001.56 1.04H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.51 1z"/></>),
  x: (<><path d="M18 6L6 18M6 6l12 12"/></>),
  edit: (<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></>),
  trash: (<><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></>),
  send: (<><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></>),
  clock: (<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>),
  target: (<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>),
  zap: (<><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></>),
};

export function Icon({ name, size = 18, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
