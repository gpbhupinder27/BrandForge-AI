import React from 'react';

const CookingIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 4.875C3 3.839 3.84 3 4.875 3h4.25C10.16 3 11 3.84 11 4.875v4.25c0 1.036-.84 1.875-1.875 1.875h-4.25C3.84 11 3 10.16 3 9.125v-4.25zM13 4.875C13 3.839 13.84 3 14.875 3h4.25c1.035 0 1.875.84 1.875 1.875v4.25c0 1.036-.84 1.875-1.875 1.875h-4.25c-1.036 0-1.875-.84-1.875-1.875v-4.25z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 12.75v1.5M17.25 18v1.5M4.5 12.75v1.5M4.5 18v1.5" />
  </svg>
);

export default CookingIcon;