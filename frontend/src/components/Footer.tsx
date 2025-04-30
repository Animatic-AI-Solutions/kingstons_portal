import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-primary-700 text-white py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-8">
          <Link to="/terms" className="hover:text-primary-200 transition-colors duration-200">
            Terms and Conditions
          </Link>
          <Link to="/cookies" className="hover:text-primary-200 transition-colors duration-200">
            Cookie Policies
          </Link>
          <a 
            href="https://www.kingstonsfinancial.com/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-primary-200 transition-colors duration-200"
          >
            Website
          </a>
        </div>
        <div className="text-center mt-4 text-sm text-primary-200">
          © {new Date().getFullYear()} Kingston's Financial. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer; 