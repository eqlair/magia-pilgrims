const XLSX = require('xlsx');
const workbook = XLSX.readFile('files/DATA/CHR_data.xlsx');

console.log("Sheets:", workbook.SheetNames);
for (const name of workbook.SheetNames) {
    if (name.includes('001') || name.includes('紅華')) {
        console.log("Reading sheet:", name);
        const worksheet = workbook.Sheets[name];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log(JSON.stringify(jsonData, null, 2));
    }
}
