const data = require('./all_excel.json');
for (const sheet in data) {
    const rows = data[sheet];
    for (const row of rows) {
        if (row && row.some) {
            for (const cell of row) {
                if (typeof cell === 'string' && cell.includes('貫通')) {
                    console.log(`Found in ${sheet}: ${cell}`);
                }
            }
        }
    }
}
