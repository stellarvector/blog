
sv-add-writer() {
    read -e -p "Your username (only [a-zA-Z0-9\\-_]): " USERNAME
    read -e -p "Your name as you want it displayed on the site [username]: " SCREEN_NAME
    read -e -p "[optional] A link to one of your profiles: " LINK
    read -e -p "[optional] A link to a profile image: " IMG

    # TODO: Check USERNAME format

    template=$(cat ./_templates/writer.template)

    new_writer_text=${template//<username>/$USERNAME}
    if [ -n "$SCREEN_NAME" ]; then
       new_writer_text=${new_writer_text//<screen_name>/$SCREEN_NAME}
    else
       new_writer_text=${new_writer_text//<screen_name>/$USERNAME}
    fi
    new_writer_text=${new_writer_text//<link>/$LINK}
    new_writer_text=${new_writer_text//<img>/$IMG}

    echo "$new_writer_text" >> "./_data/writers.yml"
}

sv-add-writeup() {
    BASE_PATH="./_writeups/"

    echo "Enter the requested info"
    echo ""

    read -e -p "Year of the CTF: " YEAR
    read -e -p "Name of the CTF: " CTF
    read -e -p "Name of the Challenge: " CHALLENGE
    read -e -p "[optional] Subtitle for the Challenge: " SUBTITLE
    read -e -p "Category of the Challenge (web, crypto, ...): " CATEGORY
    read -e -p "[optional] Other tags you want to add (space-separated): " TAGS

    read -e -p "Your username (or name if no username): " AUTHOR
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

    writeup_template=$(cat ./_templates/writeup.template)

    writeup=${writeup_template//<challenge>/$CHALLENGE}
    writeup=${writeup//<ctf>/$CTF}
    writeup=${writeup//<year>/$YEAR}
    writeup=${writeup//<author_username>/$AUTHOR}
    writeup=${writeup//<date>/$DATE}
    writeup=${writeup//<category>/$CATEGORY}
    writeup=${writeup//<tags>/$TAGS}
    writeup=${writeup//<subtitle>/$SUBTITLE}

    echo "$writeup" > $CHALLENGE_PATH

    echo ""
    echo "Write your writeup in $CHALLENGE_PATH"
}

__sluggify() { # https://blog.forret.com/2022/04/15/slugify-bash/
    SLUG=$(echo $1 | awk '{gsub(/[^0-9a-zA-Z .-]/,"");gsub(/^[ \t\r\n]+/, "");
                            gsub(/[ \t\r\n]+$/, "");gsub(/[ ]+/,"-");print;}')
    SLUG_LOWER=$(echo "$SLUG" | tr '[:upper:]' '[:lower:]')
    echo $SLUG_LOWER
}

__sv_create_year() { # YEAR PATH
    nb_years_already_present=$(find $2/ -mindepth 1 -maxdepth 1 -type d | wc -l)
    nav_order=$((999 - $nb_years_already_present))

    year_template=$(cat ./_templates/year.template)

    year_index=${year_template//<year>/$1}
    year_index=${year_index//<nav_order>/$nav_order}

    mkdir "$2/$1/"
    echo "$year_index" > "$2/$1/index.md"
}

__sv_create_ctf() { # YEAR CTF SLUG PATH
    nb_ctfs_already_present=$(find $4/ -mindepth 1 -maxdepth 1 -type d | wc -l)
    nav_order=$((999 - $nb_ctfs_already_present))

    ctf_template=$(cat ./_templates/ctf.template)

    ctf_index=${ctf_template//<ctf>/$2}
    ctf_index=${ctf_index//<year>/$1}
    ctf_index=${ctf_index//<nav_order>/$nav_order}

    mkdir "$4/$3/"
    echo "$ctf_index" > "$4/$3/index.md"
}
