import { useEffect, useState } from 'react'

export type Route =
  | 'danas'
  | 'kalendar'
  | 'dan'
  | 'ishrana'
  | 'trening'
  | 'navike'
  | 'predmeti'
  | 'raspored'
  | 'ciljevi'
  | 'beleske'
  | 'podesavanja'
  | 'vise'
  | 'finansije'
  | 'lista'
  | 'projekti'

function parseHash(): { route: Route; param?: string } {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [route, param] = h.split('/')
  return { route: (route || 'danas') as Route, param }
}

export function useRoute() {
  const [r, setR] = useState(parseHash)
  useEffect(() => {
    const on = () => {
      setR(parseHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}

export function go(route: Route, param?: string) {
  window.location.hash = '/' + route + (param ? '/' + param : '')
}
