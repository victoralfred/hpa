import { Component, JSX, splitProps } from 'solid-js';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: JSX.Element;
  iconPosition?: 'left' | 'right';
  children?: JSX.Element;
}

const Button: Component<ButtonProps> = (props) => {
  const [local, others] = splitProps(props, [
    'variant', 
    'size', 
    'loading', 
    'icon', 
    'iconPosition', 
    'children', 
    'class'
  ]);

  const baseClasses = () => 
    'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = () => {
    switch (local.variant || 'primary') {
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
      case 'secondary':
        return 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500';
      case 'outline':
        return 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500';
      case 'ghost':
        return 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500';
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
      default:
        return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
    }
  };

  const sizeClasses = () => {
    switch (local.size || 'md') {
      case 'sm':
        return 'px-3 py-1.5 text-sm rounded-md';
      case 'md':
        return 'px-4 py-2 text-sm rounded-md';
      case 'lg':
        return 'px-6 py-3 text-base rounded-lg';
      default:
        return 'px-4 py-2 text-sm rounded-md';
    }
  };

  const classes = () => [
    baseClasses(),
    variantClasses(),
    sizeClasses(),
    local.class || ''
  ].join(' ');

  const LoadingSpinner = () => (
    <svg 
      class="animate-spin -ml-1 mr-2 h-4 w-4" 
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

  return (
    <button
      class={classes()}
      disabled={local.loading || others.disabled}
      {...others}
    >
      {local.loading && <LoadingSpinner />}
      
      {local.icon && local.iconPosition !== 'right' && (
        <span class={local.children ? 'mr-2' : ''}>{local.icon}</span>
      )}
      
      {local.children}
      
      {local.icon && local.iconPosition === 'right' && (
        <span class={local.children ? 'ml-2' : ''}>{local.icon}</span>
      )}
    </button>
  );
};

export default Button;