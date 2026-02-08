import React from 'react';
import { useCapacitor } from '../../hooks/useCapacitor';
import { cn } from '../../lib/utils';

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  className,
  showHeader = true,
  showFooter = false,
  headerContent,
  footerContent,
}) => {
  const { isNative, platform } = useCapacitor();

  return (
    <div className={cn(
      "min-h-screen bg-background",
      isNative && "pt-safe pb-safe", // Safe area for mobile
      className
    )}>
      {/* Mobile Header */}
      {showHeader && (
        <header className={cn(
          "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          isNative && "pt-safe" // Safe area for mobile
        )}>
          <div className="container flex h-14 items-center">
            {headerContent || (
              <div className="flex items-center space-x-2">
                <img 
                  src="/logo.png" 
                  alt="UCOST Logo" 
                  className="h-8 w-8 object-contain"
                  onError={(e) => {
                    if (e.currentTarget.src !== '/logo.svg') {
                      e.currentTarget.src = '/logo.svg';
                    }
                  }}
                />
                <span className="font-semibold">UCOST Discovery Hub</span>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1",
        isNative && "px-4", // Mobile padding
        !isNative && "container mx-auto px-4"
      )}>
        {children}
      </main>

      {/* Mobile Footer */}
      {showFooter && (
        <footer className={cn(
          "border-t bg-background",
          isNative && "pb-safe" // Safe area for mobile
        )}>
          <div className="container py-4">
            {footerContent || (
              <div className="text-center text-sm text-muted-foreground">
                © 2025 UCOST Discovery Hub. All rights reserved.
              </div>
            )}
          </div>
        </footer>
      )}
    </div>
  );
};

// Mobile-specific card component
export const MobileCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}> = ({ children, className, onClick, interactive = false }) => {
  const { isNative } = useCapacitor();

  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        isNative && "p-4", // Mobile padding
        !isNative && "p-6", // Desktop padding
        interactive && "cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Mobile-specific button component
export const MobileButton: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onClick?: (e?: any) => void;
  disabled?: boolean;
}> = ({ 
  children, 
  variant = 'default', 
  size = 'default', 
  className, 
  onClick, 
  disabled = false 
}) => {
  const { isNative, triggerHaptic } = useCapacitor();

  const handleClick = async () => {
    if (isNative && !disabled) {
      await triggerHaptic('light');
    }
    onClick?.();
  };

  const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  
  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline"
  };

  const sizeClasses = {
    default: isNative ? "h-12 px-4 py-2" : "h-10 px-4 py-2",
    sm: isNative ? "h-10 px-3 py-1.5" : "h-9 px-3",
    lg: isNative ? "h-14 px-8 py-3" : "h-11 px-8",
    icon: isNative ? "h-12 w-12" : "h-10 w-10"
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// Mobile-specific input component
export const MobileInput: React.FC<{
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  type?: string;
  disabled?: boolean;
}> = ({ 
  placeholder, 
  value, 
  onChange, 
  className, 
  type = "text",
  disabled = false 
}) => {
  const { isNative } = useCapacitor();

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      className={cn(
        "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        isNative && "h-12 text-base", // Mobile sizing
        !isNative && "h-10", // Desktop sizing
        className
      )}
    />
  );
}; 