function resizeTextbox() {
    let box = document.getElementById("rulesDlgTextbox");
    box.value = window.arguments[0];
    box.style.cssText = 'background-color:transparent; overflow:hidden; height:' + box.scrollHeight + 'px';

    // Center the dialog window
    this.centerWindowOnScreen();
}
