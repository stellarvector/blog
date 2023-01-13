let light = true;

function setThemeSwitchBtnIcon(icon) {
    document.getElementById("themeSwitchBtn").firstChild.innerText = icon;
}

function activateLightMode() {
    jtd.setTheme("light");
    light = true;
    setThemeSwitchBtnIcon("dark_mode");
}

function activateDarkMode() {
    jtd.setTheme("dark");
    light = false;
    setThemeSwitchBtnIcon("light_mode");
}

function switchTheme() {
    if (light) {
        activateDarkMode();
    } else {
        activateLightMode();
    }
}

let darkModePreference = window.matchMedia("(prefers-color-scheme: dark)");
if (darkModePreference && darkModePreference.matches) {
    activateDarkMode()
}
