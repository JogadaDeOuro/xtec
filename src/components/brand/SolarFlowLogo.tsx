import horizontalAsset from '@/assets/brand/solarflow/logo-horizontal.png.asset.json';
import darkAsset from '@/assets/brand/solarflow/logo-dark.png.asset.json';
import symbolAsset from '@/assets/brand/solarflow/symbol.png.asset.json';
import { cn } from '@/lib/utils';

type SolarFlowLogoProps = {
  variant?: 'horizontal' | 'symbol';
  tone?: 'light' | 'dark' | 'auto';
  className?: string;
};

export function SolarFlowLogo({ variant = 'horizontal', tone = 'auto', className }: SolarFlowLogoProps) {
  if (variant === 'symbol') {
    return <img src={symbolAsset.url} alt="SolarFlow" className={cn('object-contain', className)} />;
  }

  if (tone === 'auto') {
    return (
      <span className={cn('inline-flex items-center', className)}>
        <img src={horizontalAsset.url} alt="SolarFlow" className="h-full w-full object-contain dark:hidden" />
        <img src={darkAsset.url} alt="SolarFlow" className="hidden h-full w-full object-contain dark:block" />
      </span>
    );
  }

  return (
    <img
      src={tone === 'dark' ? darkAsset.url : horizontalAsset.url}
      alt="SolarFlow"
      className={cn('object-contain', className)}
    />
  );
}