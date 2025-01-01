import { ButtonHTMLAttributes, CSSProperties, memo } from 'react';
import './Button.scss';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'outline';
  title: string;
  style?: CSSProperties;
}

export const Button = memo(function Button({
  variant = 'primary',
  title,
  className = '',
  style = {},
  ...props
}: ButtonProps) {
  return (
    <button
      className={`custom-button ${variant} ${className}`}
      type="button"
      style={style}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    >
      {title}
    </button>
  );
});
