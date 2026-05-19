let elementsObject = [];
var totalElements;
var totalUnlockedElements = 0;

socket.emit('getElements');
socket.on('elementsData', (elementsData) => {
    elementsObject = elementsData;
    totalElements = elementsObject.length;
    console.log('retrieved. Total elements: ' + totalElements);
    socket.emit('getUserElements', user);
});

socket.on('userElementsData', (userElements) => {
    userElements.forEach(element => {
        elementsObject.forEach(e => {
            if (element == e.name) {
                e.locked = false;
                totalUnlockedElements++;
            }
        });
    });

    

    document.getElementById("sidebarHeader").innerHTML = `Elements (${totalUnlockedElements}/${totalElements})`
    elementsObject.forEach(element => {
        let button = document.createElement("button");
        
        if (element.locked == false) {
            button.innerHTML = element.text;
            button.draggable = true;
            button.disabled = false;
            button.ondragstart = dragstartHandler;
            button.onclick = spawn;
            button.className = 'elementButton';
        } else {
            button.innerHTML = "🔒 ";
            for (let char of element.name) {
                if (char == ' ') {
                    button.innerHTML += ' ';
                } else {
                    button.innerHTML += '?';
                }
            }
            button.className = 'elementButton';
            button.draggable = false;
            button.disabled = true;
        }

        //////////////////////////////////////////////////////
        
        // COMMENT ABOVE AND UNCOMMENT BELOW FOR TESTING ↓↓↓

        // button.innerHTML = element.text;
        // button.draggable = true;
        // button.disabled = false;
        // button.ondragstart = dragstartHandler;
        // button.onclick = spawn;
        // button.className = 'elementButton';

        //////////////////////////////////////////////////////
        button.id = (element.name + '-og')
        document.getElementById(`${element.category}`).appendChild(button);
    });
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

    gameSave();

    return unlockedElement;
}

function gameSave() {
    let saveArray = [];
    elementsObject.forEach(e => {
        if (!e.locked) {
            saveArray.push(e.name);
        }
    });

    socket.emit('updateUserElements', { username: user, elements: saveArray });
};