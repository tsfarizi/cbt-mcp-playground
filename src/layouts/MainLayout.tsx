import { NavLink, Outlet } from "react-router-dom";

import { Navbar, NavbarBrand, NavbarContent, NavbarItem } from "@heroui/navbar";
import { Button } from "@heroui/button";

const navItems = [
  { label: "Playground", href: "/" },
  { label: "Monitoring Sesi", href: "/sessions" },
  { label: "Konfigurasi", href: "/config" },
];

export function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar maxWidth="full" isBordered className="bg-white/80 backdrop-blur">
        <NavbarBrand>
          <span className="text-lg font-semibold tracking-wide text-primary">CBT Playground</span>
        </NavbarBrand>
        <NavbarContent className="hidden gap-6 sm:flex" justify="center">
          {navItems.map((item) => (
            <NavbarItem key={item.href}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-slate-600 hover:text-primary"
                  }`
                }
              >
                {item.label}
              </NavLink>
            </NavbarItem>
          ))}
        </NavbarContent>
        <NavbarContent justify="end" className="items-center gap-3">
          <NavbarItem className="sm:hidden">
            <Button as={NavLink} color="primary" radius="full" size="sm" to="/config">
              Konfigurasi
            </Button>
          </NavbarItem>
        </NavbarContent>
      </Navbar>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10">
        <Outlet />
      </main>
    </div>
  );
}
