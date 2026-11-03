# Design notes: Mosby's Files (mosbyfiles.com)

Notes from looking at <https://www.mosbyfiles.com/> on 3 November 2026, at desktop (1024 px), tablet (768 x 1024) and phone (390 x 844, iPhone size) widths, kept as a reference for a possible later restyle of IALqBank. Nothing here has been applied to the site. Phone checks were done in Chromium at iPhone size, not in iOS Safari itself.

The site is a Nuxt app by Tubik Studio about American Modernist architects. It has two kinds of page: a home page (a stack of coloured folders) and a case page per architect (a dossier inside a folder).

## Look

| Part | What it uses |
| --- | --- |
| Ground | Near-black `#191919` everywhere; the header is the same colour at 80% opacity with a blur behind it, fixed to the top. |
| Text | Warm off-white `#fdfaf7`; secondary text grey `#787a7f`. |
| Display type | Founders Grotesk Bold (Klim, commercial), uppercase, very large (125 px on desktop, line height 0.8), centred on the home page, left-aligned on case pages. The hero title animates in letter by letter (`line > word > char-mask > char`). |
| Text type | Signifier (Klim, commercial), a sharp book serif, for the subtitle, folder tab labels and the body copy. Base size 14 px; the hero subtitle is about 16.5 px. |
| Small labels and data | IBM Plex Mono (free, Google Fonts): folder captions, "Born:" and "Died:" fields, the folder descriptions. |
| Colour | Flat, fully saturated folder colours: blue `#1e4bd7`, teal green, purple, red, yellow and black. Each category of architects is one folder colour; each architect's tab can be a different colour from its folder. |
| Corners and depth | 4 px radius on folders; soft shadows (`0 -1px 8px rgba(0,0,0,.15)`) where folders overlap; the stack has a 3000 px perspective and a -3 degree tilt variable for its scroll motion. |

Open-source stand-ins if this look is ever used: IBM Plex Mono as it is; for the condensed display face, a heavy condensed grotesque such as Archivo at a narrow width and 800 weight; for the serif, a sharp text serif with a similar contrast. Founders Grotesk and Signifier must not be copied without a licence.

## Home page

- First screen: the giant title "AMERICAN MODERNISM" with a three-line grey serif subtitle under it, centred, and nothing else. On a phone the title wraps to two lines and the stack of folders peeks in at the bottom of the screen, which invites the scroll.
- Below it, a stack of full-width coloured folders, one per category (Organic & Early Modernism, Expressive, Monumental Modernism, Contextual & Transitional). Each folder shows only its top strip with its tabs, overlapping the one above, like files in a drawer.
- Each folder has rounded-shoulder tabs along its top edge, one per architect, with the name in the serif. The tab shape is an SVG with a stretchable middle (`tag__start`, `tag__middle`, `tag__end`), so one shape fits any name length.
- The category name sits at the right end of each folder strip in small mono type with a chevron. The open (last) folder shows the category description in mono and a row of small line-drawn architectural icons along its bottom.
- Clicking a folder or tab opens that architect's case page.
- On a phone the folders run edge to edge and the tabs wrap onto the next strip; on a tablet the layout is the same as desktop with smaller type.

## Case page

- A big uppercase title (the architect's name) over a coloured folder that holds an off-white paper sheet.
- The sheet looks like a file: blue punched binder holes down the left edge, a paper clip at the top, a black-and-white portrait photo set slightly crooked, the dates of birth and death in mono with bold labels, and the biography in the serif with a large drop cap (90 px).
- The other architects in the same folder are vertical tabs on the right edge of the folder (text rotated 90 degrees). The active one matches the folder colour.
- Below the sheet is a "scrapbook" of notes, photos, photo stacks and a video that can be dragged around the page.
- On a phone the sheet becomes one column (photo, dates, then text), the side tabs stay on the right edge, and the title shrinks into the fixed header as you scroll.

## What works less well

- On the phone case page there is a dark strip on the right side of the screen beside the folder while scrolling; the folder does not fill the width.
- Body text is small (14 px base), and the grey subtitle `#787a7f` on `#191919` is about 4.1:1 contrast, under the 4.5:1 WCAG AA minimum for normal text.
- Long mono paragraphs (the folder descriptions) are tiring to read.
- The case pages load blank for a moment while the scripts start.
- The draggable scrapbook is fun but has no obvious keyboard equivalent.

## Ideas it suggested for IALqBank

Kept for later; none of these are built.

- Each subject as one folder colour, and the Units as its tabs on the landing page, so a student goes straight to a Unit.
- A question card as a paper sheet inside its subject's folder: the white paper screenshots already look like paper, which suits a dark ground.
- Mono only for data: paper codes, item IDs, marks and years.
- The side-tab pattern for moving between the topics of one Unit.
- Raise the body text to at least 16 px and keep secondary text above 4.5:1, which the original does not.
