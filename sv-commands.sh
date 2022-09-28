
sv-add-writer() {
    read -e -p "Your username (no spaces, only [a-zA-Z0-9-_]): " USERNAME
    read -e -p "[Optional] Your name as you want it displayed on the site: " SCREEN_NAME
    read -e -p "[Optional] A link to one of your profiles: " LINK

    WRITER="""\
$USERNAME:
  screen_name: $SCREEN_NAME
  link: $LINK"""

    echo "$WRITER" >> "./_data/writers.yml"
}

sv-add-writeup() {
    BASE_PATH="./_writeups/"

    echo "Enter the requested info"
    echo ""

    read -e -p "Year of the CTF: " YEAR
    read -e -p "Name of the CTF: " CTF
    read -e -p "Name of the Challenge: " CHALLENGE
    read -e -p "Category of the Challenge (web, crypto, ...): " CATEGORY
    read -e -p "Other tags you want to add (space-separated): " TAGS

    read -e -p "Your username: " AUTHOR
    read -e -p "Date of writing this writeup (YYYY-MM-DD): " DATE

    CTF_SLUG=$(__sluggify "$CTF")
    CHALLENGE_SLUG=$(__sluggify "$CHALLENGE")
    CHALLENGE_PATH="$BASE_PATH$YEAR/$CTF_SLUG/$CHALLENGE_SLUG.md"
    ORIGINAL_CHALLENGE=$CHALLENGE
    I=2

    if [[ -f $CHALLENGE_PATH ]]; then
        echo ""
        read -e -p "There already exists a writeup for this challenge! Continue? (y/n) " STILL_CONTINUE
        if [ "y" != "$STILL_CONTINUE" ]; then
            echo "Aborted!"
            return
        fi
        echo "Continuing..."
        echo ""
    fi

    while [[ -f $CHALLENGE_PATH ]]; do
        CHALLENGE="$ORIGINAL_CHALLENGE ($I)"
        I=$((I+1))
        CTF_SLUG=$(__sluggify "$CTF")
        CHALLENGE_SLUG=$(__sluggify "$CHALLENGE")
        CHALLENGE_PATH="$BASE_PATH$YEAR/$CTF_SLUG/$CHALLENGE_SLUG.md"
    done

    if [[ ! -d "$BASE_PATH$YEAR" ]]; then
        __sv_create_year $YEAR "$BASE_PATH"
    fi

    if [[ ! -d "$BASE_PATH$YEAR/$(__sluggify $CTF)" ]]; then
        __sv_create_ctf $YEAR "$CTF" "$CTF_SLUG" "$BASE_PATH$YEAR"
    fi

    FRONTMATTER="""\
---
layout: writeup
title: $CHALLENGE
parent: $CTF
grand_parent: $YEAR
author: $AUTHOR
write_date: $DATE
category: $CATEGORY
tags: $CATEGORY $TAGS
last_edit_date:
---

Write your writeup here...
"""

    __sv_create_challenge "$CHALLENGE_PATH" "$FRONTMATTER"
}

__sluggify() { # https://blog.forret.com/2022/04/15/slugify-bash/
    SLUG=$(echo $1 | awk '{gsub(/[^0-9a-zA-Z .-]/,"");gsub(/^[ \t\r\n]+/, "");
                            gsub(/[ \t\r\n]+$/, "");gsub(/[ ]+/,"-");print;}')
    SLUG_LOWER=$(echo "$SLUG" | tr '[:upper:]' '[:lower:]')
    echo $SLUG_LOWER
}

__sv_create_year() { # YEAR PATH
    nb_years_already_present=$(find $2/ -mindepth 1 -maxdepth 1 -type d | wc -l)
    NAV_ORDER=$((999 - $nb_years_already_present))

    YEAR_INDEX_CONTENT="""\
---
layout: default
title: $1
has_children: true
nav_order: $NAV_ORDER
---

# Writeups from $1
"""
    mkdir "$2/$1/"
    echo "$YEAR_INDEX_CONTENT" > "$2/$1/index.md"
}

__sv_create_ctf() { # YEAR CTF SLUG PATH
    nb_ctfs_already_present=$(find $4/ -mindepth 1 -maxdepth 1 -type d | wc -l)
    NAV_ORDER=$((999 - $nb_ctfs_already_present))

    CTF_INDEX_CONTENT="""\
---
layout: default
title: $2
parent: $1
has_children: true
nav_order: $NAV_ORDER
---

# $2 Writeups
"""
    mkdir "$4/$3/"
    echo "$CTF_INDEX_CONTENT" > "$4/$3/index.md"
}

__sv_create_challenge() { # PATH FRONTMATTER
    echo "$2" > $1

    echo ""
    echo "Write your writeup in $1"
}
