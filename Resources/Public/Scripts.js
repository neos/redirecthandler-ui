function showItemUpdate(itemIdentifier) {
    var otherUpdateElements = document.getElementsByClassName('row-update');
    while(otherUpdateElements.length > 0){
        otherUpdateElements[0].parentNode.removeChild(otherUpdateElements[0]);
    }
    var otherViewElements = document.getElementsByClassName('row-view--hidden');
    while(otherViewElements.length > 0){
        otherViewElements[0].classList.remove('row-view--hidden');
    }

    var base = document.getElementById('redirect-' + itemIdentifier + '-view');

    var tr = document.createElement('tr');
    tr.setAttribute('id', 'redirect-' + itemIdentifier + '-form');
    tr.setAttribute('class', 'row-update');

    var tdHost = document.createElement('td');
    var inputHost = document.createElement('input');
    inputHost.setAttribute('name', 'moduleArguments[updateData][host]');
    inputHost.setAttribute('type', 'text');
    inputHost.setAttribute('placeholder', 'Host');
    inputHost.setAttribute('value', base.children[0].attributes.title.value);
    tdHost.appendChild(inputHost);
    tr.appendChild(tdHost);

    var tdSource = document.createElement('td');
    var inputSource = document.createElement('input');
    inputSource.setAttribute('name', 'moduleArguments[updateData][source]');
    inputSource.setAttribute('type', 'text');
    inputSource.setAttribute('placeholder', 'Source Uri Path');
    inputSource.setAttribute('value', base.children[1].attributes.title.value);
    tdSource.appendChild(inputSource);
    tr.appendChild(tdSource);

    var tdTarget = document.createElement('td');
    var inputTarget= document.createElement('input');
    inputTarget.setAttribute('name', 'moduleArguments[updateData][target]');
    inputTarget.setAttribute('type', 'text');
    inputTarget.setAttribute('placeholder', 'Target Uri Path');
    inputTarget.setAttribute('value', base.children[2].attributes.title.value);
    tdTarget.appendChild(inputTarget);
    tr.appendChild(tdTarget);

    var tdCode = document.createElement('td');
    tdCode.setAttribute('class', 'statuscode-column');
    var inputCode= document.createElement('input');
    inputCode.setAttribute('name', 'moduleArguments[updateData][code]');
    inputCode.setAttribute('type', 'number');
    inputCode.setAttribute('placeholder', 'Status Code');
    inputCode.setAttribute('value', base.children[3].innerHTML);
    inputCode.setAttribute('min', '100');
    inputCode.setAttribute('max', '599');
    tdCode.appendChild(inputCode);
    tr.appendChild(tdCode);

    var tdAction = document.createElement('td');
    tdAction.setAttribute('class', 'neos-action');
    var containerAction = document.createElement('div');
    containerAction.setAttribute('class', 'neos-pull-right');
    var saveButton = document.createElement('button');
    saveButton.setAttribute('type', 'submit');
    saveButton.setAttribute('name', 'moduleArguments[updateAction]');
    saveButton.setAttribute('value', base.getAttribute('data-redirect-id'));
    saveButton.setAttribute('class', 'neos-button-success update-redirect-submit');
    saveButton.innerHTML = '<i class="icon-save icon-white"></i>';
    containerAction.appendChild(saveButton);

    containerAction.appendChild(document.createTextNode (" "));

    var cancelButton = document.createElement('button');
    cancelButton.setAttribute('type', 'button');
    cancelButton.setAttribute('class', 'neos-button');
    cancelButton.onclick = function () {
        base.classList.remove('row-view--hidden');
        base.parentNode.removeChild(tr);
    };
    cancelButton.innerHTML = '<i class="icon-reply icon-white"></i>';
    containerAction.appendChild(cancelButton);
    tdAction.appendChild(containerAction);
    tr.appendChild(tdAction);

    base.parentNode.insertBefore(tr, base);
    base.classList.add('row-view--hidden');
}
