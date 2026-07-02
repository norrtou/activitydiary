/**
 * Bottom-sheet editor for creating and editing an activity entry.
 *
 * Uses the native <dialog> element for free focus trapping and Escape
 * handling. The everyday fields (category, times, name) are always visible;
 * energy, mood and note sit behind a "More details" disclosure so the common
 * flow stays two taps: pick category → save.
 */
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { db } from '../lib/db';
import { categoryName } from '../lib/categoryName';
import { swatchColor } from '../lib/palette';
import { resolveTheme, useSettings } from '../lib/settings';
import { minutesToHHMM, parseHHMM, splitOverMidnight } from '../lib/time';
import type { Category, Entry, EnergyRating, MoodRating } from '../lib/types';
import { IconClose } from './icons';
import { TimeSelect } from './TimeSelect';

export interface SheetDraft {
  date: string;
  startMin: number;
  endMin: number;
  /** Present when editing an existing entry. */
  entry?: Entry;
}

interface Props {
  draft: SheetDraft;
  categories: Category[];
  onClose: () => void;
}

const ENERGY_VALUES: EnergyRating[] = [-2, -1, 0, 1, 2];
const MOOD_VALUES: MoodRating[] = [1, 2, 3, 4, 5];
const MOOD_EMOJI: Record<MoodRating, string> = { 1: '😞', 2: '🙁', 3: '😐', 4: '🙂', 5: '😄' };

export function EntrySheet({ draft, categories, onClose }: Props) {
  const { t } = useI18n();
  const settings = useSettings();
  const mode = resolveTheme(settings.theme);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const editing = draft.entry;
  const [categoryId, setCategoryId] = useState<number | null>(
    editing?.categoryId ?? null,
  );
  const [start, setStart] = useState(minutesToHHMM(draft.startMin));
  const [end, setEnd] = useState(minutesToHHMM(draft.endMin === 1440 ? 1439 : draft.endMin));
  const [label, setLabel] = useState(editing?.label ?? '');
  const [energy, setEnergy] = useState<EnergyRating | undefined>(editing?.energy);
  const [mood, setMood] = useState<MoodRating | undefined>(editing?.mood);
  const [note, setNote] = useState(editing?.note ?? '');
  const [showMore, setShowMore] = useState(
    editing != null && (editing.energy != null || editing.mood != null || !!editing.note),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const startMin = parseHHMM(start);
  const endMin = parseHHMM(end);
  const crossesMidnight =
    startMin != null && endMin != null && endMin <= startMin && endMin > 0;

  const save = async () => {
    if (categoryId == null) return;
    if (startMin == null || endMin == null) {
      setError(t('entry.timeError'));
      return;
    }
    const extras = {
      categoryId,
      label: label.trim() || undefined,
      energy,
      mood,
      note: note.trim() || undefined,
    };
    const endForSplit = endMin === startMin ? startMin : endMin; // zero-length guard below
    if (endMin === startMin) {
      setError(t('entry.timeError'));
      return;
    }
    const pieces = splitOverMidnight(draft.date, startMin, endForSplit);
    await db.transaction('rw', db.entries, async () => {
      if (editing?.id != null) await db.entries.delete(editing.id);
      await db.entries.bulkAdd(pieces.map((p) => ({ ...p, ...extras })));
    });
    onClose();
  };

  const remove = async () => {
    if (editing?.id == null) return;
    if (!window.confirm(t('entry.deleteConfirm'))) return;
    await db.entries.delete(editing.id);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-label={editing ? t('entry.editTitle') : t('entry.newTitle')}
      onClose={onClose}
      onCancel={onClose}
    >
      <div className="sheet-header">
        <h2>{editing ? t('entry.editTitle') : t('entry.newTitle')}</h2>
        <button type="button" className="icon-btn" aria-label={t('a11y.closeDialog')} onClick={onClose}>
          <IconClose />
        </button>
      </div>

      <fieldset className="chip-group" aria-required>
        <legend>{t('entry.category')}</legend>
        <div className="chip-grid">
          {categories.map((cat) => (
            <label
              key={cat.id}
              className="chip"
              style={{ '--chip-color': swatchColor(cat.swatchId, mode) } as React.CSSProperties}
            >
              <input
                type="radio"
                name="category"
                checked={categoryId === cat.id}
                onChange={() => setCategoryId(cat.id!)}
              />
              <span>
                <span aria-hidden>{cat.icon}</span> {categoryName(cat, t)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="time-row">
        <div className="field">
          <label htmlFor="entry-start">{t('entry.start')}</label>
          <TimeSelect id="entry-start" value={start} onChange={setStart} />
        </div>
        <div className="field">
          <label htmlFor="entry-end">{t('entry.end')}</label>
          <TimeSelect id="entry-end" value={end} onChange={setEnd} />
        </div>
      </div>
      {crossesMidnight && <p className="muted">{t('entry.crossesMidnight')}</p>}

      <div className="field">
        <label htmlFor="entry-label">
          {t('entry.label', { optional: t('common.optional') })}
        </label>
        <input
          id="entry-label"
          type="text"
          value={label}
          maxLength={80}
          placeholder={t('entry.labelPlaceholder')}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="disclosure"
        aria-expanded={showMore}
        onClick={() => setShowMore((v) => !v)}
      >
        {t('entry.more')} {showMore ? '▴' : '▾'}
      </button>

      {showMore && (
        <div className="more-fields">
          <fieldset className="chip-group">
            <legend>{t('entry.energy')}</legend>
            <p className="muted">{t('entry.energyHint')}</p>
            <div className="chip-row">
              {ENERGY_VALUES.map((v) => (
                <label key={v} className="chip chip-small">
                  <input
                    type="radio"
                    name="energy"
                    checked={energy === v}
                    onChange={() => setEnergy(energy === v ? undefined : v)}
                    onClick={() => energy === v && setEnergy(undefined)}
                    aria-label={t(`entry.energy.${v}` as const)}
                  />
                  <span aria-hidden>{v > 0 ? `+${v}` : v}</span>
                </label>
              ))}
            </div>
            {energy != null && <p className="muted">{t(`entry.energy.${energy}` as const)}</p>}
          </fieldset>

          <fieldset className="chip-group">
            <legend>{t('entry.mood')}</legend>
            <div className="chip-row">
              {MOOD_VALUES.map((v) => (
                <label key={v} className="chip chip-small">
                  <input
                    type="radio"
                    name="mood"
                    checked={mood === v}
                    onChange={() => setMood(v)}
                    onClick={() => mood === v && setMood(undefined)}
                    aria-label={t(`entry.mood.${v}` as const)}
                  />
                  <span aria-hidden>{MOOD_EMOJI[v]}</span>
                </label>
              ))}
            </div>
            {mood != null && <p className="muted">{t(`entry.mood.${mood}` as const)}</p>}
          </fieldset>

          <div className="field">
            <label htmlFor="entry-note">
              {t('entry.note', { optional: t('common.optional') })}
            </label>
            <textarea
              id="entry-note"
              value={note}
              maxLength={500}
              placeholder={t('entry.notePlaceholder')}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      <div className="sheet-actions">
        {editing && (
          <button type="button" className="btn btn-danger" onClick={remove}>
            {t('common.delete')}
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={categoryId == null}
          onClick={save}
        >
          {t('common.save')}
        </button>
      </div>
    </dialog>
  );
}
