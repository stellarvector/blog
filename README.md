# Stellar Vector Blog

Official walkthroughs and strategies from our latest Capture The Flag competitions.

Chrome, tokens and shared components come from `github.com/stellarvector/theme`; read its README before adding a component here.

## Adding a writeup

1. Add your profile in `data/authors.yml` if you haven't already
2. Create a new markdown file in `content/writeups/YYYY/SLUGGIFIED_CTF_NAME/challenge.md`.
    Create the directories if necessary (e.g. first writeup of the year) but make sure the ctf directory does not already exist.
3. Add the following frontmatter:

```yaml
---
title: "Challenge Name"          # Shown verbatim: write it as it should appear
date: YYYY-MM-DD
author: "YourName"              # As defined in data/authors.yml
category: "ChallengeCategory"   # E.g. crypto, web, reversing etc. as defined by the CTF
tags: ["add", "tags", "here"]   # Tags related to the content
summary: "A summary of max 200 characters for displaying in the writeup cards on the site, this teases the visitor to read your writeup"
hasMathNotation: false          # Change to true if you use mathjax's $ or $$
featured: false                 # An admin will decide on this
---
```

4. Place any images in `static/assets/images/YYYY/SLUGGIFIED_CTF_NAME/` and reference them as `/assets/images/YYYY/SLUGGIFIED_CTF_NAME/image.png`.

Titles are rendered exactly as written — in the card, the `<h1>` and the browser tab — so
that challenge names such as `GateCrash` keep their casing. Write the title the way you want
it to read; do not use the file slug.

## Running locally

1. Install Hugo (extended version, >= 0.161.0) and Node.js.
2. Run `npm install` to install the Tailwind CSS toolchain (Hugo shells out to it during the build).
3. Run `hugo server`.
4. Go to http://localhost:1313/

The theme is pulled in as a Hugo module (`github.com/stellarvector/theme`), so Go must be
installed as well. Run `hugo mod get -u github.com/stellarvector/theme` to update it.

## Building

Run `hugo` to generate the static site in the `public/` directory.

## Ownership

| Concern | Source of truth |
|---|---|
| Writeups and authors data | This repository |
| Search logic and lightbox | This repository |
| TOC behavior and reading progress | This repository |
| Chrome, tokens, and base behavior | Shared Hugo module |
