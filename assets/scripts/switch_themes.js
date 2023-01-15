function setThemeSwitchBtnIcon(icon) {
    document.getElementById("themeSwitchBtn").firstChild.innerText = icon;
}

function activateLightMode() {
    jtd.setTheme("light");
    setThemeSwitchBtnIcon("light_mode");
}

function activateDarkMode() {
    jtd.setTheme("dark");
    setThemeSwitchBtnIcon("dark_mode");
}

function switchTheme() {
    if (jtd.getTheme() === "light") {
        activateDarkMode();
    } else {
        activateLightMode();
    }
}
