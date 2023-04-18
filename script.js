const uploadCsv = document.getElementById('upload-csv');
uploadCsv.addEventListener('change', handleFileUpload);


function handleFileUpload(event) {
    const file = event.target.files[0];
    Papa.parse(file, {
        header: true,
        complete: function (results) {
            populateTables(results.data);
        }
    });

}

function populateTables(data) {
    const columns = [
        ['Email', 'Name', 'Tested', 'Weight 1', 'ID Number'],
        ['Email', 'Name', 'Tested', 'Weight 2', 'ID Number'],
        ['Email', 'Name', 'Tested', 'Weight 3', 'ID Number']
    ];

    const applyTestedTrue = function (tableId) {
        $(tableId)
            .find('tr:not(:first,:last)')
            .each(function () {
                const tested = $(this).find('td:nth-child(3)').text();
                if (tested === 'TRUE') {
                    $(this).addClass('tested-true');
                } else {
                    $(this).removeClass('tested-true');
                }
            });
    };

    for (let i = 1; i <= 3; i++) {
        const table = $(`#table${i}`);
        table.empty();
        table.append('<tr>' + columns[i - 1].map(col => `<th>${col}</th>`).join('') + '</tr>');

        let totalWeight = 0;
        data.forEach(row => {
            const newRow = $('<tr></tr>');
            newRow.append('<td>' + columns[i - 1].map(col => row[col]).join('</td><td>') + '</td>');

            //if (row['Tested'] === 'TRUE') {
            //    newRow.addClass('tested-true');
            //}

            table.append(newRow);
            const weight = parseFloat(row[columns[i - 1][3]]);
            if (!isNaN(weight)) {
                totalWeight += weight;
            }
        });

        table.append(`<tr><td colspan="3">Total</td><td>${totalWeight.toFixed(2)}</td><td></td></tr>`);

        applyTestedTrue(`#table${i}`);

        table.sortable({
            items: '> tr:not(:first,:last)',
            stop: function (event, ui) {
                // Get the table index and threshold input value
                const tabIndex = $(this).parent().index();
                const threshold = parseFloat($(`#threshold-input-${tabIndex}`).val()) || 0;
                console.log(threshold);

                applyTestedTrue(`#table${i}`);

                // Re-apply the threshold after the row gets dragged
                applyThreshold(`#table${tabIndex}`, threshold);


            }
        });
    }

    $("#tabs").show();
}

function applyThreshold(tableId, threshold) {
    const table = $(tableId);
    const rows = table.find('tr:not(:first,:last)');

    let thresholdReached = false;


    // Remove the threshold-exceeded class from all rows
    //.removeClass('threshold-exceeded');

    if (threshold === 0) {
        return; // If the threshold input is empty or 0, exit the function early
    }

    let cumulativeSum = 0;

    rows.each(function () {
        const weight = parseFloat($(this).find('td:nth-child(4)').text());

        cumulativeSum += weight;

        if ($(this).hasClass('threshold-exceeded')) {
            $(this).removeClass('threshold-exceeded');
            if ($(this).find('td:nth-child(3)').text() === 'TRUE') {
                $(this).addClass('tested-true');
            }
        }

        if (!thresholdReached && cumulativeSum > threshold) {
            if ($(this).hasClass('tested-true')) {
                $(this).removeClass('tested-true');
            }
            this.classList.add('threshold-exceeded');
            //$(this).addClass('threshold-exceeded');
            thresholdReached = true;
            //return false;
        } else if (thresholdReached && $(this).hasClass('threshold-exceeded')) {
            $(this).removeClass('threshold-exceeded');
        }
    });
}



function downloadCSV(tableId, fileName) {
    const table = $(tableId);
    const headers = table
        .find('th')
        .map(function () {
            return $(this).text();
        })
        .get()
        .join(',');

    let csvContent = headers + '\n';

    const thresholdExceededIndex = table.find('.threshold-exceeded').index();
    const allRows = table.find('tr:not(:first,:last)');
    const rowsBelowThreshold = allRows.slice(0, thresholdExceededIndex - 1);
    const outlookRows = allRows.filter(function () {
        return $(this).find('td:first').text().includes("Outlook");
    });

    const rowsToDownload = Array.from(new Set([...rowsBelowThreshold, ...outlookRows]));

    rowsToDownload.forEach((row) => {
        const rowArray = $(row)
            .find('td')
            .map(function () {
                return $(this).text();
            })
            .get();
        const rowString = rowArray.join(',');
        csvContent += rowString + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, fileName);
    } else {
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}




$(document).ready(function () {
    $("#tabs").tabs().hide();


    $(".download-btn").on("click", function () {
        const index = $(this).data("table-index");
        downloadCSV(`#table${index}`, `Weight_${index}_CSV.csv`);
    });

    // Add threshold input event listeners
    for (let i = 1; i <= 3; i++) {
        $(`#tab${i}`).prepend(`<label for="threshold-input-${i}">Threshold:</label> <input type="number" id="threshold-input-${i}" class="threshold-input" data-table-index="${i}" min="0">`);
    }

    // Use event delegation to attach event listeners
    $("#tabs").on('input', '.threshold-input', function () {
        const threshold = parseFloat($(this).val()) || 0;
        const tabIndex = $(this).data('table-index');
        applyThreshold(`#table${tabIndex}`, threshold);
    });



});
