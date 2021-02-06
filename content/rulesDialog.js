/* global browser, messenger */

"use strict";

async function resizeWindow(scrollbarWidth) {
    const windowMargin = 0;
    const {body} = document;

    document.documentElement.style.overflow = "unset";
    body.style.overflow = "hidden";

    const bodyMarginBottom = parseInt(window.getComputedStyle(document.body)["margin-bottom"], 10);
    const bodyMarginTop = parseInt(window.getComputedStyle(document.body)["margin-top"], 10);
    const bodyMarginLeft = parseInt(window.getComputedStyle(document.body)["margin-left"], 10);
    const bodyMarginRight = parseInt(window.getComputedStyle(document.body)["margin-right"], 10);

    const maxClientWidth = screen.availWidth - window.outerWidth + body.clientWidth - windowMargin + scrollbarWidth;
    const maxClientHeight = screen.availHeight - windowMargin;


    let width = window.outerWidth - body.clientWidth + body.scrollWidth + bodyMarginLeft + bodyMarginRight;
    body.style["white-space"] = "pre-wrap";
    if (width > maxClientWidth) width = maxClientWidth;
    // Wait for page to be re-rendered after setting 'white-space: "pre-wrap"'.
    await messenger.windows.update(messenger.windows.WINDOW_ID_CURRENT, {
        width: width
    });

    let height = window.outerHeight - body.clientHeight + body.scrollHeight + bodyMarginTop + bodyMarginBottom;
    if (body.scrollHeight > maxClientHeight) {
        width += scrollbarWidth;
        height = maxClientHeight;
        body.style["overflow-y"] = "auto";
    }
    messenger.windows.update(messenger.windows.WINDOW_ID_CURRENT, {
        height: height,
        left: Math.floor((screen.availWidth - width) / 2),
        top: Math.floor((screen.availHeight - height) / 2),
        width: width
    });
}

browser.runtime.sendMessage({method: "getRulesDialogContent"}).then(function (message) {
    const {body} = document;
    const scrollbarWidth = body.offsetWidth - body.clientWidth;
    body.innerText = message.response;
    resizeWindow(scrollbarWidth);
});
