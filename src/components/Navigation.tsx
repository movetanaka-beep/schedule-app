"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/calendar", label: "カレンダー", icon: "📅" },
  { href: "/admin", label: "設定", icon: "⚙️" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-lg mx-auto flex justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center px-3 py-1 rounded-lg transition-colors ${
                isActive
                  ? "text-indigo-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
