import { ChevronRight } from 'lucide-react'
import { NAV } from '../nav'
import { Card, PageHeader } from '../ui/kit'

export default function Vise() {
  const items = NAV.filter((n) => !n.mobile)
  return (
    <div>
      <PageHeader title="Više" />
      <Card className="divide-y divide-line">
        {items.map((n) => (
          <a key={n.route} href={'#/' + n.route} className="flex items-center gap-3 px-4 py-3.5">
            <span className="text-ink-soft">{n.icon}</span>
            <span className="flex-1">{n.label}</span>
            <ChevronRight size={16} className="text-ink-faint" />
          </a>
        ))}
      </Card>
    </div>
  )
}
