# Budget landing page

`/budget/` is a standalone static version of the public budget landing page from
Unique, adapted to stay on `haganenet-barbur.com`. It requires no framework,
server proxy, iframe, or third-party authentication on the Barbur domain.

Source of the design and offer: `app/components/kindergarten/landing.tsx` and
`landing.css` in the Unique website, as available locally on 2026-11-06.
The fictional review carousel was omitted. FAQ sections use native HTML details.

The header login link opens the Google account chooser through Unique’s
`/auth/google?entry=kindergarten&next=%2Fkindergarten` endpoint. The
sign-in/registration button in the sign-in section points to
`https://unique-center.co.il/kindergarten#login`. Google sign-in and all account
and budget operations remain on Unique. The page does not collect credentials.

This is a static copy, not a live mirror. Update `index.html` here when pricing,
trial conditions, scan limits, or marketing copy change in the source landing
page. The homepage popup lives in the root `index.html`. Its visibility retains
the existing `homepagePromoConfig.enabled` browser-local admin setting.

Deploy these files through the existing Barbur deployment along with
`images/budget/logo.webp` and the updated root HTML/CSS files. No DNS changes
are needed for `/budget/`.
