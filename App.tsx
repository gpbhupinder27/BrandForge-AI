import React, { useState, useEffect } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import { Brand } from './types';
import Header from './components/Header';
import BrandDashboard from './components/BrandDashboard';
import BrandWorkspace from './components/BrandWorkspace';
import { initDB } from './services/imageDb';

function App() {
  const [brands, setBrands] = useLocalStorage<Brand[]>('brands', []);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    initDB().then(() => {
      setDbInitialized(true);
    }).catch(err => {
        console.error("Failed to initialize database:", err);
    });
  }, []);

  const handleCreateBrand = (name: string, description: string) => {
    const newBrand: Brand = {
      id: crypto.randomUUID(),
      name,
      description,
      assets: [],
      createdAt: new Date().toISOString(),
    };
    setBrands(prevBrands => [...prevBrands, newBrand]);
    setActiveBrandId(newBrand.id);
  };
  
  const handleUpdateBrand = (updatedBrand: Brand) => {
    setBrands(prevBrands => prevBrands.map(b => b.id === updatedBrand.id ? updatedBrand : b));
  };
  
  const activeBrand = brands.find(b => b.id === activeBrandId);

  if (!dbInitialized) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center font-sans">
            <p>Initializing asset database...</p>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <Header />
      <main className="container mx-auto max-w-7xl">
        {activeBrand ? (
          <BrandWorkspace
            brand={activeBrand}
            onBack={() => setActiveBrandId(null)}
            onUpdateBrand={handleUpdateBrand}
          />
        ) : (
          <BrandDashboard
            brands={brands}
            onCreateBrand={handleCreateBrand}
            onSelectBrand={setActiveBrandId}
          />
        )}
      </main>
    </div>
  );
}

export default App;