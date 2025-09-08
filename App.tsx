import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import BrandDashboard from './components/BrandDashboard';
import { Brand } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import BrandWorkspace from './components/BrandWorkspace';
import { initDB, deleteImages } from './services/imageDb';
import Loader from './components/Loader';
import Homepage from './components/Homepage';

const App: React.FC = () => {
  const [brands, setBrands] = useLocalStorage<Brand[]>('brands', []);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const [hasStarted, setHasStarted] = useLocalStorage<boolean>('hasStartedApp', false);
  const [showHomepageOverride, setShowHomepageOverride] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await initDB();
      setDbReady(true);
    };
    initialize();
  }, []);

  const handleGetStarted = () => {
    setHasStarted(true);
    setShowHomepageOverride(false);
  };

  const handleSelectBrand = (id: string) => {
    setSelectedBrandId(id);
    setShowHomepageOverride(false);
  };
  
  const handleGoToHomepage = () => {
    setSelectedBrandId(null);
    setShowHomepageOverride(true);
  }

  const handleBackToDashboard = () => {
    setSelectedBrandId(null);
    setShowHomepageOverride(false);
    if (!hasStarted) {
        setHasStarted(true);
    }
  };

  const handleAddBrand = (newBrand: Brand) => {
    setBrands([...brands, newBrand]);
    setSelectedBrandId(newBrand.id);
    setShowHomepageOverride(false);
  };

  const handleDeleteBrand = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this brand and all its assets? This action cannot be undone.')) {
      try {
        const brandToDelete = brands.find(brand => brand.id === id);
        if (brandToDelete) {
          const assetIdsToDelete = brandToDelete.assets.map(asset => asset.id);
          if (assetIdsToDelete.length > 0) {
            await deleteImages(assetIdsToDelete);
          }
        }

        setBrands(brands.filter(brand => brand.id !== id));
        if (selectedBrandId === id) {
          setSelectedBrandId(null);
        }
      } catch (error) {
        console.error("Failed to delete brand and its assets:", error);
        alert("There was an error deleting the brand. Please try again.");
      }
    }
  };

  const handleUpdateBrand = (updatedBrand: Brand) => {
    setBrands(brands.map(brand => (brand.id === updatedBrand.id ? updatedBrand : brand)));
  };

  const selectedBrand = brands.find(brand => brand.id === selectedBrandId);

  const renderContent = () => {
    if (!dbReady) {
      return (
        <div className="flex justify-center items-center h-[calc(100vh-80px)]">
          <Loader message="Initializing asset database..." />
        </div>
      );
    }
    
    const shouldShowHomepage = showHomepageOverride || (!hasStarted && brands.length === 0);

    if (shouldShowHomepage) {
        return <Homepage onGetStarted={handleGetStarted} />;
    }
    
    if (selectedBrand) {
      return (
        <BrandWorkspace
          key={selectedBrand.id} // Add key to force re-mount on brand change
          brand={selectedBrand}
          onBack={handleBackToDashboard}
          onUpdateBrand={handleUpdateBrand}
        />
      );
    }
    
    return (
      <BrandDashboard
        brands={brands}
        onSelectBrand={handleSelectBrand}
        onAddBrand={handleAddBrand}
        onDeleteBrand={handleDeleteBrand}
      />
    );
  };
  
  const showHomepage = (showHomepageOverride || (!hasStarted && brands.length === 0)) && dbReady;

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-50 font-sans">
      <Header onGoToHomepage={handleGoToHomepage} onGoToDashboard={handleBackToDashboard} />
      <main className={showHomepage ? '' : 'container mx-auto'}>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
