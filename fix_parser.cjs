
const fs = require('fs');
let code = fs.readFileSync('tools/parse_excel.cjs', 'utf8');
const replacements = [
    ['10紫?E', '10紫苑'],
    ['12蒼樹', '12蒼樹'],
    ['9?E', '9紅華'],
    ['4?E', '4黄蘭'],
    ['15李?Edata', '15李乃果data'],
    ['基本生命?E', '基本生命力'],
    ['基本精神力', '基本精神力'],
    ['基本攻?E', '基本攻撃力'],
    ['リローチE', 'リロード'],
    ['封EE', '射程(m)'],
    ['武器の封EE', '武器の射程'],
    ['貫送E', '貫通'],
    ['貫通しなぁE', '貫通しない'],
    ['キチE', 'キック'],
    ['ナイチE', 'ナイフ'],
    ['振めE', '振り']
];
for(const [oldStr, newStr] of replacements) {
    code = code.split(oldStr).join(newStr);
}
// Special case because the string literal ends might have got garbled
code = code.replace(/射程\(m\)'\)/g, '射程(m)(この距離に敵が来ると攻撃する)\')');
code = code.replace(/武器の射程'\)/g, '武器の射程\')');

fs.writeFileSync('tools/parse_excel_fixed.cjs', code, 'utf8');
console.log('Fixed parser saved.');

