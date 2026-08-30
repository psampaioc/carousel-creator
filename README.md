# Carousel Creator

Carousel Creator is a basic framework for automating the creation of social-media carousels, initially focused on Instagram.

The first intended use case is helping a solo Coimbra newsletter operator turn sourced engineering and technology events into a clear, publishable weekly carousel.

## Project status

The private Next.js, Clerk, and Convex foundation is under active development. Event intake, editorial review, template editing, and export are tracked as later implementation slices.

## Goals

- Make it faster to transform local content into a carousel.
- Start from a repeatable content structure rather than a blank design.
- Support Instagram as the primary publishing format.
- Leave room for other channels and local-content formats later.
- Keep the workflow simple enough for small editorial teams.

## Intended workflow

1. Select the next Monday-Sunday calendar week for Coimbra and nearby areas.
2. Enter or import the items to include.
3. Add supporting details such as descriptions, dates, locations, links, and images.
4. Generate a consistent set of carousel slides.
5. Review and edit the generated content.
6. Export the carousel for publishing.

The review step is important: generated copy and event details should be checked by a human before publication.

## Initial content model

An initial carousel could contain:

- A cover slide with the topic and city.
- One slide per item, with a title, short description, date or time, location, and optional image.
- A closing slide with a call to action, source information, or publisher branding.

The model should remain flexible enough to support formats beyond event lists, such as local guides, recommendations, and weekly roundups.

## Scope for the first version

The first version should focus on:

- A small set of reusable carousel templates.
- Structured manual input for local content.
- Basic text and image placement.
- Slide preview and editing before export.
- Export in an Instagram-friendly format.

## Out of scope initially

- Fully autonomous publishing without review.
- Automatic fact-checking or event verification.
- Support for every social-media platform.
- Advanced brand-management features for large organizations.
- Complex analytics or audience optimization.

## Success criteria

The initial framework will be useful when a user can:

1. Create a carousel from a structured list of local items.
2. See the complete carousel before export.
3. Correct text, images, and ordering manually.
4. Export a consistent result suitable for Instagram publishing.

## Future directions

- Import content from spreadsheets, forms, feeds, or a CMS.
- Add reusable publisher branding and design themes.
- Support additional carousel types and aspect ratios.
- Add assisted copy generation with editable suggestions.
- Export or adapt content for other social and newsletter formats.
- Add scheduling and publishing integrations after the review workflow is reliable.

## Local development

Use Node.js 22 (`nvm use` reads `.nvmrc`), then install and validate the project:

```bash
npm install
cp .env.example .env.local
npm test
npm run typecheck
npm run lint
npm run build
```

Configure Clerk and Convex using the variable names in `.env.example`. Keep all values out of git. The operator email must be configured in both the Vercel and Convex environments. Run `npx convex dev` after connecting a development deployment; it validates the schema and creates Convex's generated type files.

## License

Not defined yet.
