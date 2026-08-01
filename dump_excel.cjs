const xlsx = require('xlsx');
const workbook = xlsx.readFile('files/DATA/CHR_data.xlsx');
const allData = {};
for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    allData[sheetName] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
}
require('fs').writeFileSync('all_excel.json', JSON.stringify(allData, null, 2));
