
sv-add-writer() {
    _USERNAME=$(__ask_question "Your username (only [a-zA-Z0-9\\-_]): ")
    _SCREEN_NAME=$(__ask_question "Your name as you want it displayed on the site [username]: ")
    _LINK=$(__ask_question "[optional] A link to one of your profiles: ")
    _IMG=$(__ask_question "[optional] A link to a profile image: ")

    # TODO: Check _USERNAME format

    template=$(cat ./_templates/writer.template)

    new_writer_text=${template//<username>/$_USERNAME}
    if [ -n "$_SCREEN_NAME" ]; then
       new_writer_text=${new_writer_text//<screen_name>/$_SCREEN_NAME}
    else
       new_writer_text=${new_writer_text//<screen_name>/$_USERNAME}
    fi
    new_writer_text=${new_writer_text//<link>/$_LINK}
    new_writer_text=${new_writer_text//<img>/$_IMG}

    echo "$new_writer_text" >> "./_data/writers.yml"
}

sv-add-writeup() {
    BASE_PATH="./_writeups/"
    mkdir -p $BASE_PATH

    echo "Enter the requested info"
    echo ""

    YEAR=$(__ask_question "Year of the CTF: ")
    CTF=$(__ask_question "Name of the CTF: ")
    CHALLENGE=$(__ask_question "Name of the Challenge: ")
    SUBTITLE=$(__ask_question "[optional] Subtitle for the Challenge: ")
    CATEGORY=$(__ask_question "Category of the Challenge (web, crypto, ...): ")
    TAGS=$(__ask_question "[optional] Other tags you want to add (space-separated): ")
    AUTHOR=$(__ask_question "Your username (or name if no username): ")
    DATE=$(__ask_question "Date of writing this writeup (YYYY-MM-DD): ")

    CTF_SLUG=$(__sluggify "$CTF")
    CHALLENGE_SLUG=$(__sluggify "$CHALLENGE")
    CHALLENGE_PATH="$BASE_PATH$YEAR/$CTF_SLUG/$CHALLENGE_SLUG.md"
    ORIGINAL_CHALLENGE=$CHALLENGE
    I=2

    if [[ -f "$CHALLENGE_PATH" ]]; then
        echo ""
        STILL_CONTINUE=$(__ask_question "There already exists a writeup for this challenge! Continue? (y/n) ")
        if ! [[ "$STILL_CONTINUE" =~ ^[Yy]$ ]]; then
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

__ask_question() {
    if [ ! -z "$BASH_VERSION" ]; then
        read -e -p "$1" _RESULT
        echo "$_RESULT"
    elif [ ! -z "$ZSH_VERSION" ]; then
        read "result?$1"
        echo "$result"
    fi
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

    mkdir "$2$1/"
    echo "$year_index" > "$2$1/index.md"
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
