# Stellar Vector Blog

Welcome!

When adding or editing a writeup, please use the instructions below.

## Adding a writeup

When adding a writeup, please use the included `sv-commands.sh` and the function `sv-add-writeup` in it to generate the writeup template.

Usage:

1. `source ./sv-commands.sh`
2. `sv-add-writer` (if you haven't done this yet previously)
3. Enter the information requested in the prompts
4. `sv-add-writeup`
5. Enter the information requested in the prompts
6. Edit ONLY the file the output points you to or the assets directory
7. Submit a PR to the repo
8. We thank you for your contribution!!!

You CAN write a second writeup if there is already one for a specific challenge.

For errors in the script or other parts of the site, submit an issue and possibly a separate pull request.
**Do not fix issues in writeup-submission PRs!**

## Editing a writeup

When editing a writeup, correct the writeup content (or title) **and add or overwrite the `last_edit_date`**!
Also add a small changelog message at the end of the writeup explaining what changed on that date.

## Running locally

It should be as easy as (you might need to use sudo):

1. `bundle install`
2. `bundle exec jekyll serve`
3. go to http://127.0.0.1:4000/
