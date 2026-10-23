import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { quoteNumber } from '@/lib/custom-quote';

/** Keep the decimal separator while typing, instead of truncating 2,5 to 25. */
export function QuoteNumberInput({ value, onValueChange, ...props }: Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> & { value: number; onValueChange: (value: number) => void }) {
  const [raw, setRaw] = useState(value ? String(value) : '');
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setRaw(value ? String(value) : ''); }, [value, focused]);
  return <Input {...props} type="text" inputMode="numeric" value={raw} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={e => { const text = e.target.value.replace(/[^\d.,]/g, ''); setRaw(text); onValueChange(quoteNumber(text)); }} />;
}