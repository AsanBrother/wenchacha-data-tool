/**
 * 应用根组件
 *
 * 结构：
 *   BrowserRouter (路由)
 *   └── div (主容器)
 *       ├── Navbar (顶部导航栏 + 移动端底部Tab)
 *       └── Routes
 *           ├── /          → Home（首页，功能介绍）
 *           ├── /detection → Detection（数据造假检测）
 *           ├── /repair    → Repair（数据修复）
 *           └── /generator → Generator（数据生成）
 *
 * 语言切换逻辑：监听store中的language变化，同步更新i18next实例
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from './store/useStore';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Detection from './pages/Detection';
import Repair from './pages/Repair';
import Generator from './pages/Generator';

export default function App() {
  const { language } = useStore();
  const { i18n } = useTranslation();

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/detection" element={<Detection />} />
          <Route path="/repair" element={<Repair />} />
          <Route path="/generator" element={<Generator />} />
        </Routes>
      </div>
    </Router>
  );
}
