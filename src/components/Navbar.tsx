import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { Home, Search, Wrench, Cpu, Languages } from 'lucide-react';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { language, setLanguage } = useStore();

  const toggleLanguage = () => {
    const newLang = language === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
  };

  const navItems = [
    { path: '/', label: 'nav.home', icon: Home },
    { path: '/detection', label: 'nav.detection', icon: Search },
    { path: '/repair', label: 'nav.repair', icon: Wrench },
    { path: '/generator', label: 'nav.generator', icon: Cpu },
  ];

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#165DFF] rounded-lg flex items-center justify-center">
                <Search className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                {language === 'zh' ? '数据检验' : 'DataCheck'}
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[#165DFF] text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t(item.label)}</span>
                  </Link>
                );
              })}
            </div>

            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <Languages className="w-4 h-4" />
              <span className="hidden sm:inline">{t('nav.language')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="md:hidden border-t">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center px-3 py-2 rounded-md text-xs font-medium transition-colors',
                  isActive
                    ? 'text-[#165DFF]'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span>{t(item.label)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
