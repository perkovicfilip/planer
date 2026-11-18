# Planer

Lični planer: kalendar sa ispitnim rokovima, organizator po satima, raspored časova,
ishrana (kcal/proteini), trening, navike, ciljevi i beleške.

- **Telefon:** Android aplikacija — preuzmi `Planer.apk` sa strane *Releases* (najnovija verzija).
- **Laptop:** web verzija na GitHub Pages.
- **Podaci:** Supabase (jedna tabela `items`, svako vidi samo svoje — Row Level Security).

## Kako se pravi nova verzija

Svaki push na `main` automatski:
1. pravi web verziju i objavljuje je na GitHub Pages,
2. pravi APK i stavlja ga u release „najnovija“.

## Razvoj

```bash
npm install
npm run dev            # http://localhost:5173  (dodaj ?lokalno=1 za rad bez naloga)
npm run build && npx cap sync android
```

Baza: `supabase/setup.sql` se pokreće jednom u Supabase → SQL Editor.
