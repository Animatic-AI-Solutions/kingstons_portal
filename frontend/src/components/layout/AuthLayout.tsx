import React, { useState, useEffect, CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Use simple filenames without spaces or special characters
const carouselImages = [
  '/images/carousel1.jpg',
  '/images/carousel2.jpg'
];

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const [currentImage, setCurrentImage] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<boolean[]>([false, false]);
  const [imageError, setImageError] = useState<boolean>(false);
  
  // Check if images can be loaded
  useEffect(() => {
    console.log('Attempting to load images:', carouselImages);
    
    carouselImages.forEach((src, index) => {
      const img = new Image();
      img.src = src;
      
      img.onload = () => {
        console.log(`Image ${index} loaded successfully:`, src);
        setImagesLoaded(prev => {
          const newState = [...prev];
          newState[index] = true;
          return newState;
        });
      };
      
      img.onerror = (e) => {
        console.error(`Failed to load image ${index}:`, src, e);
        setImageError(true);
      };
    });
  }, []);
  
  // Carousel auto-rotation logic
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % carouselImages.length);
    }, 8000); // Extended time between transitions
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="grid-layout">
      {/* Left side - Authentication content */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-white">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
      
      {/* Right side - Carousel images */}
      <div className="relative overflow-hidden hidden md:block bg-primary-dark">
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-200 text-center p-4 z-10">
            <div>
              <p>Images could not be loaded.</p>
              <p className="text-sm mt-2">Check browser console for details.</p>
            </div>
          </div>
        )}
        
        {/* Carousel */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentImage}
            className="absolute inset-0 bg-center h-full w-full"
            style={{ 
              backgroundImage: `url(${carouselImages[currentImage]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } as CSSProperties}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.9, 
              ease: "easeInOut" 
            }}
          />
        </AnimatePresence>
        
        {/* Carousel indicators */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              className={`carousel-indicator ${index === currentImage ? 'active' : ''}`}
              onClick={() => setCurrentImage(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout; 