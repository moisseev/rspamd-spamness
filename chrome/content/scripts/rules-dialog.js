/* exported resizeTextbox */

"use strict";

function resizeTextbox() {
    const windowMargin = 10;

    const box = document.getElementById("rulesDlgTextbox");
    box.style["overflow-x"] = "hidden";
    // Initial height should be big enough to display vertical scroll bar.
    box.style.height = "50px";
    [box.value] = window.arguments;

    const maxClientWidth = screen.availWidth - window.outerWidth + box.clientWidth - windowMargin;
    const maxClientHeight = screen.availHeight - window.outerHeight + box.clientHeight - windowMargin;
    const scrollbarWidth = box.offsetWidth - box.clientWidth;

    let width = null;
    if (box.scrollWidth < maxClientWidth) {
        width = box.scrollWidth;
    } else {
        width = maxClientWidth;
        box.wrap = "soft";
    }
    box.style.width = width + "px";

    if (box.scrollHeight < maxClientHeight) {
        // Wait for textarea to be re-rendered after setting 'wrap = "soft"'.
        setTimeout(() => {
            box.style.height = box.scrollHeight + "px";
            setTimeout(() => {
                window.centerWindowOnScreen();
            });
        });
    } else {
        box.style.height = maxClientHeight + "px";
        box.style.width = width + scrollbarWidth + "px";
        // Scroll to the top.
        box.setSelectionRange(0, 0);
    }
}
