let elementsObject = [];

socket.emit('getElements');
socket.on('elementsData', (elementsData) => {
    elementsObject = elementsData;
    console.log('retrieved')
});

function merge(element1, element2) {
    let el1text = element1.split('-')[0];
    let el2text = element2.split('-')[0];
    let unlockedElement;

    elementsObject.forEach(e => {
        if (el1text == e.recipe[0] && el2text == e.recipe[1] || el2text == e.recipe[0] && el1text == e.recipe[1]) {
            unlockedElement = e;
        }
    });

    if (unlockedElement.locked) {
        unlockedElement.locked = false;
        unlockedButton = document.getElementById(`${unlockedElement.name}-og`);
        unlockedButton.innerHTML = unlockedElement.text;
        unlockedButton.disabled = false;
        unlockedButton.draggable = true;
        unlockedButton.ondragstart = dragstartHandler;
        unlockedButton.onclick = spawn;

        totalUnlockedElements++;
        document.getElementById("sidebarHeader").innerHTML = `Elements (${totalUnlockedElements}/${totalElements})`;
    }

    return unlockedElement;
}