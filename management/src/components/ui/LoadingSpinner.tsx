import { Component, splitProps } from 'solid-js';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  class?: string;
}

const LoadingSpinner: Component<LoadingSpinnerProps> = (props) => {
  const [local] = splitProps(props, ['size', 'class']);

  const sizeClasses = () => {
    switch (local.size || 'md') {
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-6 h-6';
      case 'lg':
        return 'w-8 h-8';
      default:
        return 'w-6 h-6';
    }
  };

  const classes = () => [
    'animate-spin',
    sizeClasses(),
    local.class || ''
  ].join(' ');

  return (
    <svg 
      class={classes()} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        class="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        class="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

export default LoadingSpinner;