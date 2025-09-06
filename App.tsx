import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import BrandDashboard from './components/BrandDashboard';
import { Brand } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import BrandWorkspace from './components/BrandWorkspace';
import { initDB } from './services/imageDb';
import Loader from './components/Loader';

const App: React.FC = () => {
  const [brands, setBrands] = useLocalStorage<Brand[]>('brands', []);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await initDB();
      setDbReady(true);
    };
    initialize();
  }, []);

  const handleSelectBrand = (id: string) => {
    setSelectedBrandId(id);
  };

  const handleBackToDashboard = () => {
    setSelectedBrandId(null);
  };

  const handleAddBrand = (newBrand: Brand) => {
    setBrands([...brands, newBrand]);
  };

  const handleDeleteBrand = (id: string) => {
    if (window.confirm('Are you sure you want to delete this brand and all its assets?')) {
      setBrands(brands.filter(brand => brand.id !== id));
      if (selectedBrandId === id) {
        setSelectedBrandId(null);
      }
    }
  };

  const handleUpdateBrand = (updatedBrand: Brand) => {
    setBrands(brands.map(brand => (brand.id === updatedBrand.id ? updatedBrand : brand)));
  };

  const selectedBrand = brands.find(brand => brand.id === selectedBrandId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-sans">
      <Header />
      <main className="container mx-auto">
        {!dbReady ? (
          <div className="flex justify-center items-center h-[calc(100vh-80px)]">
            <Loader message="Initializing asset database..." />
          </div>
        ) : selectedBrand ? (
          <BrandWorkspace
            key={selectedBrand.id} // Add key to force re-mount on brand change
            brand={selectedBrand}
            onBack={handleBackToDashboard}
            onUpdateBrand={handleUpdateBrand}
          />
        ) : (
          <BrandDashboard
            brands={brands}
            onSelectBrand={handleSelectBrand}
            onAddBrand={handleAddBrand}
            onDeleteBrand={handleDeleteBrand}
          />
        )}
      </main>
    </div>
  );
};

export default App;
