import { Component, JSX, splitProps } from 'solid-js';

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: JSX.Element;
  header?: JSX.Element;
  footer?: JSX.Element;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'bordered' | 'elevated';
}

const Card: Component<CardProps> = (props) => {
  const [local, others] = splitProps(props, [
    'children',
    'header',
    'footer',
    'padding',
    'variant',
    'class'
  ]);

  const baseClasses = () =>
    'bg-white rounded-lg overflow-hidden';

  const variantClasses = () => {
    switch (local.variant || 'default') {
      case 'bordered':
        return 'border border-gray-200';
      case 'elevated':
        return 'shadow-lg border border-gray-100';
      default:
        return 'shadow-sm border border-gray-200';
    }
  };

  const paddingClasses = () => {
    switch (local.padding || 'md') {
      case 'none':
        return '';
      case 'sm':
        return 'p-4';
      case 'md':
        return 'p-6';
      case 'lg':
        return 'p-8';
      default:
        return 'p-6';
    }
  };

  const cardClasses = () => [
    baseClasses(),
    variantClasses(),
    local.class || ''
  ].join(' ');

  return (
    <div class={cardClasses()} {...others}>
      {local.header && (
        <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
          {local.header}
        </div>
      )}
      
      <div class={paddingClasses()}>
        {local.children}
      </div>
      
      {local.footer && (
        <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {local.footer}
        </div>
      )}
    </div>
  );
};

export default Card;