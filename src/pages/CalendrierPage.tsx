import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import type { Publication } from '@shared/types';
import { useAccounts } from '../context/AccountsContext';
import { usePublications } from '../context/PublicationsContext';
import Button from '../components/Button';
import PhoneFramePreview from '../components/PhoneFramePreview';
import { api } from '../lib/ipc';
import { formatMonthYear, formatWeekdayShort } from '../lib/dateUtils';

type ViewMode = 'mois' | 'semaine';

export default function CalendrierPage() {
  const navigate = useNavigate();
  const { accounts, getById: getAccountById } = useAccounts();
  const { listBetween, markPublished, cancel } = usePublications();
  const [viewMode, setViewMode] = useState<ViewMode>('mois');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState<Publication | null>(null);

  const rangeStart = useMemo(
    () =>
      viewMode === 'mois'
        ? startOfWeek(startOfMonth(anchorDate), { locale: fr })
        : startOfWeek(anchorDate, { locale: fr }),
    [anchorDate, viewMode]
  );
  const rangeEnd = useMemo(
    () =>
      viewMode === 'mois'
        ? endOfWeek(endOfMonth(anchorDate), { locale: fr })
        : endOfWeek(anchorDate, { locale: fr }),
    [anchorDate, viewMode]
  );

  const days = useMemo(() => eachDayOfInterval({ start: rangeStart, end: rangeEnd }), [rangeStart, rangeEnd]);

  const load = async () => {
    setLoading(true);
    const data = await listBetween(rangeStart.toISOString(), rangeEnd.toISOString());
    setPublications(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart.getTime(), rangeEnd.getTime()]);

  const publicationsForDay = (day: Date) =>
    publications.filter((p) => isSameDay(new Date(p.scheduledAt), day));

  const goPrev = () => setAnchorDate((d) => (viewMode === 'mois' ? subMonths(d, 1) : subWeeks(d, 1)));
  const goNext = () => setAnchorDate((d) => (viewMode === 'mois' ? addMonths(d, 1) : addWeeks(d, 1)));
  const goToday = () => setAnchorDate(new Date());

  const goToNewPublication = (day: Date) => {
    navigate('/planification/nouvelle', { state: { date: day.toISOString() } });
  };

  const handlePublish = async () => {
    if (!previewing) return;
    await api.shell.openTiktokUpload();
  };

  const handleMarkPublished = async () => {
    if (!previewing) return;
    await markPublished(previewing.id);
    setPreviewing(null);
    load();
  };

  const handleCancel = async () => {
    if (!previewing) return;
    await cancel(previewing.id);
    setPreviewing(null);
    load();
  };

  const weekdayLabels = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { locale: fr });
    return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }).map((d) => formatWeekdayShort(d));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendrier</h1>
          <p className="page-subtitle">Vue d'ensemble de vos publications planifiées.</p>
        </div>
        <Button onClick={() => navigate('/planification/nouvelle')}>+ Nouvelle publication</Button>
      </div>

      <div className="calendar-toolbar">
        <div className="calendar-toolbar-controls">
          <Button variant="secondary" size="sm" onClick={goPrev}>
            ← Précédent
          </Button>
          <span className="calendar-month-label">
            {viewMode === 'mois' ? formatMonthYear(anchorDate) : `Semaine du ${format(rangeStart, 'd MMM', { locale: fr })}`}
          </span>
          <Button variant="secondary" size="sm" onClick={goNext}>
            Suivant →
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday}>
            Aujourd'hui
          </Button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button variant={viewMode === 'mois' ? 'primary' : 'secondary'} size="sm" onClick={() => setViewMode('mois')}>
            Mois
          </Button>
          <Button variant={viewMode === 'semaine' ? 'primary' : 'secondary'} size="sm" onClick={() => setViewMode('semaine')}>
            Semaine
          </Button>
        </div>
      </div>

      {loading && <div className="loading-state">Chargement...</div>}

      {!loading && viewMode === 'mois' && (
        <div className="calendar-grid">
          {weekdayLabels.map((label) => (
            <div className="calendar-weekday" key={label}>
              {label}
            </div>
          ))}
          {days.map((day) => {
            const dayPublications = publicationsForDay(day);
            return (
              <div
                key={day.toISOString()}
                className={`calendar-day${isSameMonth(day, anchorDate) ? '' : ' outside-month'}${isToday(day) ? ' today' : ''}`}
                onClick={() => goToNewPublication(day)}
              >
                <span className="calendar-day-number">{format(day, 'd')}</span>
                {dayPublications.map((p) => {
                  const compte = getAccountById(p.compteId);
                  return (
                    <span
                      key={p.id}
                      className="calendar-chip"
                      style={{ background: compte?.couleur ?? '#888' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewing(p);
                      }}
                    >
                      {format(new Date(p.scheduledAt), 'HH:mm')} · {p.titre}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {!loading && viewMode === 'semaine' && (
        <div className="week-grid">
          {days.map((day) => {
            const dayPublications = publicationsForDay(day);
            return (
              <div key={day.toISOString()} className="week-day-column" onClick={() => goToNewPublication(day)}>
                <div className="week-day-header">
                  <span>{formatWeekdayShort(day)}</span>
                  <span>{format(day, 'd')}</span>
                </div>
                {dayPublications.map((p) => {
                  const compte = getAccountById(p.compteId);
                  return (
                    <span
                      key={p.id}
                      className="calendar-chip"
                      style={{ background: compte?.couleur ?? '#888' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewing(p);
                      }}
                    >
                      {format(new Date(p.scheduledAt), 'HH:mm')} · {p.titre}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {previewing && (
        <PhoneFramePreview
          publication={previewing}
          compte={getAccountById(previewing.compteId)}
          onClose={() => setPreviewing(null)}
          onPublish={handlePublish}
          onMarkPublished={handleMarkPublished}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
