/**
 * The vertical 24-hour timeline of one day.
 *
 * Interaction model:
 *  - Every hour has an (invisible until focus/hover) slot button — tapping or
 *    keyboard-activating it starts a new entry at that hour. This keeps the
 *    timeline fully usable by touch and keyboard.
 *  - With a mouse or pen you can additionally press and drag over empty space
 *    to select an exact range. Drag is disabled for touch so it never fights
 *    page scrolling.
 *  - Existing entries are buttons that open the editor.
 */
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { swatchColor, swatchWash } from '../lib/palette';
import { categoryName } from '../lib/categoryName';
import { minutesToHHMM, nowMinutes, snapMinutes, toDateKey, DAY_MIN } from '../lib/time';
import { useSettings } from '../lib/settings';
import type { Category, Entry } from '../lib/types';

export const HOUR_PX = 52;

export interface RangeDraft {
  startMin: number;
  endMin: number;
}

interface Props {
  date: string;
  entries: Entry[];
  categories: Map<number, Category>;
  onCreate: (range: RangeDraft) => void;
  onEdit: (entry: Entry) => void;
}

/** Assign overlapping entries to side-by-side lanes. */
function layoutLanes(entries: Entry[]): Map<number, { lane: number; lanes: number }> {
  const result = new Map<number, { lane: number; lanes: number }>();
  let cluster: Entry[] = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];

  const flush = () => {
    for (const e of cluster) {
      const info = result.get(e.id!);
      if (info) info.lanes = laneEnds.length;
    }
    cluster = [];
    laneEnds = [];
  };

  for (const e of entries) {
    if (e.startMin >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= e.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(e.endMin);
    } else {
      laneEnds[lane] = e.endMin;
    }
    result.set(e.id!, { lane, lanes: 0 });
    cluster.push(e);
    clusterEnd = Math.max(clusterEnd, e.endMin);
  }
  flush();
  return result;
}

export function DayTimeline({ date, entries, categories, onCreate, onEdit }: Props) {
  const { t, lang } = useI18n();
  const settings = useSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<RangeDraft | null>(null);
  const dragOrigin = useRef<number | null>(null);
  const didDrag = useRef(false);
  const [, forceTick] = useState(0);

  const isToday = date === toDateKey();

  // Re-render every minute so the "now" line moves.
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [isToday]);

  // Scroll the configured day-start hour (or the now line) into view once.
  useEffect(() => {
    const target = isToday ? Math.max(nowMinutes() - 120, 0) : settings.dayStartHour * 60;
    const el = containerRef.current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY + (target / 60) * HOUR_PX - 100;
    window.scrollTo({ top: Math.max(0, y) });
    // Only on mount / date change — not on settings changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const yToMinutes = (clientY: number): number => {
    const rect = containerRef.current!.getBoundingClientRect();
    const min = ((clientY - rect.top) / HOUR_PX) * 60;
    return snapMinutes(min, settings.slotMinutes);
  };

  const onPointerDown = (ev: React.PointerEvent) => {
    // Drag-to-select is mouse/pen only; touch scrolls the page instead.
    if (ev.pointerType === 'touch' || ev.button !== 0) return;
    if ((ev.target as HTMLElement).closest('.tl-entry')) return;
    dragOrigin.current = yToMinutes(ev.clientY);
    didDrag.current = false;
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    if (dragOrigin.current === null) return;
    const cur = yToMinutes(ev.clientY);
    if (cur !== dragOrigin.current) {
      didDrag.current = true;
      containerRef.current?.setPointerCapture(ev.pointerId);
      setDrag({
        startMin: Math.min(dragOrigin.current, cur),
        endMin: Math.max(dragOrigin.current, cur),
      });
    }
  };

  const onPointerUp = () => {
    if (drag && didDrag.current && drag.endMin > drag.startMin) {
      onCreate(drag);
    }
    dragOrigin.current = null;
    setDrag(null);
  };

  const lanes = layoutLanes(entries);
  const hourFmt = new Intl.DateTimeFormat(lang === 'sv' ? 'sv-SE' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="tl"
      role="group"
      aria-label={t('today.timeline')}
      style={{ height: 24 * HOUR_PX }}
    >
      <div className="tl-hours" aria-hidden>
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="tl-hour-label" style={{ top: h * HOUR_PX }}>
            {minutesToHHMM(h * 60)}
          </span>
        ))}
      </div>

      <div
        ref={containerRef}
        className="tl-blocks"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragOrigin.current = null;
          setDrag(null);
        }}
      >
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="tl-gridline" style={{ top: h * HOUR_PX }} aria-hidden />
        ))}

        {/* Keyboard/tap targets for empty space, one per hour. */}
        {Array.from({ length: 24 }, (_, h) => (
          <button
            key={`slot-${h}`}
            type="button"
            className="tl-slot"
            style={{ top: h * HOUR_PX, height: HOUR_PX }}
            aria-label={`${t('today.addActivity')} ${minutesToHHMM(h * 60)}`}
            onClick={() => {
              if (didDrag.current) return;
              onCreate({ startMin: h * 60, endMin: Math.min((h + 1) * 60, DAY_MIN) });
            }}
          />
        ))}

        {entries.map((e) => {
          const cat = categories.get(e.categoryId);
          if (!cat) return null;
          const { lane, lanes: laneCount } = lanes.get(e.id!) ?? { lane: 0, lanes: 1 };
          const height = ((e.endMin - e.startMin) / 60) * HOUR_PX;
          const name = e.label || categoryName(cat, t);
          const width = 100 / laneCount;
          return (
            <button
              key={e.id}
              type="button"
              className="tl-entry"
              style={{
                top: (e.startMin / 60) * HOUR_PX,
                height: Math.max(height, 14),
                left: `${lane * width}%`,
                width: `calc(${width}% - 4px)`,
                background: swatchWash(cat.swatchId),
                borderLeftColor: swatchColor(cat.swatchId),
              }}
              aria-label={t('a11y.entrySummary', {
                category: name,
                start: minutesToHHMM(e.startMin),
                end: minutesToHHMM(e.endMin),
              })}
              onClick={() => onEdit(e)}
            >
              {height >= 30 && (
                <span className="tl-entry-name">
                  {name}
                </span>
              )}
              {height >= 46 && (
                <span className="tl-entry-time">
                  {minutesToHHMM(e.startMin)}–{minutesToHHMM(e.endMin)}
                </span>
              )}
            </button>
          );
        })}

        {drag && (
          <div
            className="tl-drag"
            aria-hidden
            style={{
              top: (drag.startMin / 60) * HOUR_PX,
              height: ((drag.endMin - drag.startMin) / 60) * HOUR_PX,
            }}
          >
            {minutesToHHMM(drag.startMin)}–{minutesToHHMM(drag.endMin)}
          </div>
        )}

        {isToday && (
          <div
            className="tl-now"
            style={{ top: (nowMinutes() / 60) * HOUR_PX }}
            role="img"
            aria-label={`${t('today.nowLine')}: ${hourFmt.format(new Date())}`}
          />
        )}
      </div>
    </div>
  );
}
