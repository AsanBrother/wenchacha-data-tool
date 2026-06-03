import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Wrench, Cpu, ArrowRight } from 'lucide-react';

export default function Home() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Search,
      title: t('home.features.detection.title'),
      description: t('home.features.detection.description'),
      link: '/detection',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Wrench,
      title: t('home.features.repair.title'),
      description: t('home.features.repair.description'),
      link: '/repair',
      color: 'from-green-500 to-green-600',
    },
    {
      icon: Cpu,
      title: t('home.features.generator.title'),
      description: t('home.features.generator.description'),
      link: '/generator',
      color: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-extrabold text-gray-900 sm:text-6xl lg:text-7xl mb-6">
              {t('home.title')}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
              {t('home.subtitle')}
            </p>
            <Link
              to="/detection"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-[#165DFF] text-white text-lg font-semibold rounded-xl hover:bg-blue-600 transition-all hover:shadow-lg hover:scale-105"
            >
              <span>{t('home.cta')}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Link
                key={index}
                to={feature.link}
                className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {feature.description}
                </p>
                <div className="flex items-center text-[#165DFF] font-medium group-hover:space-x-2 transition-all">
                  <span>{t('common.next')}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t('home.features.detection.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-[#165DFF] rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto">
                1
              </div>
              <h3 className="font-semibold text-gray-900">
                {t('detection.upload.title')}
              </h3>
              <p className="text-gray-600 text-sm">
                {t('detection.upload.types')}
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-[#165DFF] rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto">
                2
              </div>
              <h3 className="font-semibold text-gray-900">
                {t('detection.run')}
              </h3>
              <p className="text-gray-600 text-sm">
                {t('home.features.detection.description')}
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-[#165DFF] rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto">
                3
              </div>
              <h3 className="font-semibold text-gray-900">
                {t('detection.results.title')}
              </h3>
              <p className="text-gray-600 text-sm">
                {t('detection.results.details')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
