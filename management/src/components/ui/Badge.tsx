import { Component, JSX, splitProps } from 'solid-js';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children?: JSX.Element;
}

const Badge: Component<BadgeProps> = (props) => {
  const [local, others] = splitProps(props, [
    'variant',
    'size',
    'dot',
    'children',
    'class'
  ]);

  const baseClasses = () =>
    'inline-flex items-center font-medium rounded-full';

  const variantClasses = () => {
    switch (local.variant || 'default') {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const sizeClasses = () => {
    switch (local.size || 'md') {
      case 'sm':
        return 'px-2 py-0.5 text-xs';
      case 'md':
        return 'px-2.5 py-0.5 text-sm';
      case 'lg':
        return 'px-3 py-1 text-sm';
      default:
        return 'px-2.5 py-0.5 text-sm';
    }
  };

  const classes = () => [
    baseClasses(),
    variantClasses(),
    sizeClasses(),
    local.class || ''
  ].join(' ');

  const DotIndicator = () => {
    const dotColor = () => {
      switch (local.variant || 'default') {
        case 'success':
          return 'bg-green-400';
        case 'warning':
          return 'bg-yellow-400';
        case 'error':
          return 'bg-red-400';
        case 'info':
          return 'bg-blue-400';
        default:
          return 'bg-gray-400';
      }
    };

    return (
      <svg class="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="3" class={dotColor()} />
      </svg>
    );
  };

  return (
    <span class={classes()} {...others}>
      {local.dot && <DotIndicator />}
      {local.children}
    </span>
  );
};

export default Badge;