/**
 * 24-hour time picker: an hour dropdown + a minute dropdown.
 *
 * Native <input type="time"> follows the *browser's* locale (Chrome even
 * ignores the lang attribute), which shows AM/PM to Swedish users with
 * English browsers. Two selects are unambiguous 24-hour everywhere, fully
 * keyboard accessible, and open native wheels on mobile.
 */
import { useT } from '../i18n';

interface Props {
  id: string;
  /** 'HH:mm' */
  value: string;
  onChange: (value: string) => void;
}

const MINUTE_STEP = 5;

export function TimeSelect({ id, value, onChange }: Props) {
  const t = useT();
  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText) || 0;
  const minute = Number(minuteText) || 0;

  // 5-minute steps, plus the current value when it falls off the grid
  // (e.g. an imported entry at 07:23 must stay selectable).
  const minutes = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);
  if (!minutes.includes(minute)) minutes.push(minute);
  minutes.sort((a, b) => a - b);

  const emit = (h: number, m: number) =>
    onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

  return (
    <div className="time-select">
      <select
        id={id}
        aria-label={t('a11y.hour')}
        value={hour}
        onChange={(e) => emit(Number(e.target.value), minute)}
      >
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, '0')}
          </option>
        ))}
      </select>
      <span aria-hidden>:</span>
      <select
        aria-label={t('a11y.minute')}
        value={minute}
        onChange={(e) => emit(hour, Number(e.target.value))}
      >
        {minutes.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, '0')}
          </option>
        ))}
      </select>
    </div>
  );
}
