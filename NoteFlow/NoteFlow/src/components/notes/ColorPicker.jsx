import { Check } from 'lucide-react';
import { NOTE_COLORS } from '../../data/constants';

export default function ColorPicker({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Note color" className="flex flex-wrap gap-2">
      {NOTE_COLORS.map(({ id, label }) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            data-color={id}
            onClick={() => onChange(id)}
            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 ${
              selected ? 'border-ink' : 'border-transparent'
            } ${id === 'none' ? 'bg-sunken' : 'bg-[rgb(var(--note))]'}`}
          >
            {selected && <Check className={`h-4 w-4 ${id === 'none' ? 'text-ink' : 'text-white dark:text-canvas'}`} aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
