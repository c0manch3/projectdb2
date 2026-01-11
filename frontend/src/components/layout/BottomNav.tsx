import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const navigationItems = [
  {
    key: 'projects',
    href: '/projects',
    icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  },
  {
    key: 'workload',
    href: '/workload',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    key: 'profile',
    href: '/profile',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
];

export default function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-40">
      <div className="flex items-center justify-around h-16">
        {navigationItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.href}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full px-2 ${
                isActive ? 'text-primary-600' : 'text-gray-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <svg
                  className="w-6 h-6"
                  fill={isActive ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={item.icon}
                  />
                </svg>
                <span className="text-xs mt-1">{t(`navigation.${item.key}`)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
