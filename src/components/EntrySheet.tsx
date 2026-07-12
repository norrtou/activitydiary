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
import { categoryName, categoryQuickLabels } from '../lib/categoryName';
import { swatchColor } from '../lib/palette';
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

export function EntrySheet({ draft, categories, onClose }: Props) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Kept in state (not read from the prop) so "at the same time I also…"
  // can save the current entry and switch the sheet to a fresh one.
  const [editing, setEditing] = useState(draft.entry);
  const [categoryId, setCategoryId] = useState<number | null>(
    draft.entry?.categoryId ?? null,
  );
  const [start, setStart] = useState(minutesToHHMM(draft.startMin));
  const [end, setEnd] = useState(minutesToHHMM(draft.endMin === 1440 ? 1439 : draft.endMin));
  const [label, setLabel] = useState(editing?.label ?? '');
  const [energy, setEnergy] = useState<EnergyRating | undefined>(editing?.energy);
  const [mood, setMood] = useState<MoodRating | undefined>(editing?.mood);
  const [note, setNote] = useState(editing?.note ?? '');
  const [showMore, setShowMore] = useState(
    draft.entry != null &&
      (draft.entry.energy != null || draft.entry.mood != null || !!draft.entry.note),
  );
  const [error, setError] = useState<string | null>(null);
  // Name of the activity that was just saved via "at the same time I also…".
  // Non-null puts the sheet in parallel mode: new title, banner, scroll to top.
  const [parallelFrom, setParallelFrom] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const quickLabels = selectedCategory ? categoryQuickLabels(selectedCategory, t) : [];

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const startMin = parseHHMM(start);
  const endMin = parseHHMM(end);
  const crossesMidnight =
    startMin != null && endMin != null && endMin <= startMin && endMin > 0;

  const saveEntry = async (): Promise<boolean> => {
    if (categoryId == null) return false;
    if (startMin == null || endMin == null || endMin === startMin) {
      setError(t('entry.timeError'));
      return false;
    }
    const extras = {
      categoryId,
      label: label.trim() || undefined,
      energy,
      mood,
      note: note.trim() || undefined,
    };
    const pieces = splitOverMidnight(draft.date, startMin, endMin);
    await db.transaction('rw', db.entries, async () => {
      if (editing?.id != null) await db.entries.delete(editing.id);
      await db.entries.bulkAdd(pieces.map((p) => ({ ...p, ...extras })));
    });
    return true;
  };

  const save = async () => {
    if (await saveEntry()) onClose();
  };

  /**
   * Save the current entry, then reset the sheet to a new entry on the same
   * time range — the quick path for registering overlapping activities
   * ("watching TV while working", "audiobook while cooking", …).
   */
  const saveAndAddParallel = async () => {
    if (!(await saveEntry())) return;
    const savedName = label.trim() || (selectedCategory ? categoryName(selectedCategory, t) : '');
    setEditing(undefined);
    setCategoryId(null);
    setLabel('');
    setEnergy(undefined);
    setMood(undefined);
    setNote('');
    setShowMore(false);
    setError(null);
    setParallelFrom(savedName);
    // The button sits far down the sheet — without this the switch to a new
    // entry is invisible on a phone. Show the new title/banner and announce it.
    // After the re-render, jump to the top of the sheet — the jump plus the
    // new title/banner IS the mode switch. Instant two-argument scrollTo:
    // supported by every phone browser, cannot be interrupted mid-animation.
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      dialogRef.current?.scrollTo(0, 0);
    });
  };

  /** Switching category clears a label that was one of the old quick picks. */
  const pickCategory = (cat: Category) => {
    if (cat.id !== categoryId && quickLabels.includes(label)) setLabel('');
    setCategoryId(cat.id!);
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
      aria-label={
        parallelFrom != null
          ? t('entry.parallelTitle')
          : editing
            ? t('entry.editTitle')
            : t('entry.newTitle')
      }
      onClose={onClose}
      onCancel={onClose}
    >
      <div className="sheet-header">
        <h2 ref={headingRef} tabIndex={-1}>
          {parallelFrom != null
            ? t('entry.parallelTitle')
            : editing
              ? t('entry.editTitle')
              : t('entry.newTitle')}
        </h2>
        <button type="button" className="icon-btn" aria-label={t('a11y.closeDialog')} onClick={onClose}>
          <IconClose />
        </button>
      </div>

      {parallelFrom != null && (
        <p className="parallel-notice" role="status">
          <strong>{t('entry.parallelSaved', { name: parallelFrom })}</strong>{' '}
          {t('entry.parallelNext', { start, end })}
        </p>
      )}

      <fieldset className="chip-group" aria-required>
        <legend>{t('entry.category')}</legend>
        <div className="chip-grid">
          {categories.map((cat) => (
            <label
              key={cat.id}
              className="chip"
              style={{ '--chip-color': swatchColor(cat.swatchId) } as React.CSSProperties}
            >
              <input
                type="radio"
                name="category"
                checked={categoryId === cat.id}
                onChange={() => pickCategory(cat)}
              />
              <span>
                <span
                  className="legend-dot"
                  style={{ background: swatchColor(cat.swatchId) }}
                  aria-hidden
                />
                {categoryName(cat, t)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {quickLabels.length > 0 && (
        <fieldset className="chip-group">
          <legend>{t('entry.quick')}</legend>
          <div className="chip-row">
            {quickLabels.map((q) => (
              <label key={q} className="chip">
                <input
                  type="radio"
                  name="quick-label"
                  checked={label === q}
                  onChange={() => setLabel(q)}
                  onClick={() => label === q && setLabel('')}
                />
                <span>{q}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

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
        className="btn parallel-btn"
        disabled={categoryId == null}
        onClick={saveAndAddParallel}
      >
        {t('entry.parallel')}
      </button>

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
            <p className="muted">{t('entry.moodHint')}</p>
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
                  <span aria-hidden>{v}</span>
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
