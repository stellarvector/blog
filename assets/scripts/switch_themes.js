function setThemeSwitchBtnIcon(icon) {
    document.getElementById("themeSwitchBtn").firstChild.innerText = icon;
}

function activateTheme(theme) {
    if (theme == jtd.getTheme()) {
        return;
    }

    jtd.setTheme(theme);
    setThemeSwitchBtnIcon(`${theme}_mode`);

    if (localStorage) {
        localStorage.setItem("preferred-theme", theme);
    }
}

function switchTheme() {
    let new_theme = jtd.getTheme() === "light" ? "dark" : "light";

    activateTheme(new_theme);
}


if (localStorage) {
    let theme = localStorage.getItem("preferred-theme");
    if (theme) {
        activateTheme(theme);
    } else {
        let darkModePreference = window.matchMedia("(prefers-color-scheme: dark)");
        if (darkModePreference && darkModePreference.matches) {
            activateTheme("dark");
        }
    }
}
