const data = require('./all_excel.json');
for (const sheet in data) {
    const rows = data[sheet];
    for (const row of rows) {
        if (row && row.some(cell => typeof cell === 'string' && cell.includes('減衰'))) {
            console.log(sheet, row);
        }
        if (row && row.some(cell => typeof cell === 'string' && cell.includes('レベル'))) {
            if (row.includes('種別')) {
                console.log("Header:", row);
            }
        }
    }
}
