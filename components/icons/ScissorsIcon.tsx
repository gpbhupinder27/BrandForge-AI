import React from 'react';

const ScissorsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l6.077 3.509m-6.077-3.509a3 3 0 10-5.196 3 3 3 0 005.196-3zm1.083 1.839a2.165 2.165 0 001.083-1.839m-1.083 1.839c.086.329.135.673.14 1.024m-1.223 2.863l6.077 3.509m-6.077-3.509a2.165 2.165 0 01-1.083 1.839m1.083-1.839c-.005.351-.054.695-.14 1.024m-1.223 2.863a3 3 0 105.196 3 3 3 0 00-5.196-3zm9.284-9.627a3 3 0 11-5.196-3 3 3 0 015.196 3zm-1.536.887a2.165 2.165 0 00-1.083 1.839c-.005.351-.054.695-.14 1.024M16.152 9.137l-6.077 3.509" />
  </svg>
);

export default ScissorsIcon;
