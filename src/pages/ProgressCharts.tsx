import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatItalianDate } from '../lib/dates'
import type { WaistEntry, WeightEntry } from '../types'

type WeeklyAverage = {
  week: string
  average: number
  count: number
}

type Props = {
  sortedWeights: WeightEntry[]
  sortedWaists: WaistEntry[]
  averages: WeeklyAverage[]
  waistDelta: number | null
}

export function ProgressCharts({
  sortedWeights,
  sortedWaists,
  averages,
  waistDelta,
}: Props) {
  return (
    <>
      <section className="panel fade-in">
        <h2>Peso (kg)</h2>
        {sortedWeights.length === 0 ? (
          <p className="muted">Inserisci il peso iniziale per vedere il grafico.</p>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sortedWeights}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,40,38,0.08)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => formatItalianDate(String(v))}
                  fontSize={11}
                />
                <YAxis domain={['auto', 'auto']} unit=" kg" width={48} fontSize={11} />
                <Tooltip
                  labelFormatter={(v) => formatItalianDate(String(v))}
                  formatter={(value) => [`${value} kg`, 'Peso']}
                />
                <Line
                  type="monotone"
                  dataKey="weightKg"
                  stroke="#1f6b63"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>Medie settimanali</h3>
          <p className="muted tiny" style={{ marginBottom: 8 }}>
            Calcolate solo con almeno 2 misurazioni nella stessa settimana.
          </p>
          {averages.length === 0 ? (
            <p className="muted">Dati insufficienti.</p>
          ) : (
            <ul className="list-plain">
              {averages.map((a) => (
                <li key={a.week}>
                  {a.week}:{' '}
                  {Number.isFinite(a.average)
                    ? `${a.average} kg`
                    : 'dati insufficienti'}{' '}
                  <span className="muted">({a.count} misure)</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="panel fade-in">
        <h2>Girovita (cm)</h2>
        {sortedWaists.length === 0 ? (
          <p className="muted">La prima misura è ancora da inserire.</p>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sortedWaists}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,40,38,0.08)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => formatItalianDate(String(v))}
                  fontSize={11}
                />
                <YAxis domain={['auto', 'auto']} unit=" cm" width={48} fontSize={11} />
                <Tooltip
                  labelFormatter={(v) => formatItalianDate(String(v))}
                  formatter={(value) => [`${value} cm`, 'Girovita']}
                />
                <Line
                  type="monotone"
                  dataKey="waistCm"
                  stroke="#e07a5f"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="muted tiny" style={{ marginTop: 10 }}>
          Variazione complessiva:{' '}
          {waistDelta == null
            ? 'serve almeno 2 misure'
            : `${waistDelta > 0 ? '+' : ''}${waistDelta} cm`}
        </p>
      </section>
    </>
  )
}
