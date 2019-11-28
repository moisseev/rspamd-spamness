function resizeTextbox() {
    let box = document.getElementById("rulesDlgTextbox");
    box.value = window.arguments[0];

    setTimeout(() => {
        box.style.cssText = 'background-color:transparent; overflow:hidden; height:' + box.scrollHeight + 'px';
console.log(box.scrollHeight);
console.log(box.style.cssText);

        // Center the dialog window
        const w = screen.availWidth/2 - this.width/2;
        const h = screen.availHeight/2 - this.height/2;
        window.moveTo(w,h);
    }, 0);
}
