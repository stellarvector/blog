import re
import os
from datetime import datetime


def add_writer():
    print("\n==== Let's create your profile! Follow the prompts and enter the requested info ====\n")

    while True:
        username = input("Your username (only [a-zA-Z0-9\\-_]): ")

        if not re.match(r"^[a-zA-Z0-9\-_]+$", username):
            print("Invalid username format. Only [a-zA-Z0-9\\-_] are allowed.")
            continue
        break

    screen_name = input("Your name as you want it displayed on the site [username]: ")
    screen_name = screen_name if screen_name else username

    link = input("[optional] A link to one of your profiles: ")
    img = input("[optional] A link to a profile image: ")

    template = open(os.path.join(os.path.curdir, "_templates", "writer.template"), "r").read()

    new_writer_text = template.replace("<username>", username) \
                            .replace("<screen_name>", screen_name) \
                            .replace("<link>", link) \
                            .replace("<img>", img)

    with open(os.path.join(os.path.curdir, "_data", "writers.yml"), "a+") as writers_file:
        writers_file.write(new_writer_text + "\n")

    print(f"Successfully added you ({username}) as a writer!\n")

def add_writeup():
    print("\n==== Let's create a writeup! Follow the prompts and enter the requested info ====\n")
    base_path = os.path.join(os.path.curdir, "_writeups")

    year = input("Year of the CTF [current]: ")
    year = year if year else str(datetime.now().year)
    ctf = input("Name of the CTF: ")

    ctf_slug = _sluggify(ctf)

    _create_year(base_path, year)
    _create_ctf(base_path, year, ctf, ctf_slug)
    challenge_slug = _create_challenge(base_path, year, ctf, ctf_slug)

    print(f"\nSuccessfully added a writeup, find and it in {os.path.join(base_path, year, ctf_slug, f"{challenge_slug}.md")}!\n")


def _sluggify(original_string):
    slug = re.sub(r'[^0-9a-zA-Z\-]', '-', original_string)
    slug = re.sub(r'[\-]+', '-', slug)

    return slug.strip("-").lower()

def _create_year(base_path, year):
    year_path = os.path.join(base_path, year)

    if os.path.exists(year_path):
        return

    nav_order = 10000 - int(year)
    template=open(os.path.join(os.path.curdir, "_templates", "year.template"), "r").read()
    new_year_index = template.replace("<year>", year) \
                            .replace("<nav_order>", str(nav_order))

    os.makedirs(year_path, exist_ok=True)
    with open(os.path.join(year_path, "index.md"), "w+") as index_file:
        index_file.write(new_year_index + "\n")

def _create_ctf(base_path, year, ctf, ctf_slug):
    ctf_path = os.path.join(base_path, year, ctf_slug)

    if os.path.exists(ctf_path):
        return

    nav_order = 999 - len(os.listdir(os.path.join(base_path, year)))
    template=open(os.path.join(os.path.curdir, "_templates", "ctf.template"), "r").read()

    new_ctf_index = template.replace("<ctf>", ctf) \
                            .replace("<year>", year) \
                            .replace("<nav_order>", str(nav_order))

    os.makedirs(ctf_path, exist_ok=True)
    with open(os.path.join(ctf_path, "index.md"), "w+") as index_file:
        index_file.write(new_ctf_index + "\n")

def _create_challenge(base_path, year, ctf, ctf_slug):
    challenge = input("Name of the Challenge: ")
    challenge_slug = _sluggify(challenge)
    subtitle = input("[optional] Subtitle for the Challenge: ")
    category = input("Category of the Challenge (web, crypto, ...): ")
    tags = input("[optional] Other tags you want to add (space-separated): ")
    author = input("Your username (or name if no username): ")
    date = input("Date of writing this writeup (YYYY-MM-DD): ")

    challenge_path = os.path.join(base_path, year, ctf_slug, f"{challenge_slug}.md")

    i = 1
    while os.path.exists(challenge_path):
        challenge_slug = _sluggify(f"{challenge}-{i}")
        challenge_path = os.path.join(base_path, year, ctf_slug, f"{challenge_slug}.md")
        i += 1

    template = open(os.path.join(os.path.curdir, "_templates", "writeup.template"), "r").read()
    writeup = template.replace("<challenge>", challenge) \
                      .replace("<ctf>", ctf) \
                      .replace("<year>", year) \
                      .replace("<author_username>", author) \
                      .replace("<date>", date) \
                      .replace("<category>", category) \
                      .replace("<tags>", tags) \
                      .replace("<subtitle>", subtitle)

    with open(challenge_path, "w+") as challenge_file:
        challenge_file.write(writeup + "\n")

    return challenge_slug

if __name__ == "__main__":
    print(f"""
   _____ __       ____              _    __          __
  / ___// /____  / / /___ ______   | |  / /__  _____/ /_____  _____
  \\__ \\/ __/ _ \\/ / / __ `/ ___/   | | / / _ \\/ ___/ __/ __ \\/ ___/
 ___/ / /_/  __/ / / /_/ / /       | |/ /  __/ /__/ /_/ /_/ / /
/____/\\__/\\___/_/_/\\__,_/_/        |___/\\___/\\___/\\__/\\____/_/
                / __ )/ /___  ____ _   /_  __/___  ____  / /____
               / __  / / __ \\/ __ `/    / / / __ \\/ __ \\/ / ___/
              / /_/ / / /_/ / /_/ /    / / / /_/ / /_/ / (__  )
             /_____/_/\\____/\\__, /    /_/  \\____/\\____/_/____/
                           /____/
    """)
    print("Welcome to the Stellar Vector blog tools!")
    while True:
        print("Choose an option:")
        print("  1. Add a writer")
        print("  2. Add a writeup")
        print("  3. Exit")
        choice = input("Enter your choice (1-3): ")

        if choice == "1":
            add_writer()
        elif choice == "2":
            add_writeup()
        elif choice == "3":
            print("Exiting...")
            break
        else:
            print("Invalid choice. Please try again.\n")