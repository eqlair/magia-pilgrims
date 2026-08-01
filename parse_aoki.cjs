const xlsx = require('xlsx');
const workbook = xlsx.readFile('files/DATA/CHR_data.xlsx');
const sheet = workbook.Sheets['12蒼樹'];
if (sheet) {
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    let inPattern = false;
    for (const row of data) {
        if (row[0] === 'レベル' && row[1] === '種別') {
            inPattern = true;
            console.log(JSON.stringify(row));
            continue;
        }
        if (inPattern) {
            if (row[0] === '特技　戦闘中に不随意に発動するキャラクターの特技') {
                inPattern = false;
                continue;
            }
            if (row.length > 0 && row[0] !== null) {
                console.log(JSON.stringify(row));
            }
        }
    }
}
