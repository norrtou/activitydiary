/**
 * Dialog for creating or editing a category: name and one of the validated
 * color swatches (the color is the category's visual identity throughout the
 * app). Renaming a built-in category converts it to a custom name.
 */
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { db } from '../lib/db';
import { categoryName, categoryQuickLabels } from '../lib/categoryName';
import { SWATCHES, swatchColor } from '../lib/palette';
import type { Category } from '../lib/types';
import { IconClose } from './icons';

interface Props {
  /** null = create a new category. */
  category: Category | null;
  onClose: () => void;
}

export function CategoryDialog({ category, onClose }: Props) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [name, setName] = useState(category ? categoryName(category, t) : '');
  const [swatchId, setSwatchId] = useState(category?.swatchId ?? 'blue');
  const [quickText, setQuickText] = useState(
    category ? categoryQuickLabels(category, t).join(', ') : '',
  );

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const quick = quickText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (category?.id != null) {
      const keepBuiltinName = category.builtinKey && trimmed === categoryName(category, t);
      // Only store an own list when it differs from the translated defaults,
      // so untouched built-ins keep following the app language.
      const defaultQuick = category.builtinKey
        ? t(`quick.${category.builtinKey}`).split('|')
        : [];
      // (a renamed built-in becomes custom, so its list must be stored too)
      const keepDefaultQuick =
        !!keepBuiltinName && quick.join('|') === defaultQuick.join('|');
      await db.categories.update(category.id, {
        // Only detach from i18n if the user actually changed the name.
        ...(keepBuiltinName ? {} : { name: trimmed, builtinKey: undefined }),
        swatchId,
        quickLabels: keepDefaultQuick ? undefined : quick,
      });
    } else {
      const all = await db.categories.toArray();
      const maxSort = all.reduce((m, c) => Math.max(m, c.sortOrder), -1);
      await db.categories.add({
        name: trimmed,
        icon: '',
        swatchId,
        quickLabels: quick.length > 0 ? quick : undefined,
        sortOrder: maxSort + 1,
      });
    }
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-label={category ? t('settings.editCategory') : t('settings.addCategory')}
      onClose={onClose}
      onCancel={onClose}
    >
      <div className="sheet-header">
        <h2>{category ? t('settings.editCategory') : t('settings.addCategory')}</h2>
        <button type="button" className="icon-btn" aria-label={t('a11y.closeDialog')} onClick={onClose}>
          <IconClose />
        </button>
      </div>

      <div className="field">
        <label htmlFor="cat-name">{t('settings.categoryName')}</label>
        <input
          id="cat-name"
          type="text"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="cat-quick">
          {t('settings.quickLabels', { optional: t('common.optional') })}
        </label>
        <p className="muted">{t('settings.quickLabelsHint')}</p>
        <input
          id="cat-quick"
          type="text"
          value={quickText}
          maxLength={300}
          onChange={(e) => setQuickText(e.target.value)}
        />
      </div>

      <fieldset className="chip-group">
        <legend>{t('settings.categoryColor')}</legend>
        <div className="chip-row">
          {SWATCHES.map((s) => (
            <label key={s.id} className="chip swatch-chip">
              <input
                type="radio"
                name="swatch"
                checked={swatchId === s.id}
                onChange={() => setSwatchId(s.id)}
                aria-label={s.id}
              />
              <span
                style={{
                  background: swatchColor(s.id),
                  borderColor: swatchId === s.id ? 'var(--ink)' : 'transparent',
                }}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="sheet-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button type="button" className="btn btn-primary" disabled={!name.trim()} onClick={save}>
          {t('common.save')}
        </button>
      </div>
    </dialog>
  );
}
