# Carousel Creator

Carousel Creator is a basic framework for automating the creation of social-media carousels, initially focused on Instagram.

The first intended use case is helping local newsletters and local media outlets turn structured content—such as **“Top 10 events in [city]”**—into a clear, publishable carousel.

## Project status

This project is at the initial framework stage. The repository currently contains the product brief only; implementation choices, integrations, and deployment details are still to be defined.

## Goals

- Make it faster to transform local content into a carousel.
- Start from a repeatable content structure rather than a blank design.
- Support Instagram as the primary publishing format.
- Leave room for other channels and local-content formats later.
- Keep the workflow simple enough for small editorial teams.

## Intended workflow

1. Select a content format, for example `Top 10 events in Lisbon`.
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

## Development notes

Technical decisions are intentionally left open until the first implementation pass. Before building, define:

- The input format and validation rules.
- The rendering/export approach.
- The supported image dimensions and file formats.
- Template and branding configuration.
- Whether generated content is local-only or backed by a service.
- How drafts, revisions, and exported assets are stored.

## License

Not defined yet.
