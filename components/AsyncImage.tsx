import React, { useState, useEffect } from 'react';
import { getImage } from '../services/imageDb';
import ImageIcon from './icons/ImageIcon';

interface AsyncImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  assetId: string;
  alt: string;
}

const AsyncImage: React.FC<AsyncImageProps> = ({ assetId, alt, className, ...props }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchImage = async () => {
      setIsLoading(true);
      try {
        const url = await getImage(assetId);
        if (isMounted && url) {
          setImageUrl(url);
        }
      } catch (error) {
        console.error(`Failed to load image for assetId: ${assetId}`, error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
    };
  }, [assetId]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-700/50 animate-pulse ${className}`}>
        <ImageIcon className="w-1/3 h-1/3 text-gray-500" />
      </div>
    );
  }

  if (!imageUrl) {
    return (
        <div className={`flex flex-col items-center justify-center bg-gray-700/50 ${className}`}>
            <ImageIcon className="w-1/3 h-1/3 text-gray-500" />
            <p className="text-xs text-red-400 mt-2">Image not found</p>
      </div>
    );
  }

  return <img src={imageUrl} alt={alt} className={className} {...props} />;
};

export default AsyncImage;