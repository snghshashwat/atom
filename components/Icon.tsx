import type { SVGProps } from "react";

type IconName =
  | "home" | "target" | "check" | "users" | "shield" | "alert"
  | "bar-chart" | "share" | "calendar" | "settings" | "history"
  | "bell" | "logout" | "switch" | "download" | "plus" | "trash"
  | "unlock" | "lock" | "edit" | "send" | "x" | "info" | "circle"
  | "chevron-right" | "search" | "filter" | "play" | "menu" | "team"
  | "cloud" | "link" | "mail" | "globe" | "refresh" | "eye" | "check-circle"
  | "zap" | "key" | "database" | "chevron-down";

interface Props extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const paths: Record<IconName, React.ReactNode> = {
  home: (<><path d="M3 11.5L12 4l9 7.5" /><path d="M5 10v10h14V10" /></>),
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></>),
  check: (<polyline points="4 12 10 18 20 6" />),
  users: (<><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-7 7-7s7 3 7 7" /><circle cx="17" cy="10" r="3" /><path d="M15 21c.7-2.5 2.7-4.3 6-4.5" /></>),
  shield: (<><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /></>),
  alert: (<><path d="M12 3l10 18H2z" /><line x1="12" y1="10" x2="12" y2="14" /><circle cx="12" cy="17.5" r="1" fill="currentColor" /></>),
  "bar-chart": (<><line x1="5" y1="20" x2="5" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="19" y1="20" x2="19" y2="14" /><line x1="3" y1="21" x2="21" y2="21" /></>),
  share: (<><circle cx="6" cy="12" r="3" /><circle cx="18" cy="5" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.5" y1="10.5" x2="15.5" y2="6.5" /><line x1="8.5" y1="13.5" x2="15.5" y2="17.5" /></>),
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="16" y1="3" x2="16" y2="7" /></>),
  settings: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>),
  history: (<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><polyline points="3 3 3 8 8 8" /><polyline points="12 7 12 12 16 14" /></>),
  bell: (<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></>),
  logout: (<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><polyline points="10 17 5 12 10 7" /><line x1="5" y1="12" x2="15" y2="12" /></>),
  switch: (<><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>),
  download: (<><path d="M12 3v12" /><polyline points="7 11 12 16 17 11" /><line x1="4" y1="20" x2="20" y2="20" /></>),
  plus: (<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>),
  trash: (<><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>),
  unlock: (<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0" /></>),
  lock: (<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  edit: (<><path d="M14 4l6 6L8 22H2v-6z" /><line x1="12" y1="6" x2="18" y2="12" /></>),
  send: (<><polygon points="3 12 21 3 14 21 11 14 3 12" /></>),
  x: (<><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><line x1="12" y1="10" x2="12" y2="17" /><circle cx="12" cy="7.5" r="1" fill="currentColor" /></>),
  circle: (<circle cx="12" cy="12" r="9" />),
  "chevron-right": (<polyline points="9 6 15 12 9 18" />),
  search: (<><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></>),
  filter: (<polygon points="3 4 21 4 14 12 14 20 10 20 10 12" />),
  play: (<polygon points="6 4 20 12 6 20" />),
  menu: (<><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>),
  team: (<><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-7 7-7s7 3 7 7" /><circle cx="17" cy="6" r="3" /><path d="M21 17c-1-2-3-3-5-3" /></>),
  cloud: (<><path d="M18 10h-1.3A7 7 0 1 0 5 15h13a4 4 0 0 0 0-8Z" /></>),
  link: (<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>),
  mail: (<><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22 4 12 13 2 4" /></>),
  globe: (<><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10A15 15 0 0 1 12 2z" /></>),
  refresh: (<><polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" /><path d="M20.5 9A9 9 0 0 0 5 6l-4 4" /><path d="M3.5 15a9 9 0 0 0 15.5 3l4-4" /></>),
  eye: (<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>),
  "check-circle": (<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>),
  zap: (<polygon points="13 2 3 14 12 14 11 22 21 10 12 10" />),
  key: (<><path d="M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 0-7.8 7.8 5.5 5.5 0 0 0 7.8-7.8zm0 0L15 7l-1.5 1.5" /><path d="M18 4l3 3" /></>),
  database: (<><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.7-4 3-9 3s-9-1.3-9-3" /><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" /></>),
  "chevron-down": (<polyline points="6 9 12 15 18 9" />),
};

export default function Icon({ name, size = 16, ...rest }: Props) {
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
