(function () {
    window.onload = function () {
        var redirectRows = document.querySelectorAll('.redirect-table__row');
        var redirectEditForm = document.getElementById('redirect-edit-form');

        function setupRow(row) {
            var redirectEditButton = row.querySelector('[data-edit-redirect-id]');
            var redirectProps = JSON.parse(row.dataset.redirectProps);

            redirectEditButton.addEventListener('click', function (e) {
                row.parentNode.insertBefore(redirectEditForm, row.nextSibling);
                redirectEditForm.querySelector('#edit-host').value = redirectProps.host || '';
                redirectEditForm.querySelector('#edit-originalHost').value = redirectProps.host || '';
                redirectEditForm.querySelector('#edit-sourceUriPath').value = redirectProps.sourceUriPath || '';
                redirectEditForm.querySelector('#edit-originalSourceUriPath').value = redirectProps.sourceUriPath || '';
                redirectEditForm.querySelector('#edit-targetUriPath').value = redirectProps.targetUriPath || '';
                redirectEditForm.querySelector('#edit-statusCode').value = redirectProps.statusCode;
                redirectEditForm.querySelector('#edit-comment').value = redirectProps.comment || '';
                redirectEditForm.querySelector('#edit-startDateTime').value = redirectProps.startDateTime || '';
                redirectEditForm.querySelector('#edit-endDateTime').value = redirectProps.endDateTime || '';
                redirectEditForm.classList.add('open');
            });
        }

        for (var i = 0; i < redirectRows.length; i++) {
            setupRow(redirectRows[i]);
        }
    };
})();
