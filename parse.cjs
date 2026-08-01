const xlsx = require('xlsx');
const workbook = xlsx.readFile('files/DATA/CHR_data.xlsx');
const sheet = workbook.Sheets['9紅華'];
if (sheet) {
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(JSON.stringify(data.slice(0, 50), null, 2));
}
