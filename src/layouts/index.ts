export { AuthLayout } from './auth-layout';
export { MainLayout } from './main-layout';

// NavItem/NavItemProps are local to main-layout and not re-exported
// historically — the original barrel referenced them but the component
// never declared them as exported. Use a minimal local type alias here so
// external consumers that imported via the barrel still typecheck.
export interface NavItem {
  path: string;
  label: string;
  icon: string;
}
export type NavItemProps = NavItem;
