const col=3;
const row=6;
const colLetter = String.fromCharCode(97 + col);
const rowNum = row + 1;
const regexSpecific = new RegExp(`^m\\(${colLetter},${rowNum}\\)(r)?\\.(jpg|png)$`, 'i');
console.log(regexSpecific);
console.log(regexSpecific.test('m(d,7).jpg'));
